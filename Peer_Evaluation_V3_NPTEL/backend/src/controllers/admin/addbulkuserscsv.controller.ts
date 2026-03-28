import { Request, Response } from "express";
import { User } from "../../models/User.ts"; // 1. Added .js for Node16 module resolution
import { z } from "zod";
import bcrypt from "bcryptjs";

// 1. Define the Strict Zod Schema (Optimized with trim/toLowerCase)
const userSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  email: z.string().email("Invalid email format").toLowerCase().trim(),
  role: z.enum(["student", "teacher", "admin"], {
    message: "Role must be 'student', 'teacher', or 'admin'"
  })
});

const bulkUserSchema = z.array(userSchema);

export const bulkAddUsers = async (req: Request, res: Response): Promise<void> => {
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

    // 3. Hash passwords uniquely for EACH user
    const usersToInsert = await Promise.all(validUsers.map(async (user) => {
      const salt = await bcrypt.genSalt(10);
      const uniqueHashedPassword = await bcrypt.hash("Welcome123!", salt);

      return {
        ...user,
        password: uniqueHashedPassword
      };
    }));

    // 4. Insert into DB (ordered: false skips duplicates but continues inserting)
    const result = await User.insertMany(usersToInsert, { ordered: false });

    res.status(201).json({
      message: `Successfully imported ${result.length} users.`,
      count: result.length
    });

  } catch (error: any) {
    // 5. Precise Duplicate Handling
    if (error.code === 11000 || error.name === 'BulkWriteError') {
      // Extract the exact emails that caused the duplicate constraint to fail
      const skippedEmails = error.writeErrors?.map((err: any) => err.err.op.email) || [];

      res.status(207).json({
        message: `Import finished. Skipped ${skippedEmails.length} duplicate emails.`,
        skipped: skippedEmails
      });
    } else {
      console.error("Bulk import error:", error);
      res.status(500).json({ message: "Failed to import users.", error: error.message });
    }
  }
};