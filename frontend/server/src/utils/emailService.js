const { Resend } = require('resend');
const logger = require('./logger');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Validates SMTP configuration at startup or before sending
 */
const validateSMTPConfig = () => {
    const requiredKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    const missing = requiredKeys.filter(key => !process.env[key] || process.env[key].includes('your_'));
    return missing;
};

const sendInviteMail = async (email, role, inviteToken, requestId = null) => {
    try {
        const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${inviteToken}`;

        const info = await resend.emails.send({
            from: 'TaskPilot <onboarding@resend.dev>',
            to: email,
            subject: "You're invited to TaskPilotAI 🚀",
            html: `<h2>You are invited as ${role}</h2>
                   <a href="${inviteLink}">Accept Invitation</a>`
        });

        logger.info(`✔ Invite email sent successfully to ${email}`, { requestId });
        return info;
    } catch (error) {
        logger.error(`Failed to send invite email to ${email}: ${error.message}`, { requestId, error });
        throw error;
    }
};

module.exports = { sendInviteMail, validateSMTPConfig };
