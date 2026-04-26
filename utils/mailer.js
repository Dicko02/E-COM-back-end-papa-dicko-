const nodemailer = require('nodemailer');

// Création d'un transporteur
const transporter = nodemailer.createTransport({
  service: "gmail", //Utilisation de Gmail
  auth: {
    user: process.env.SENDER_MAIL, //Adresse Gmail
    pass: process.env.SENDER_MAIL_PASSWORD //Mot de passe d'application généré
  }
});


// Fonction pour envoyer un e-mail
const sendMail = (to, subject, text, html) => {
    const mailOptions = {
        from: process.env.SENDER_MAIL,
        to: to,
        replyTo: process.env.RECEPTION_MAIL,
        subject: subject,
        text: text,
        html: html
    };

    return transporter.sendMail(mailOptions);
};

module.exports = sendMail;