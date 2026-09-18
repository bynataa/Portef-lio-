/* The contact page keeps a native POST fallback when JavaScript is unavailable. */
(() => {
  const form = document.querySelector('.contact-form');
  if (!form) return;
  const dialog = document.querySelector('.contact-dialog');
  let opener = null;
  if (dialog && typeof dialog.showModal === 'function') {
    document.querySelectorAll('[data-contact-open]').forEach(link => {
      link.setAttribute('aria-haspopup', 'dialog');
      link.addEventListener('click', event => {
        event.preventDefault();
        opener = link;
        dialog.showModal();
        document.body.classList.add('modal-open');
        const assistant = document.querySelector('.budget-assistant');
        const target = assistant && !assistant.hidden ? assistant.querySelector('[data-current-focus]') : form.querySelector('[name="name"]');
        target?.focus();
      });
    });
    dialog.querySelector('.contact-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      document.body.classList.remove('modal-open');
      opener?.focus();
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  }
  // Preserve native submission in browsers without the APIs used below.
  if (typeof fetch !== 'function' || typeof FormData !== 'function' || typeof AbortController !== 'function') return;
  const button = form.querySelector('.contact-submit');
  const status = form.querySelector('.contact-status');
  const originalButton = button.innerHTML;
  let pending = false;
  function announce(message, state) {
    status.textContent = message;
    status.dataset.state = state;
    status.focus();
    const event = document.createEvent('Event');
    event.initEvent('contact:status', false, false);
    form.dispatchEvent(event);
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || !form.reportValidity()) return;
    const payload = Object.fromEntries(new FormData(form));
    if (String(payload._honey || '').trim()) return;
    if (!String(payload.name || '').trim() || !String(payload.message || '').trim()) {
      announce(form.dataset.error, 'error');
      return;
    }
    payload._subject = `Renarchi · ${payload.Solicitacao}`;
    payload._replyto = payload.email;
    payload._url = location.href;
    pending = true;
    button.disabled = true;
    button.textContent = form.dataset.sending;
    form.setAttribute('aria-busy', 'true');
    status.textContent = form.dataset.sending;
    status.dataset.state = 'pending';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const endpoint = new URL(form.action);
      endpoint.pathname = '/ajax' + endpoint.pathname;
      const response = await fetch(endpoint.href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const result = await response.json();
      const activation = /activat|confirm.{0,30}email|check.{0,30}email/i.test(String(result.message || ''));
      if (response.ok && activation) {
        announce(form.dataset.activation, 'error');
      } else if (response.ok && (result.success === true || result.success === 'true')) {
        form.reset();
        announce(form.dataset.success, 'success');
      } else {
        throw new Error('Submission was not confirmed');
      }
    } catch {
      announce(form.dataset.error, 'error');
    } finally {
      clearTimeout(timeout);
      pending = false;
      button.disabled = false;
      button.innerHTML = originalButton;
      form.removeAttribute('aria-busy');
    }
  });
})();
