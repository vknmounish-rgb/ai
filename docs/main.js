const SITE_CONFIG = {
  email: 'VjCTl@outlook.com',
  phoneInternational: '417563716225',
  notifyWebhook: 'https://hooks.zapier.com/hooks/catch/26526447/ucfeqg8/',
  aiEndpoint: window.VJ_AI_ENDPOINT || '/api/vj-ai'
};

let chatHistory = [];
let aiUnavailable = false;

function pingZapierWebhook() {
  fetch('https://hooks.zapier.com/hooks/catch/26526447/ucfeqg8/').catch(() => {});
}

async function fetchWithTimeout(url, options, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function sendNotification(eventType, payload = {}) {
  if (!SITE_CONFIG.notifyWebhook) return;
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
    return 'For pricing, share your project scope, number of users, and timeline. We will send a tailored quote on email/WhatsApp.';
  }
  if (text.includes('sap')) {
    return 'We support SAP/SuccessFactors implementation, integration, and optimization. Tell me your module and current challenge.';
  }
  if (text.includes('cloud')) {
    return 'We handle cloud migration, governance, and support. Which platform are you using now (Azure/AWS/on-prem)?';
  }
  if (text.includes('security') || text.includes('cyber')) {
    return 'We can improve your cybersecurity with identity controls, backup and monitoring. Share your current setup to get a plan.';
  }
  return 'Thanks for your message. Please share your email or WhatsApp number and our team will respond quickly.';
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

  if (!SITE_CONFIG.aiEndpoint) {
    botDiv.textContent = localPreviewReply(message);
    return;
  }

  try {
    const resp = await fetchWithTimeout(SITE_CONFIG.aiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, 8000);

    if (!resp.ok) throw new Error('Network error');
    const data = await resp.json();
    const reply = data.reply || localPreviewReply(message);
    botDiv.textContent = reply;

    chatHistory.push({ role: 'user', content: message });
    chatHistory.push({ role: 'assistant', content: reply });
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
  } catch {
    aiUnavailable = true;
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
  pingZapierWebhook();
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
