import { Request, Response } from "express";
import { User } from "../../models/User.ts"; // 1. Added .js for Node16 module resolution
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendInviteEmail } from "../../utils/email.ts";

// 1. Define the Strict Zod Schema (Optimized with trim/toLowerCase)
const userSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  email: z.string().email("Invalid email format").toLowerCase().trim(),
  role: z.enum(["student", "teacher", "admin"], {
    message: "Role must be 'student', 'teacher', or 'admin'"
  })
});

const bulkUserSchema = z.array(userSchema);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const INVITE_EXPIRY_HOURS = 48;

const createInviteToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);
  return { rawToken, tokenHash, expiresAt };
};

export const bulkAddUsers = async (req: Request, res: Response): Promise<void> => {
  console.log("NEW INVITE FLOW HIT");
  try {
    const { users } = req.body;

    // 2. Validate the incoming array against the Zod schema
    const validationResult = bulkUserSchema.safeParse(users);

    if (!validationResult.success) {
      res.status(400).json({
        message: "Validation failed. Please check your CSV data.",
        // 3. Fixed ZodError property access using .flatten()
        errors: validationResult.error.flatten().fieldErrors
      });
      return;
    }

    const validUsers = validationResult.data;
    const emails = validUsers.map((user) => user.email);
    const existingUsers = await User.find({ email: { $in: emails } });
    const existingByEmail = new Map(existingUsers.map((user) => [user.email, user]));

    const created: string[] = [];
    const reinvited: string[] = [];
    const skipped: string[] = [];
    const inviteFailed: string[] = [];

    for (const userData of validUsers) {
      const existingUser = existingByEmail.get(userData.email);
      const { rawToken, tokenHash, expiresAt } = createInviteToken();
      const inviteLink = `${FRONTEND_URL}/reset-password?token=${rawToken}&mode=invite`;

      if (existingUser) {
        if (!existingUser.mustSetPassword) {
          skipped.push(userData.email);
          continue;
        }

        existingUser.name = userData.name;
        existingUser.role = userData.role;
        existingUser.inviteTokenHash = tokenHash;
        existingUser.inviteExpiresAt = expiresAt;
        existingUser.inviteUsedAt = undefined;
        await existingUser.save();

        try {
          await sendInviteEmail(
            existingUser.email,
            existingUser.name,
            inviteLink,
            INVITE_EXPIRY_HOURS
          );
          reinvited.push(existingUser.email);
        } catch (mailError) {
          console.error(`Failed to send invite to ${existingUser.email}:`, mailError);
          inviteFailed.push(existingUser.email);
        }

        continue;
      }

      const randomPassword = crypto.randomBytes(24).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      const createdUser = await User.create({
        ...userData,
        password: hashedPassword,
        mustSetPassword: true,
        inviteTokenHash: tokenHash,
        inviteExpiresAt: expiresAt,
      });

      existingByEmail.set(createdUser.email, createdUser);

      try {
        await sendInviteEmail(
          createdUser.email,
          createdUser.name,
          inviteLink,
          INVITE_EXPIRY_HOURS
        );
        created.push(createdUser.email);
      } catch (mailError) {
        console.error(`Failed to send invite to ${createdUser.email}:`, mailError);
        inviteFailed.push(createdUser.email);
      }
    }

    const messageParts = [
      created.length ? `created ${created.length}` : "",
      reinvited.length ? `re-invited ${reinvited.length}` : "",
      skipped.length ? `skipped ${skipped.length}` : "",
      inviteFailed.length ? `email failed for ${inviteFailed.length}` : "",
    ].filter(Boolean);

    res.status(skipped.length || reinvited.length || inviteFailed.length ? 207 : 201).json({
      message: `Bulk invite completed: ${messageParts.join(", ")}.`,
      created,
      reinvited,
      skipped,
      inviteFailed,
      count: created.length,
    });
  } catch (error: any) {
    console.error("Bulk import error:", error);
    res.status(500).json({ message: "Failed to import users.", error: error.message });
  }
};
