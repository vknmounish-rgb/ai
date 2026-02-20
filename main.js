const SITE_CONFIG = {
  email: 'VjCTl@outlook.com',
  phoneInternational: '417563716225',
  notifyWebhook: '/api/notify' // backend endpoint (recommended) for email/whatsapp alerts
};

async function sendNotification(eventType, payload = {}) {
  const body = {
    eventType,
    page: location.pathname,
    timestamp: new Date().toISOString(),
    ...payload
  };

  try {
    await fetch(SITE_CONFIG.notifyWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (_) {
    // no-op in static mode
  }
}

function initSiteTracking() {
  sendNotification('visitor_open', {
    userAgent: navigator.userAgent,
    referrer: document.referrer || 'direct'
  });
}

function appendMessage(text, role, bodyEl) {
  const div = document.createElement('div');
  div.className = 'vj-msg ' + role;
  div.textContent = text;
  bodyEl.appendChild(div);
  bodyEl.scrollTop = bodyEl.scrollHeight;
}

async function sendMessage(vjInput, vjBody) {
  const message = vjInput.value.trim();
  if (!message) return;

  appendMessage(message, 'user', vjBody);
  vjInput.value = '';
  const botDiv = document.createElement('div');
  botDiv.className = 'vj-msg bot';
  botDiv.textContent = 'Thinking...';
  vjBody.appendChild(botDiv);

  await sendNotification('ai_message', { messagePreview: message.slice(0, 140) });

  try {
    const resp = await fetch('/api/vj-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    if (!resp.ok) throw new Error('Network error');
    const data = await resp.json();
    botDiv.textContent = data.reply || 'Sorry, no response from AI.';
  } catch {
    botDiv.textContent = 'AI is unavailable. Use WhatsApp or Email and we will respond quickly.';
  }
}

function initChatWidget() {
  const toggleBtn = document.getElementById('vjToggle');
  const windowEl = document.getElementById('vjWindow');
  const bodyEl = document.getElementById('vjBody');
  const inputEl = document.getElementById('vjInput');
  const sendEl = document.getElementById('vjSend');

  if (!toggleBtn || !windowEl || !bodyEl || !inputEl || !sendEl) return;

  toggleBtn.addEventListener('click', () => {
    windowEl.classList.toggle('vj-hidden');
    if (!windowEl.classList.contains('vj-hidden')) inputEl.focus();
  });
  sendEl.addEventListener('click', () => sendMessage(inputEl, bodyEl));
  inputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(inputEl, bodyEl); });
}

function whatsappLink(prefill) {
  return `https://wa.me/${SITE_CONFIG.phoneInternational}?text=${encodeURIComponent(prefill)}`;
}

document.addEventListener('DOMContentLoaded', () => {
  initSiteTracking();
  initChatWidget();

  document.querySelectorAll('[data-whatsapp-msg]').forEach((el) => {
    el.setAttribute('href', whatsappLink(el.dataset.whatsappMsg));
  });

  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      await sendNotification('contact_form_submit', data);
      alert('Thanks! Your request was sent. We will contact you shortly on email/WhatsApp.');
      form.reset();
    });
  }
});
