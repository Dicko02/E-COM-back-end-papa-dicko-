const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = 'Wayne Enterprize <noreply@wayne-enterprize.com>';
const REPLY  = process.env.RECEPTION_MAIL;

// ─── Confirmation de commande ────────────────────────────────────────────────
const sendConfirmationEmail = async (customerEmail, orders, totalAmount, transactionId) => {
  try {
    const orderItemsHtml = orders.map(order => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px;">${order.produitId?.nom || 'Produit'}</td>
        <td style="padding: 10px; text-align: center;">${order.quantity}</td>
        <td style="padding: 10px; text-align: right;">${order.totalAmount.toLocaleString()} FCFA</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Confirmation de commande</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .order-summary { background-color: #f8f9fa; padding: 15px; margin: 20px 0; }
          .total { font-weight: bold; font-size: 1.2em; color: #007bff; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #007bff; color: white; padding: 10px; text-align: left; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Commande confirmée !</h1>
            <p>Merci pour votre achat</p>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Nous avons bien reçu votre commande et votre paiement a été traité avec succès.</p>
            <div class="order-summary">
              <h3>📋 Détails de votre commande</h3>
              <p><strong>Numéro de transaction :</strong> ${transactionId}</p>
              <p><strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
              <p><strong>Email :</strong> ${customerEmail}</p>
            </div>
            <h3>📦 Articles commandés</h3>
            <table>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th style="text-align: center;">Quantité</th>
                  <th style="text-align: right;">Prix</th>
                </tr>
              </thead>
              <tbody>${orderItemsHtml}</tbody>
            </table>
            <div class="total">
              <p>💰 Total payé : ${totalAmount.toLocaleString()} FCFA</p>
            </div>
            <div class="order-summary">
              <h3>📬 Prochaines étapes</h3>
              <ul>
                <li>Préparation : 1-2 jours ouvrés</li>
                <li>Expédition : 2-3 jours ouvrés</li>
                <li>Livraison : 3-5 jours ouvrés</li>
              </ul>
              <p>Vous recevrez un email avec le numéro de suivi dès l'expédition.</p>
            </div>
            <p>Si vous avez des questions, contactez-nous.</p>
            <p>Merci de votre confiance !</p>
          </div>
          <div class="footer">
            <p>L'équipe Wayne Enterprize</p>
            <p>📧 support@wayne-enterprize.com</p>
            <p><small>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Confirmation de commande - Wayne Enterprize

Bonjour,

Nous avons bien reçu votre commande et votre paiement a été traité avec succès.

Détails de votre commande :
- Numéro de transaction : ${transactionId}
- Date : ${new Date().toLocaleDateString('fr-FR')}
- Email : ${customerEmail}

Articles commandés :
${orders.map(o => `- ${o.produitId?.nom || 'Produit'} x${o.quantity} : ${o.totalAmount.toLocaleString()} FCFA`).join('\n')}

Total payé : ${totalAmount.toLocaleString()} FCFA

Merci de votre confiance !
L'équipe Wayne Enterprize
    `.trim();

    const result = await resend.emails.send({
      from:    FROM,
      to:      customerEmail,
      replyTo: REPLY,
      subject: `✅ Confirmation de commande #${transactionId.slice(-8)}`,
      text:    textContent,
      html:    htmlContent,
    });

    console.log('📨 Email de confirmation envoyé:', result?.data?.id);
    return result;

  } catch (error) {
    console.error('❌ Erreur envoi email confirmation:', error.message);
    return false; // non-bloquant — le serveur ne crashe pas
  }
};

// ─── Mise à jour du statut de commande ──────────────────────────────────────
const sendStatusUpdateEmail = async (customerEmail, orderId, newStatus, trackingNumber = null) => {
  try {
    let statusMessage = '';
    let statusEmoji   = '';

    switch (newStatus) {
      case 'confirmed':
        statusEmoji   = '✅';
        statusMessage = 'Votre commande est confirmée et en préparation.';
        break;
      case 'shipped':
        statusEmoji   = '🚚';
        statusMessage = 'Votre commande a été expédiée.';
        break;
      case 'delivered':
        statusEmoji   = '📦';
        statusMessage = 'Votre commande a été livrée.';
        break;
      case 'cancelled':
        statusEmoji   = '❌';
        statusMessage = 'Votre commande a été annulée.';
        break;
      default:
        statusEmoji   = 'ℹ️';
        statusMessage = `Statut mis à jour : ${newStatus}`;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Mise à jour de commande</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .status-update { background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-left: 4px solid #007bff; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${statusEmoji} Mise à jour de votre commande</h1>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <div class="status-update">
              <h3>📋 Commande #${orderId}</h3>
              <p><strong>${statusMessage}</strong></p>
              ${trackingNumber ? `<p><strong>Numéro de suivi :</strong> ${trackingNumber}</p>` : ''}
            </div>
            <p>Merci de votre confiance !</p>
          </div>
          <div class="footer">
            <p>L'équipe Wayne Enterprize</p>
            <p>📧 support@wayne-enterprize.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await resend.emails.send({
      from:    FROM,
      to:      customerEmail,
      replyTo: REPLY,
      subject: `${statusEmoji} Mise à jour commande #${orderId.slice(-8)}`,
      html:    htmlContent,
    });

    console.log('📨 Email de mise à jour envoyé:', result?.data?.id);
    return result;

  } catch (error) {
    console.error('❌ Erreur envoi email mise à jour:', error.message);
    throw error;
  }
};

module.exports = { sendConfirmationEmail, sendStatusUpdateEmail };