const RESEND_API_URL = 'https://api.resend.com/emails';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const DEFAULT_FROM =
  process.env.MAIL_FROM || 'Peer Evaluation System <onboarding@resend.dev>';

type SendEmailPayload = {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
};

function formatMailError(error: unknown) {
  if (error instanceof Error) {
    const err = error as Error & {
      code?: string;
      status?: number;
      details?: unknown;
    };

    return {
      message: err.message,
      code: err.code,
      status: err.status,
      details: err.details,
    };
  }

  return { message: String(error) };
}

async function sendMailWithLogging(
  context: string,
  payload: SendEmailPayload
) {
  if (!RESEND_API_KEY) {
    const error = new Error('RESEND_API_KEY is not configured');
    (error as Error & { code?: string }).code = 'MAIL_CONFIG_MISSING';
    throw error;
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      const error = new Error(`Resend API request failed with ${response.status}`);
      const resendError = error as Error & {
        code?: string;
        status?: number;
        details?: string;
      };

      resendError.code = 'RESEND_API_ERROR';
      resendError.status = response.status;
      resendError.details = body;
      throw resendError;
    }

    return await response.json();
  } catch (error) {
    console.error(`[mail] ${context} failed`, {
      to: payload.to,
      subject: payload.subject,
      from: payload.from,
      provider: 'resend',
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
    to: [to],
    subject,
    html,
  });
};

export const sendReminderEmail = async (
  to: string,
  subject: string,
  text: string
) => {
  await sendMailWithLogging('sendReminderEmail', {
    from: DEFAULT_FROM,
    to: [to],
    subject,
    text,
  });
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

export const sendTicketResolvedEmail = async (
  to: string,
  studentName: string,
  ticketSubject: string,
  description: string,
  remark: string,
  ticketId: string,
  marksUpdated?: number | null
) => {
  await sendMailWithLogging('sendTicketResolvedEmail', {
    from: DEFAULT_FROM,
    to: [to],
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
      <p>Status: Resolved</p>
      <p>Thank you for using the Peer Evaluation System.</p>
      <br/>
      <p>Regards,<br/>Peer Evaluation Team</p>
    `,
  });
};
