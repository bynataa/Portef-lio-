/* Guided project intake. No generative AI, price calculation or browser storage. */
(() => {
  const root = document.querySelector('.budget-assistant');
  const form = document.querySelector('.contact-form');
  const copy = document.getElementById('quote-copy');
  if (!root || !form || !copy || typeof fetch !== 'function' || typeof AbortController !== 'function' || typeof form.requestSubmit !== 'function') return;
  const t = JSON.parse(copy.textContent);
  const modes = document.querySelector('.contact-modes');
  const quick = document.querySelector('.quick-message');
  const answers = {};
  let index = 0, review = false, editing = false, pending = false, sent = false, feedback = '';
  const contactStatus = form.querySelector('.contact-status');
  const originalEmailLink = form.querySelector('.contact-alternative a');
  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const button = (text, className, action) => {
    const b = node('button', className, text);
    b.type = 'button'; b.disabled = pending;
    b.addEventListener('click', action);
    return b;
  };
  function answerText(step) {
    const value = answers[step.id];
    if (!value) return t.notProvided;
    return step.options?.find(([id]) => id === value)?.[1] || value;
  }
  function question(step) {
    return step.id === 'details' ? (t.detailsFor[answers.service] || step.question) : step.question;
  }
  function focusCurrent() {
    // Hidden dialogs must not move focus on page load.
    const dialog = root.closest('dialog');
    if (!root.hidden && (!dialog || dialog.hasAttribute('open'))) root.querySelector('[data-current-focus]')?.focus();
  }
  function setMode(mode) {
    if (pending || form.getAttribute('aria-busy') === 'true') return;
    const quote = mode === 'quote';
    root.hidden = !quote; quick.hidden = quote;
    modes.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.contactMode === mode)));
    if (quote) focusCurrent(); else form.querySelector('[name="name"]').focus();
  }
  modes.hidden = false;
  modes.querySelectorAll('button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.contactMode)));
  root.hidden = false; quick.hidden = true;
  function alternative(parent) {
    const p = node('p', 'quote-alternative');
    p.append(originalEmailLink.cloneNode(true));
    parent.append(p);
  }
  function showReview() { review = true; editing = false; feedback = ''; render(); }
  function save(value) {
    const step = t.steps[index];
    answers[step.id] = value.trim();
    feedback = '';
    if (editing) { showReview(); return; }
    if (index === t.steps.length - 1) showReview();
    else { index++; render(); }
  }
  function render() {
    root.replaceChildren();
    root.append(node('p', 'quote-badge', t.badge));
    modes.querySelectorAll('button').forEach(b => { b.disabled = pending; });
    if (sent) {
      const h = node('h3', 'quote-heading', t.sent); h.tabIndex = -1; h.dataset.currentFocus = '';
      root.append(h, node('p', 'quote-success', t.sentText), node('p', 'quote-reply-email', answers.email));
      alternative(root); focusCurrent(); return;
    }
    if (review) {
      const h = node('h3', 'quote-heading', t.review); h.tabIndex = -1; h.dataset.currentFocus = '';
      root.append(h, node('p', 'quote-intro', t.reviewIntro));
      const list = node('dl', 'quote-summary');
      t.steps.forEach((step, i) => {
        const row = node('div', 'quote-summary-row');
        row.append(node('dt', '', step.label), node('dd', '', answerText(step)));
        const edit = button(t.edit, 'quote-edit', () => { index = i; review = false; editing = true; feedback = ''; render(); });
        edit.setAttribute('aria-label', t.edit + ': ' + step.label);
        row.append(edit); list.append(row);
      });
      const project = form.querySelector('[name="Projeto"]');
      if (project) {
        const row = node('div', 'quote-summary-row');
        row.append(node('dt', '', form.querySelector('label[for="contact-project"]').textContent), node('dd', '', project.value)); list.append(row);
      }
      root.append(list, node('p', 'contact-privacy', t.privacy));
      const send = button(pending ? t.sending : t.send, 'button quote-send', sendRequest);
      const status = node('p', 'contact-status quote-status', feedback);
      status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); status.setAttribute('aria-atomic', 'true'); status.tabIndex = -1;
      status.dataset.state = pending ? 'pending' : 'error';
      root.append(send, status); alternative(root);
      if (feedback) status.focus(); else focusCurrent();
      return;
    }
    const step = t.steps[index];
    const progress = node('p', 'quote-progress', t.progress.replace('{n}', index + 1).replace('{total}', t.steps.length));
    root.append(progress);
    const log = node('div', 'quote-conversation');
    log.setAttribute('aria-label', t.tab); log.tabIndex = 0;
    log.append(node('p', 'quote-bubble quote-bot', t.intro));
    for (let i = 0; i < index; i++) {
      if (!(t.steps[i].id in answers)) continue;
      log.append(node('p', 'quote-bubble quote-bot', question(t.steps[i])), node('p', 'quote-bubble quote-user', answerText(t.steps[i])));
    }
    root.append(log);
    const composer = node('form', 'quote-composer');
    const label = node('label', 'quote-question', question(step)); label.id = 'quote-question'; label.htmlFor = 'quote-answer';
    if (step.type === 'choice') label.removeAttribute('for');
    composer.append(label);
    const error = node('p', 'quote-validation'); error.setAttribute('role', 'alert');
    if (step.type === 'choice') {
      const choices = node('div', 'quote-choices'); choices.setAttribute('role', 'group'); choices.setAttribute('aria-labelledby', label.id);
      step.options.forEach(([value, text], i) => {
        const option = button(text, 'quote-choice', () => save(value)); option.dataset.answer = value;
        option.setAttribute('aria-pressed', String(answers[step.id] === value));
        if (i === 0) option.dataset.currentFocus = '';
        choices.append(option);
      });
      composer.append(choices);
      composer.addEventListener('submit', e => { e.preventDefault(); error.textContent = t.choose; });
    } else {
      const input = node(step.type === 'textarea' ? 'textarea' : 'input', 'quote-answer');
      input.id = 'quote-answer'; input.name = step.id; input.dataset.currentFocus = '';
      if (step.type !== 'textarea') input.type = step.type; else input.rows = 3;
      input.required = !step.optional; input.maxLength = step.max; input.autocomplete = step.autocomplete || 'off';
      input.placeholder = step.placeholder || ''; input.value = answers[step.id] || '';
      input.setAttribute('aria-labelledby', label.id);
      const next = node('button', 'button quote-next', t.next); next.type = 'submit';
      composer.append(input, next);
      composer.addEventListener('submit', e => {
        e.preventDefault(); const value = input.value.trim();
        if (!value && !step.optional) { error.textContent = t.required; input.focus(); return; }
        if (value.length > step.max) { error.textContent = t.tooLong; input.focus(); return; }
        if (step.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { error.textContent = t.emailError; input.focus(); return; }
        save(value);
      });
    }
    composer.append(error);
    const navigation = node('div', 'quote-navigation');
    if (index > 0 || editing) navigation.append(button('← ' + t.back, 'quote-back', () => {
      if (editing) showReview(); else { index--; feedback = ''; render(); }
    }));
    if (step.optional) navigation.append(button(t.skip, 'quote-skip', () => save('')));
    composer.append(navigation); root.append(composer);
    log.scrollTop = log.scrollHeight;
    focusCurrent();
  }
  function sendRequest() {
    if (pending || sent) return;
    const message = [t.emailTitle, '', t.emailIntro, '', ...t.steps.map(step => `${step.label}: ${answerText(step)}`)];
    const project = form.querySelector('[name="Projeto"]');
    if (project) message.push('', `${form.querySelector('label[for="contact-project"]').textContent}: ${project.value}`);
    message.push('', t.emailClosing);
    form.querySelector('[name="name"]').value = answers.name;
    form.querySelector('[name="email"]').value = answers.email;
    form.querySelector('[name="WhatsApp"]').value = answers.phone || '';
    form.querySelector('[name="message"]').value = message.join('\n');
    form.querySelector('[name="Solicitacao"]').selectedIndex = 0;
    if (!form.checkValidity()) { feedback = t.emailError; render(); return; }
    pending = true; feedback = t.sending; render();
    form.requestSubmit();
  }
  form.addEventListener('contact:status', () => {
    if (!pending) return;
    pending = false;
    if (contactStatus.dataset.state === 'success') { sent = true; feedback = ''; }
    else feedback = contactStatus.textContent;
    render();
  });
  render();
})();
