/**
 * POST /api/vj-ai
 * Requires OPENAI_API_KEY in environment.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENAI_API_KEY is not configured.' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const messages = Array.isArray(body.messages) && body.messages.length
    ? body.messages
    : [{ role: 'user', content: body.message || '' }];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: 'You are VJ CloudTech assistant. Be concise, helpful, and ask for email/WhatsApp when needed.'
          },
          ...messages
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(502).json({ error: 'AI provider request failed', detail: errText });
      return;
    }

    const data = await response.json();
    const reply = data && data.choices && data.choices[0] && data.choices[0].message
      ? String(data.choices[0].message.content || '').trim()
      : 'No response generated.';

    res.status(200).json({ reply });
  } catch (error) {
    res.status(500).json({ error: 'AI request failed', detail: String(error.message || error) });
  }
};
