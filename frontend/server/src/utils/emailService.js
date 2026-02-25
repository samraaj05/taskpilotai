const nodemailer = require('nodemailer');
const logger = require('./logger');
const CircuitBreaker = require('./circuitBreaker');
const retry = require('./retry');

// Initialize Circuit Breaker for Email Service
const emailCircuit = new CircuitBreaker('EmailService', {
    failureThreshold: 3,
    recoveryTimeout: 60000 // 1 min
});

/**
 * Validates SMTP configuration at startup or before sending
 */
const validateSMTPConfig = () => {
    const requiredKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    const missing = requiredKeys.filter(key => !process.env[key] || process.env[key].includes('your_'));
    return missing;
};

/**
 * Initialize Transporter
 */
const getTransporter = async () => {
    const missingKeys = validateSMTPConfig();
    let transporterConfig;

    if (missingKeys.length > 0) {
        logger.warn(`⚠ SMTP config incomplete (missing: ${missingKeys.join(', ')}). Falling back to Ethereal.`);
        const testAccount = await nodemailer.createTestAccount();
        transporterConfig = {
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        };
    } else {
        transporterConfig = {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            connectionTimeout: 5000,
        };
    }

    return { transporter: nodemailer.createTransport(transporterConfig), config: transporterConfig };
};

const sendInviteMail = async (email, role, inviteToken, requestId = null) => {
    return emailCircuit.execute(async () => {
        return retry(async () => {
            const { transporter, config } = await getTransporter();
            const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${inviteToken}`;

            const mailOptions = {
                from: process.env.EMAIL_FROM || "TaskPilot <noreply@taskpilot.com>",
                to: email,
                subject: "You're invited to TaskPilotAI 🚀",
                html: `
                    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 12px; background-color: #ffffff;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #4f46e5; font-size: 28px; margin-bottom: 10px;">You're invited to TaskPilotAI 🚀</h1>
                            <p style="color: #6b7280; font-size: 16px;">Step into the future of productivity.</p>
                        </div>
                        
                        <div style="background-color: #f9fafb; padding: 25px; border-radius: 8px; margin-bottom: 30px; text-align: center;">
                            <p style="color: #374151; font-size: 18px; margin: 0;">You have been invited as a</p>
                            <p style="color: #4f46e5; font-size: 24px; font-weight: bold; margin: 10px 0;">${role.replace('_', ' ')}</p>
                        </div>

                        <div style="text-align: center;">
                            <a href="${inviteLink}" style="display: inline-block; padding: 16px 32px; background-color: #7c3aed; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 8px; font-size: 16px;">
                                Accept Invitation
                            </a>
                        </div>

                        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 40px 0;">
                        
                        <div style="text-align: center; color: #9ca3af; font-size: 14px;">
                            <p>This invitation link will expire in 24 hours.</p>
                            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                        </div>
                    </div>
                `
            };

            const info = await transporter.sendMail(mailOptions);
            logger.info(`✔ Invite email sent successfully to ${email}`, { requestId });

            if (config.host === 'smtp.ethereal.email') {
                logger.debug(`🔗 Ethereal Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
            }
            return info;
        }, { maxRetries: 3, initialDelay: 1000, requestId });
    }, () => {
        logger.warn(`⚠ Email sending skipped for ${email} (Circuit OPEN)`, { requestId, state: 'circuit_open' });
        return null;
    }, requestId);
};

module.exports = { sendInviteMail, validateSMTPConfig };
