/* Progressive controls for the native, scroll-snap project list. */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  document.querySelectorAll('[data-carousel]').forEach(section => {
    const track = section.querySelector('[data-carousel-track]');
    const controls = section.querySelector('[data-carousel-controls]');
    const previous = section.querySelector('[data-carousel-prev]');
    const next = section.querySelector('[data-carousel-next]');
    const dotsContainer = section.querySelector('[data-carousel-dots]');
    const status = section.querySelector('[data-carousel-status]');
    const cards = track ? [...track.children].filter(card => card.matches('.project-card')) : [];
    if (!track || !controls || !previous || !next || !dotsContainer || !status || !cards.length ||
        typeof track.getBoundingClientRect !== 'function' || section.classList.contains('is-carousel-ready')) return;

    const tolerance = 1;
    const itemLabel = section.dataset.carouselItemLabel || 'Projeto';
    const ofLabel = section.dataset.carouselOf || 'de';
    const goLabel = section.dataset.carouselGoLabel || 'Ir para o projeto';
    let media = null;
    try { media = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null; } catch { /* Instant navigation is the fallback. */ }
    let viewport = 0, maximum = 0, positions = [0], bounds = [], dots = [];
    let scheduled = false, needsMeasure = false, targetPosition = null;
    const clamp = value => Math.max(0, Math.min(maximum, value));
    const currentPosition = () => clamp(Number(track.scrollLeft) || 0);
    const focusWithoutScrolling = element => {
      if (typeof element?.focus !== 'function') return;
      try { element.focus({ preventScroll: true }); } catch { element.focus(); }
    };

    function visibleAt(position) {
      const visible = [];
      let bestIndex = 0, bestOverlap = -1;
      bounds.forEach((card, index) => {
        if (card.start >= position - tolerance && card.end <= position + viewport + tolerance) visible.push(index);
        const overlap = Math.max(0, Math.min(card.end, position + viewport) - Math.max(card.start, position));
        if (overlap > bestOverlap) { bestOverlap = overlap; bestIndex = index; }
      });
      // A partial next-card preview should not inflate the announced range.
      return visible.length ? visible : [bestIndex];
    }

    function updateState() {
      const position = currentPosition();
      if (targetPosition !== null && Math.abs(position - targetPosition) <= tolerance) targetPosition = null;
      previous.disabled = position <= tolerance;
      next.disabled = maximum - position <= tolerance;
      const hideControls = viewport <= 0 || positions.length < 2;
      if (hideControls && controls.contains(document.activeElement)) focusWithoutScrolling(track);
      controls.hidden = hideControls;
      const active = positions.reduce((closest, value, index) =>
        Math.abs(value - position) < Math.abs(positions[closest] - position) ? index : closest, 0);
      dots.forEach((dot, index) => {
        if (index === active) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      const visible = visibleAt(position), first = visible[0] + 1, last = visible[visible.length - 1] + 1;
      const text = `${itemLabel} ${first}${last > first ? `–${last}` : ''} ${ofLabel} ${cards.length}`;
      if (status.textContent !== text) status.textContent = text;
    }

    function scrollToPosition(position, instant = false) {
      const left = clamp(position);
      targetPosition = left;
      const behavior = instant || !media || media.matches ? 'instant' : 'smooth';
      if (typeof track.scrollTo === 'function') {
        try { track.scrollTo({ left, behavior }); }
        catch { track.scrollLeft = left; }
      } else track.scrollLeft = left;
      schedule();
    }

    function measure() {
      const rectangle = track.getBoundingClientRect();
      const rawPosition = Number(track.scrollLeft) || 0;
      viewport = Math.max(0, Number(track.clientWidth) || 0);
      maximum = Math.max(0, (Number(track.scrollWidth) || 0) - viewport);
      bounds = cards.map(card => {
        const rect = card.getBoundingClientRect();
        const start = rect.left - rectangle.left + rawPosition - (track.clientLeft || 0);
        return { start, end: start + rect.width };
      });
      const leadingInset = bounds[0].start;
      positions = [0];
      bounds.forEach(card => {
        const position = clamp(card.start - leadingInset);
        if (position - positions[positions.length - 1] > tolerance) positions.push(position);
      });
      if (maximum - positions[positions.length - 1] > tolerance) positions.push(maximum);
      // Reuse buttons while resizing so an existing focused dot retains focus.
      const focusedIndex = dots.indexOf(document.activeElement);
      while (dots.length > positions.length) dots.pop().remove();
      while (dots.length < positions.length) {
        const index = dots.length, dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'carousel-dot';
        if (track.id) dot.setAttribute('aria-controls', track.id);
        dot.addEventListener('click', () => scrollToPosition(positions[index]));
        dotsContainer.appendChild(dot);
        dots.push(dot);
      }
      dots.forEach((dot, index) => dot.setAttribute('aria-label', `${goLabel} ${visibleAt(positions[index])[0] + 1}`));
      if (focusedIndex >= dots.length) focusWithoutScrolling(viewport > 0 && positions.length > 1 ? dots[dots.length - 1] : track);
      targetPosition = null;
      if (rawPosition < 0 || rawPosition > maximum) scrollToPosition(clamp(rawPosition), true);
    }

    function schedule(remeasure = false) {
      needsMeasure = needsMeasure || remeasure;
      if (scheduled) return;
      scheduled = true;
      const run = () => {
        scheduled = false;
        if (needsMeasure) { needsMeasure = false; measure(); }
        updateState();
      };
      if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(run);
      else run();
    }

    function step(direction) {
      const position = targetPosition ?? currentPosition();
      const candidate = direction > 0
        ? positions.find(value => value > position + tolerance)
        : [...positions].reverse().find(value => value < position - tolerance);
      scrollToPosition(candidate ?? (direction > 0 ? maximum : 0));
    }

    previous.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));
    track.addEventListener('scroll', () => schedule(), { passive: true });
    // User gestures cancel the queued target; scrolling itself remains entirely native.
    ['pointerdown', 'touchstart', 'wheel'].forEach(type =>
      track.addEventListener(type, () => { targetPosition = null; }, { passive: true }));
    track.addEventListener('keydown', event => {
      if (event.target !== track || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') scrollToPosition(0);
      else if (event.key === 'End') scrollToPosition(maximum);
      else step(event.key === 'ArrowRight' ? 1 : -1);
    });
    track.addEventListener('focusin', event => {
      const index = cards.findIndex(card => card.contains(event.target));
      if (index < 0) return;
      const card = bounds[index], position = currentPosition();
      if (card.start >= position - tolerance && card.end <= position + viewport + tolerance) return;
      const candidates = positions.filter(value => card.start >= value - tolerance && card.end <= value + viewport + tolerance);
      const nearest = candidates.reduce((best, value) => Math.abs(value - position) < Math.abs(best - position) ? value : best,
        candidates[0] ?? clamp(card.start));
      scrollToPosition(nearest, true);
    });

    const onMotionChange = () => {
      if (media.matches) scrollToPosition(currentPosition(), true);
    };
    if (typeof media?.addEventListener === 'function') media.addEventListener('change', onMotionChange);
    else if (typeof media?.addListener === 'function') media.addListener(onMotionChange);
    window.addEventListener?.('resize', () => schedule(true), { passive: true });
    if (typeof window.ResizeObserver === 'function') {
      try {
        const observer = new window.ResizeObserver(() => schedule(true));
        observer.observe(track);
        cards.forEach(card => observer.observe(card));
      } catch { /* Window resize remains available. */ }
    }
    section.classList.add('is-carousel-ready');
    // Measure after the enhancement class is applied, including its responsive CSS.
    measure();
    updateState();
  });
})();
