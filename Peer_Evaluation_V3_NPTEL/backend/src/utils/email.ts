import nodemailer from 'nodemailer';

const MAIL_USER =
  process.env.MAIL_SENDER ||
  process.env.EMAIL_USER ||
  'noreplypeerevaluationsystem@gmail.com';
const MAIL_PASS =
  process.env.MAIL_PASSWORD || process.env.EMAIL_PASS || 'twmnfoksvgwfcegh';
const DEFAULT_FROM =
  process.env.MAIL_FROM || `"Peer Evaluation System" <${MAIL_USER}>`;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASS,
  },
});

function formatMailError(error: unknown) {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    return {
      message: err.message,
      code: err.code,
      command: err.command,
      response: err.response,
      responseCode: err.responseCode,
    };
  }

  return { message: String(error) };
}

async function sendMailWithLogging(
  context: string,
  options: nodemailer.SendMailOptions
) {
  try {
    return await transporter.sendMail(options);
  } catch (error) {
    console.error(`[mail] ${context} failed`, {
      to: options.to,
      subject: options.subject,
      from: options.from,
      usingFallbackSender:
        !process.env.MAIL_SENDER && !process.env.EMAIL_USER,
      usingFallbackPassword:
        !process.env.MAIL_PASSWORD && !process.env.EMAIL_PASS,
      transportUser: MAIL_USER,
      error: formatMailError(error),
    });
    throw error;
  }
}

export const sendHtmlEmail = async (
  to: string,
  subject: string,
  html: string
) => {
  await sendMailWithLogging('sendHtmlEmail', {
    from: DEFAULT_FROM,
    to,
    subject,
    html,
  });
};

export const sendReminderEmail = async (
  to: string,
  subject: string,
  text: string
) => {
  const mailOptions = {
    from: DEFAULT_FROM,
    to,
    subject,
    text,
  };
  await sendMailWithLogging('sendReminderEmail', mailOptions);
};

export const sendInviteEmail = async (
  to: string,
  name: string,
  inviteLink: string,
  expiryHours: number
) => {
  await sendHtmlEmail(
    to,
    'Complete Your Peer Evaluation System Account Setup',
    `
      <p>Hi ${name},</p>
      <p>Your account has been created on the Peer Evaluation System.</p>
      <p>Use the secure link below to set your password and activate your account:</p>
      <p><a href="${inviteLink}" target="_blank" rel="noopener noreferrer">Set your password</a></p>
      <p>This link expires in ${expiryHours} hours and can only be used once.</p>
      <p>If the link expires, you can use the forgot password flow to request a fresh setup link.</p>
      <br />
      <p>Regards,<br />Peer Evaluation Team</p>
    `
  );
};

//  Updated function to include marksUpdated
export const sendTicketResolvedEmail = async (
  to: string,
  studentName: string,
  ticketSubject: string,
  description: string,
  remark: string,
  ticketId: string,
  marksUpdated?: number | null
) => {
  const mailOptions = {
    from: DEFAULT_FROM,
    to,
    subject: `Resolved Ticket: ${ticketSubject}`,
    html: `
      <p>Dear ${studentName},</p>
      <p>Your escalated ticket has been resolved by the teacher.</p>
      <ul>
        <li><strong>Ticket ID:</strong> ${ticketId}</li>
        <li><strong>Subject:</strong> ${ticketSubject}</li>
        <li><strong>Description:</strong> ${description}</li>
        <li><strong>Teacher Remark:</strong> ${remark}</li>
        ${
          marksUpdated !== null && marksUpdated !== undefined
            ? `<li><strong>Updated Marks:</strong> ${marksUpdated}</li>`
            : ''
        }
      </ul>
      <p>Status: ✅ Resolved</p>
      <p>Thank you for using the Peer Evaluation System.</p>
      <br/>
      <p>Regards,<br/>Peer Evaluation Team</p>
    `,
  };

  await sendMailWithLogging('sendTicketResolvedEmail', mailOptions);
};
