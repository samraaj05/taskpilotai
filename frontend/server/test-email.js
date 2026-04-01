require('dotenv').config();
const nodemailer = require('nodemailer');

const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    debug: true,
    logger: true // Enable verbose logging
});

const testMail = async () => {
    console.log("--- 📧 TaskPilotAI SMTP Diagnostic ---");
    console.log("Host:", process.env.SMTP_HOST);
    console.log("Port:", smtpPort);
    console.log("User:", process.env.SMTP_USER);
    console.log("Pass (exists):", !!process.env.SMTP_PASS);

    try {
        console.log("1. Verifying connection...");
        await transporter.verify();
        console.log("✅ Connection Verified!");

        console.log("2. Attempting to send test email...");
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.SMTP_USER,
            to: process.env.SMTP_USER, // Send to self
            subject: "TaskPilotAI - Diagnostic Test",
            text: "This is a diagnostic test to verify your SMTP settings. If you receive this, your email system is WORKING! 🚀",
        });
        console.log("✅ Email Sent! MessageId:", info.messageId);
        process.exit(0);
    } catch (error) {
        console.error("❌ Diagnostic Failed:", error.message);
        if (error.code === 'EAUTH') {
            console.error("TIP: Authentication failed. Please check your App Password.");
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEOUT') {
            console.error("TIP: Connection timed out. Check firewall or port 587 blocking.");
        }
        process.exit(1);
    }
};

testMail();
