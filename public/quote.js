/* Conversational, guided intake. No generative AI or browser storage. */
(() => {
  const root = document.querySelector('.budget-assistant');
  const form = document.querySelector('.contact-form');
  const copy = document.getElementById('quote-copy');
  if (!root || !form || !copy || typeof fetch !== 'function' || typeof AbortController !== 'function' || typeof form.requestSubmit !== 'function') return;
  const t = JSON.parse(copy.textContent);
  const modes = document.querySelector('.contact-modes');
  const quick = document.querySelector('.quick-message');
  const panel = root.closest('.contact-dialog, .contact-panel');
  const answers = {}, drafts = {};
  let index = 0, review = false, editing = false, pending = false, sent = false, feedback = '';
  const contactStatus = form.querySelector('.contact-status');
  const originalEmailLink = form.querySelector('.contact-alternative a');
  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const paths = {
    home: 'M3 10 12 3l9 7M5 9v12h14V9M9 21v-8h6v8',
    layout: 'M3 3h18v18H3zM3 10h18M11 10v11',
    tools: 'm14 6 4-4 4 4-4 4M3 21l11-11M4 3l5 5-2 2-5-5M15 15l6 6',
    building: 'M5 21V3h14v18M3 21h18M8 7h2m4 0h2M8 11h2m4 0h2M10 21v-6h4v6',
    document: 'M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h6',
    cube: 'm12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10',
    sparkle: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
    shop: 'M3 10h18M4 10V6l2-3h12l2 3v4M5 10v11h14V10M9 21v-7h6v7',
    clinic: 'M4 3h16v18H4zM12 6v6M9 9h6M9 21v-6h6v6',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l3 2',
    arrow: 'M12 20V4m-6 6 6-6 6 6',
    check: 'm5 12 4 4L19 6',
    edit: 'm15 4 5 5M4 20l4-1L21 6l-5-5L3 14z',
    mail: 'M3 5h18v14H3zM3 5l9 7 9-7'
  };
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [key, value] of Object.entries({viewBox:'0 0 24 24',width:'22',height:'22',fill:'none',stroke:'currentColor','stroke-width':'1.5','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'})) svg.setAttribute(key, value);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', paths[name] || paths.sparkle); svg.append(path); return svg;
  }
  const button = (text, className, action) => {
    const b = node('button', className, text); b.type = 'button'; b.disabled = pending;
    b.addEventListener('click', action); return b;
  };
  function answerText(step) {
    const value = answers[step.id];
    return value ? (step.options?.find(([id]) => id === value)?.[1] || value) : t.notProvided;
  }
  function question(step) { return step.id === 'details' ? (t.detailsFor[answers.service] || step.question) : step.question; }
  function focusCurrent() {
    const dialog = root.closest('dialog');
    if (!root.hidden && (!dialog || dialog.hasAttribute('open'))) root.querySelector('[data-current-focus]')?.focus({preventScroll:true});
  }
  const progress = node('div', 'quote-progress-wrap');
  const log = node('div', 'quote-conversation');
  log.setAttribute('role', 'log'); log.setAttribute('aria-label', t.conversation); log.setAttribute('aria-live', 'polite'); log.setAttribute('aria-relevant', 'additions'); log.tabIndex = 0;
  const composer = node('div', 'quote-compose-dock');
  root.append(progress, log, composer);
  panel.classList.add('chat-enabled'); panel.dataset.contactMode = 'quote';
  const turns = new Map();
  function bubble(text, side = 'bot') {
    const row = node('div', `quote-message quote-message-${side} is-new`);
    if (side === 'bot') row.append(node('span', 'quote-message-avatar', 'r.'));
    const content = node('p', `quote-bubble quote-${side}`, text); row.append(content);
    return row;
  }
  log.append(bubble(t.intro));
  function scrollConversation() {
    if (root.hidden) return;
    const current = review || sent ? log.querySelector('.quote-final-turn') : turns.get(index);
    // Scroll only the transcript; the composer and header stay in place.
    if (current && log.clientHeight > 0) {
      const top = current.offsetTop;
      log.scrollTop = Math.max(0, top - (review || sent ? 14 : 72));
    } else log.scrollTop = log.scrollHeight;
  }
  function rememberDraft() {
    const input = composer.querySelector('.quote-answer');
    if (input) drafts[t.steps[index].id] = input.value;
  }
  function setMode(mode) {
    if (pending || form.getAttribute('aria-busy') === 'true') return;
    rememberDraft();
    const quote = mode === 'quote'; root.hidden = !quote; quick.hidden = quote; panel.dataset.contactMode = mode;
    modes.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.contactMode === mode)));
    if (quote) { focusCurrent(); scrollConversation(); } else form.querySelector('[name="name"]').focus({preventScroll:true});
  }
  modes.hidden = false;
  modes.querySelectorAll('button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.contactMode)));
  root.hidden = false; quick.hidden = true;
  form.addEventListener('contact:open', scrollConversation);
  // Account for the mobile keyboard without moving the composer off screen.
  if (typeof window !== 'undefined' && window.visualViewport) {
    const resize = () => {
      if (panel.matches('dialog[open]')) panel.style.setProperty('--chat-available-height', `${Math.max(180, window.visualViewport.height - 16)}px`);
    };
    window.visualViewport.addEventListener('resize', resize);
    form.addEventListener('contact:open', resize);
  }
  function alternative(parent) {
    const p = node('p', 'quote-alternative'); p.append(originalEmailLink.cloneNode(true)); parent.append(p);
  }
  function showReview() { review = true; editing = false; feedback = ''; render(); }
  function revisit(i, fromReview = false) {
    rememberDraft(); index = i; review = false; editing = fromReview; feedback = ''; render();
  }
  function save(value) {
    const step = t.steps[index]; answers[step.id] = value.trim(); delete drafts[step.id]; feedback = '';
    if (editing || index === t.steps.length - 1) showReview(); else { index++; render(); }
  }
  function renderProgress() {
    progress.replaceChildren();
    const stage = review || sent ? 3 : index < 3 ? 0 : index < 7 ? 1 : 2;
    const stages = node('div', 'quote-stages');
    t.stages.forEach((label, i) => {
      const s = node('span', `quote-stage${i === stage ? ' is-current' : ''}${i < stage ? ' is-done' : ''}`);
      const number = node('span', 'quote-stage-number', i < stage ? '✓' : String(i + 1)); number.setAttribute('aria-hidden', 'true');
      s.append(number, node('span', '', label)); if (i === stage) s.setAttribute('aria-current', 'step'); stages.append(s);
    });
    const meter = node('div', 'quote-meter'); meter.setAttribute('role', 'progressbar'); meter.setAttribute('aria-label', t.tab);
    meter.setAttribute('aria-valuemin', '0'); meter.setAttribute('aria-valuemax', String(t.steps.length)); meter.setAttribute('aria-valuenow', String(review || sent ? t.steps.length : index));
    const fill = node('span'); fill.style.width = `${(review || sent ? 1 : index / t.steps.length) * 100}%`; meter.append(fill); progress.append(stages, meter);
  }
  function syncHistory() {
    const last = review || sent ? t.steps.length - 1 : index;
    log.querySelectorAll('.is-new').forEach(el => el.classList.remove('is-new'));
    log.querySelectorAll('.quote-final-turn').forEach(el => el.remove());
    for (const [i, turn] of turns) if (i > last) { turn.remove(); turns.delete(i); }
    for (let i = 0; i <= last; i++) {
      const step = t.steps[i], answered = review || sent || i < index;
      let turn = turns.get(i);
      if (!turn) {
        turn = node('div', 'quote-turn'); turn.dataset.step = step.id;
        const bot = bubble(question(step)); turn.append(bot); turns.set(i, turn); log.append(turn);
      }
      const questionText = turn.querySelector('.quote-bot');
      if (questionText.textContent !== question(step)) questionText.textContent = question(step);
      questionText.classList.toggle('quote-question', !answered);
      if (!answered) questionText.id = 'quote-question'; else questionText.removeAttribute('id');
      turn.querySelector('.quote-choices')?.remove();
      if (answered) {
        let reply = turn.querySelector('.quote-message-user');
        if (!reply) {
          reply = bubble(answerText(step), 'user');
          const edit = button('', 'quote-reply-edit', () => revisit(i, review)); edit.append(icon('edit'));
          edit.setAttribute('aria-label', `${t.revisit}: ${step.label}`); reply.append(edit); turn.append(reply);
        } else if (reply.querySelector('.quote-user').textContent !== answerText(step)) reply.querySelector('.quote-user').textContent = answerText(step);
        reply.querySelector('button').disabled = pending || sent;
      } else turn.querySelector('.quote-message-user')?.remove();
    }
  }
  function renderSummary() {
    const final = node('div', 'quote-final-turn'); final.append(bubble(t.reviewNote));
    const card = node('section', 'quote-review-card'); card.setAttribute('aria-label', t.summaryLabel);
    const stamp = node('span', 'quote-card-icon'); stamp.append(icon('document'));
    const title = node('h3', 'quote-heading', t.reviewReady); title.tabIndex = -1; title.dataset.currentFocus = '';
    const head = node('div', 'quote-card-heading'); head.append(stamp, title); card.append(head);
    card.append(node('p', 'quote-card-service', `${answerText(t.steps[0])} · ${answerText(t.steps[1])}`), node('p', 'quote-card-location', answers.location), node('p', 'quote-card-email', answers.email));
    const details = node('details', 'quote-review-details'); details.append(node('summary', '', t.reviewDetails));
    const list = node('dl', 'quote-summary');
    t.steps.forEach((step, i) => {
      const row = node('div', 'quote-summary-row'); row.append(node('dt', '', step.label), node('dd', '', answerText(step)));
      const edit = button(t.edit, 'quote-edit', () => revisit(i, true)); edit.setAttribute('aria-label', `${t.edit}: ${step.label}`); row.append(edit); list.append(row);
    });
    const project = form.querySelector('[name="Projeto"]');
    if (project) {
      const row = node('div', 'quote-summary-row'); row.append(node('dt', '', form.querySelector('label[for="contact-project"]').textContent), node('dd', '', project.value)); list.append(row);
      card.append(node('p', 'quote-card-reference', project.value));
    }
    details.append(list); card.append(details); final.append(card); log.append(final);
    const send = button(pending ? t.sending : t.send, 'button quote-send', sendRequest); send.append(icon('mail')); composer.append(send);
    composer.append(node('p', 'contact-privacy', t.privacy));
    const status = node('p', 'contact-status quote-status', feedback); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); status.setAttribute('aria-atomic', 'true'); status.tabIndex = -1; status.dataset.state = pending ? 'pending' : 'error'; composer.append(status);
    if (feedback && !pending) { alternative(composer); status.focus({preventScroll:true}); }
  }
  function render() {
    modes.querySelectorAll('button').forEach(b => { b.disabled = pending; });
    renderProgress(); syncHistory(); composer.replaceChildren();
    if (sent) {
      const final = node('div', 'quote-final-turn'); final.append(bubble(t.sentText));
      const card = node('div', 'quote-success-card'); const mark = node('span', 'quote-success-mark'); mark.append(icon('check'));
      const h = node('h3', 'quote-heading', t.sent); h.tabIndex = -1; h.dataset.currentFocus = '';
      card.append(mark, h, node('p', 'quote-success', t.sentText), node('p', 'quote-reply-email', answers.email)); final.append(card); log.append(final); alternative(composer);
    } else if (review) renderSummary();
    else renderQuestion();
    scrollConversation(); if (!feedback) focusCurrent();
  }
  function renderQuestion() {
    const step = t.steps[index];
    const inputForm = node('form', 'quote-composer');
    const error = node('p', 'quote-validation'); error.id = 'quote-validation'; error.setAttribute('role', 'alert');
    if (editing) inputForm.append(node('p', 'quote-editing-hint', `${t.editHint} · ${step.label}`));
    if (step.type === 'choice') {
      const choices = node('div', 'quote-choices is-new'); choices.setAttribute('role', 'group'); choices.setAttribute('aria-labelledby', 'quote-question');
      const choiceIcons = {interiors:'layout',renovation:'tools',new:'home',documents:'document',visualization:'cube',guidance:'sparkle',house:'home',apartment:'building',shop:'shop',office:'layout',clinic:'clinic',other:'sparkle',soon:'clock',three:'clock',six:'clock',planning:'sparkle'};
      step.options.forEach(([value, text], i) => {
        const option = button('', 'quote-choice', () => save(value)); option.dataset.answer = value;
        const mark = node('span', 'quote-choice-icon'); mark.append(icon(choiceIcons[value]));
        option.append(mark, node('span', 'quote-choice-text', text), node('span', 'quote-choice-arrow', '↗'));
        option.querySelector('.quote-choice-arrow').setAttribute('aria-hidden', 'true'); option.setAttribute('aria-pressed', String(answers[step.id] === value));
        if (i === 0) option.dataset.currentFocus = ''; choices.append(option);
      });
      turns.get(index).append(choices);
      inputForm.append(node('p', 'quote-pick-hint', t.pickHint));
      inputForm.addEventListener('submit', e => { e.preventDefault(); error.textContent = t.choose; });
    } else {
      const field = node('div', 'quote-input-shell');
      const input = node(step.type === 'textarea' ? 'textarea' : 'input', 'quote-answer'); input.id = 'quote-answer'; input.name = step.id; input.dataset.currentFocus = '';
      if (step.type !== 'textarea') input.type = step.type; else input.rows = 2;
      input.required = !step.optional; input.maxLength = step.max; input.autocomplete = step.autocomplete || 'off';
      input.placeholder = step.placeholder || t.inputHint; input.value = drafts[step.id] ?? answers[step.id] ?? '';
      input.setAttribute('aria-labelledby', 'quote-question'); input.setAttribute('aria-describedby', 'quote-validation');
      input.addEventListener('input', () => { drafts[step.id] = input.value; });
      const next = node('button', 'quote-next'); next.type = 'submit'; next.setAttribute('aria-label', t.sendAnswer); next.title = t.sendAnswer; next.append(icon('arrow'));
      field.append(input, next); inputForm.append(field);
      inputForm.addEventListener('submit', e => {
        e.preventDefault(); const value = input.value.trim();
        if (!value && !step.optional) { error.textContent = t.required; input.focus({preventScroll:true}); return; }
        if (value.length > step.max) { error.textContent = t.tooLong; input.focus({preventScroll:true}); return; }
        if (step.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { error.textContent = t.emailError; input.focus({preventScroll:true}); return; }
        save(value);
      });
      if (step.type === 'textarea') input.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); inputForm.requestSubmit(); } });
    }
    inputForm.append(error);
    const navigation = node('div', 'quote-navigation');
    if (index > 0 || editing) navigation.append(button(editing ? t.cancelEdit : '← ' + t.back, 'quote-back', () => {
      rememberDraft(); if (editing) showReview(); else { index--; feedback = ''; render(); }
    }));
    if (step.optional) navigation.append(button(t.skip, 'quote-skip', () => save('')));
    inputForm.append(navigation); composer.append(inputForm);
  }
  function sendRequest() {
    if (pending || sent) return;
    const message = [t.emailTitle, '', t.emailIntro, '', ...t.steps.map(step => `${step.label}: ${answerText(step)}`)];
    const project = form.querySelector('[name="Projeto"]');
    if (project) message.push('', `${form.querySelector('label[for="contact-project"]').textContent}: ${project.value}`);
    message.push('', t.emailClosing);
    form.querySelector('[name="name"]').value = answers.name; form.querySelector('[name="email"]').value = answers.email;
    form.querySelector('[name="WhatsApp"]').value = answers.phone || ''; form.querySelector('[name="message"]').value = message.join('\n');
    form.querySelector('[name="Solicitacao"]').selectedIndex = 0;
    if (!form.checkValidity()) { feedback = t.emailError; render(); return; }
    pending = true; feedback = t.sending; render(); form.requestSubmit();
  }
  form.addEventListener('contact:status', () => {
    if (!pending) return;
    pending = false; if (contactStatus.dataset.state === 'success') { sent = true; feedback = ''; } else feedback = contactStatus.textContent;
    render();
  });
  render();
})();
