const nodemailer = require('nodemailer');

exports.sendContactEmail = async (req, res) => {
  const { name, email, subject, message } = req.body;

  // Validation basique
  if (!name || !email || !message) {
    return res.status(400).json({ message: "Veuillez remplir les champs obligatoires." });
  }

  // Configuration du transporteur (Gmail)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SENDER_MAIL, // l'adresse Gmail
      pass: process.env.SENDER_MAIL_PASSWORD  // l'App Password
    }
  });

  const mailOptions = {
    from: email,
    to: process.env.SENDER_MAIL,
    subject: `[CONTACT E-COM] ${subject || 'Nouveau message'}`,
    html: `
      <h2>Nouveau message de contact</h2>
      <p><strong>Nom :</strong> ${name}</p>
      <p><strong>Email :</strong> ${email}</p>
      <p><strong>Message :</strong></p>
      <p>${message}</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Email envoyé !" });
  } catch (error) {
    console.error("Erreur Mailer:", error);
    res.status(500).json({ message: "Erreur lors de l'envoi." });
  }
};