const nodemailer = require('nodemailer');
const logger = require('./logger');

/**
 * Validates SMTP configuration at startup or before sending
 */
const validateSMTPConfig = () => {
    const requiredKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    const missing = requiredKeys.filter(key => !process.env[key] || process.env[key].includes('your_'));
    return missing;
};

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: parseInt(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

const sendInviteMail = async (email, role, inviteToken, requestId = null) => {
    try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const inviteLink = `${frontendUrl}/invite/${inviteToken}`;

        const missingConfig = validateSMTPConfig();
        if (missingConfig.length > 0) {
            logger.warn(`Skipping email send to ${email}: SMTP config missing for ${missingConfig.join(', ')}.`);
            return { success: false, message: 'SMTP config missing' };
        }

        const transporter = createTransporter();
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"TaskPilot" <onboarding@taskpilot.com>',
            to: email,
            subject: "You're invited to TaskPilotAI 🚀",
            html: `<h2>You are invited as ${role}</h2>
                   <a href="${inviteLink}">Accept Invitation</a>`
        };

        const info = await transporter.sendMail(mailOptions);

        console.log("STEP 3: Email sent successfully");
        logger.info(`✔ Invite email sent successfully to ${email}`, { requestId });
        return info;
    } catch (error) {
        console.log("STEP ERROR:", error.message);
        logger.error(`Failed to send invite email to ${email}: ${error.message}`, { requestId, error });
        throw error;
    }
};

module.exports = { sendInviteMail, validateSMTPConfig };
