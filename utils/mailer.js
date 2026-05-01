const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendMail = async (to, subject, text, html) => {
  return resend.emails.send({
    from: 'Wayne Enterprize <onboarding@resend.dev>',
    to,
    subject,
    text,
    html,
    replyTo: process.env.RECEPTION_MAIL, // ✅ tu gardes ton replyTo
  });
};

module.exports = sendMail;