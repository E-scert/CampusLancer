const nodemailer = require("nodemailer");

// Outlook transporter (for student confirmations)
const outlookTransporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.OUTLOOK_USER,
    pass: process.env.OUTLOOK_PASS,
  },
});
outlookTransporter.verify((error, success) => {
  if (error) {
    console.error("Outlook SMTP error:", error);
  } else {
    console.log("Outlook SMTP is ready to send emails");
  }
});

// Gmail transporter (for business confirmations)
const gmailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

module.exports = { outlookTransporter, gmailTransporter };
