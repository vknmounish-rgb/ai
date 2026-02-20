/**
 * POST /api/notify
 * Receives lead/chat events. Replace console.log with email/WhatsApp integrations.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  // TODO: send body to your email provider and/or WhatsApp provider.
  // Example providers: SendGrid/Resend (email), Twilio WhatsApp.
  console.log('Lead notification event:', body);

  res.status(200).json({ ok: true });
};
