(() => {
  let dispose = () => {};
  function initializeGallery() {
    dispose();
    const gallery = document.querySelector('[data-case-gallery]');
    if (!gallery) return;
    const viewport = gallery.querySelector('.case-screen-viewport');
    const slides = [...gallery.querySelectorAll('.case-screen')];
    const previous = gallery.querySelector('[data-gallery-prev]');
    const next = gallery.querySelector('[data-gallery-next]');
    const count = gallery.querySelector('[data-gallery-count]');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const controller = new AbortController();
    const options = { signal: controller.signal };
    let active = 0;
    let pointer = null;
    let frame = 0;
    const position = index => slides[index].offsetLeft - slides[0].offsetLeft;
    function update() {
      frame = 0;
      let nearest = 0;
      slides.forEach((slide, index) => {
        if (Math.abs(position(index) - viewport.scrollLeft) < Math.abs(position(nearest) - viewport.scrollLeft)) nearest = index;
      });
      active = nearest;
      slides.forEach((slide, index) => slide.classList.toggle('is-active', index === active));
      previous.disabled = active === 0;
      next.disabled = active === slides.length - 1;
      const value = String(active + 1);
      if (count.textContent !== value) count.textContent = value;
    }
    function go(index, instant = false) {
      index = Math.max(0, Math.min(slides.length - 1, index));
      viewport.scrollTo({ left: position(index), behavior: instant || reducedMotion.matches ? 'instant' : 'smooth' });
    }
    previous.addEventListener('click', () => go(active - 1), options);
    next.addEventListener('click', () => go(active + 1), options);
    viewport.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(update); }, { ...options, passive: true });
    viewport.addEventListener('keydown', event => {
      const target = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: slides.length - 1 }[event.key];
      if (target === undefined) return;
      event.preventDefault();
      go(target);
    }, options);
    // Touch uses native momentum scrolling and scroll snap, preserving vertical page scrolling.
    viewport.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch' || event.button !== 0) return;
      pointer = { id: event.pointerId, x: event.clientX, start: viewport.scrollLeft, index: active };
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add('is-dragging');
      event.preventDefault();
    }, options);
    viewport.addEventListener('pointermove', event => {
      if (!pointer || pointer.id !== event.pointerId) return;
      viewport.scrollLeft = pointer.start + pointer.x - event.clientX;
    }, options);
    function endDrag(event) {
      if (!pointer || pointer.id !== event.pointerId) return;
      const drag = pointer;
      pointer = null;
      viewport.classList.remove('is-dragging');
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      const distance = viewport.scrollLeft - drag.start;
      const threshold = Math.min(60, slides[0].clientWidth * .15);
      const target = Math.abs(distance) > threshold ? (distance > 0 ? Math.max(drag.index + 1, active) : Math.min(drag.index - 1, active)) : drag.index;
      go(target);
    }
    viewport.addEventListener('pointerup', endDrag, options);
    viewport.addEventListener('pointercancel', endDrag, options);
    viewport.addEventListener('lostpointercapture', endDrag, options);
    const resize = new ResizeObserver(() => go(active, true));
    resize.observe(viewport);
    update();
    dispose = () => { controller.abort(); resize.disconnect(); cancelAnimationFrame(frame); };
  }
  window.addEventListener('portfolio:pagechange', initializeGallery);
  initializeGallery();
})();
