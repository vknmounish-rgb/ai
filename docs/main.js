const SITE_CONFIG = {
  email: 'VjCTl@outlook.com',
  phoneInternational: '417563716225',
  notifyWebhook: '/api/notify',
  aiEndpoint: '/api/vj-ai'
};

let chatHistory = [];

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


function localPreviewReply(message) {
  const text = message.toLowerCase();
  if (text.includes('price') || text.includes('cost')) {
    return 'We can share pricing after understanding scope. Please share your email and WhatsApp for a tailored quote.';
  }
  if (text.includes('sap')) {
    return 'We support SAP and SuccessFactors implementation, integration, and optimization. Share your use case and timeline.';
  }
  if (text.includes('cloud')) {
    return 'We help with cloud migration, governance, and managed operations. Tell me your current platform to suggest a plan.';
  }
  return 'Thanks for your message. Please share your email or WhatsApp number and our team will follow up quickly.';
}

function seedWelcome(bodyEl) {
  if (!bodyEl || bodyEl.children.length) return;
  appendMessage('Hi, I am the VJ CloudTech AI assistant. Tell me your goal and I will help.', 'bot', bodyEl);
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

  const emailMatch = message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = message.match(/(?:\+?\d[\d\s().-]{7,}\d)/);

  await sendNotification('ai_message', {
    message,
    messagePreview: message.slice(0, 140),
    contactEmail: emailMatch ? emailMatch[0] : '',
    contactPhone: phoneMatch ? phoneMatch[0] : ''
  });

  const payload = {
    message,
    messages: [...chatHistory, { role: 'user', content: message }]
  };

  try {
    const resp = await fetch(SITE_CONFIG.aiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) throw new Error('Network error');
    const data = await resp.json();
    const reply = data.reply || 'Sorry, no response from AI.';
    botDiv.textContent = reply;

    chatHistory.push({ role: 'user', content: message });
    chatHistory.push({ role: 'assistant', content: reply });
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
  } catch {
    botDiv.textContent = localPreviewReply(message);
  }
}

function initChatWidget() {
  const toggleBtn = document.getElementById('vjToggle');
  const windowEl = document.getElementById('vjWindow');
  const bodyEl = document.getElementById('vjBody');
  const inputEl = document.getElementById('vjInput');
  const sendEl = document.getElementById('vjSend');

  if (!windowEl || !bodyEl || !inputEl || !sendEl) return;

  seedWelcome(bodyEl);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      windowEl.classList.toggle('vj-hidden');
      if (!windowEl.classList.contains('vj-hidden')) inputEl.focus();
    });
  } else {
    windowEl.classList.remove('vj-hidden');
  }

  sendEl.addEventListener('click', () => sendMessage(inputEl, bodyEl));
  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage(inputEl, bodyEl);
  });
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
