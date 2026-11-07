(() => {
  let dispose = () => {};

  function initializeReveals() {
    dispose();
    dispose = () => {};
    const content = document.querySelector('.case-content');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    if (!content || reducedMotion.matches || !window.IntersectionObserver || !Element.prototype.animate) return;

    const groups = [
      ['.case01-context .case-aside', '.case01-lead', '.case01-context-detail'],
      ['.case01-goals .case01-section-title', '.case01-goal-card'],
      ['.case01-goals-note'],
      ['.case01-visibility .case-aside', '.case01-visibility .case01-copy > p'],
      ['.case01-comparison figure'],
      ['.case01-craft .case01-section-title', '.case01-craft .case01-copy > p'],
      ['.case01-component-grid > figure > *'],
      ['.case01-story .case01-copy > p'],
      ['.case01-motion-copy > *'],
      ['.case01-motion-figure'],
      ['.case01-delivery .case-aside', '.case01-delivery .case01-copy > p'],
      ['.case-challenge .case-aside', '.case-challenge .case-large-copy > p'],
      ['.case-experience-image', '.case-experience-copy .case-aside', '.case-experience-description'],
      ['.case-mechanics .case-aside', '.case-mechanics .case-large-copy > p'],
      ['.case-stats > div'],
      ['.case-badges > img'],
      ['.case-gallery-controls', '.case-screen-viewport'],
      ['.case02-experience > .case-aside', '.case02-experience .case-large-copy > p'],
      ['.case02-opportunity-image', '.case02-opportunity .case-aside', '.case02-opportunity-description'],
      ['.case02-principles-title', '.case02-principles .case-aside', '.case02-principles-lead', '.case02-principles-detail > p', '.case02-ai-card'],
      ['.case02-comparison-title', '.case02-comparison figure'],
      ['.case02-hierarchy .case02-eyebrow', '.case02-hierarchy h2', '.case02-hierarchy .case02-copy > p'],
      ['.case02-hierarchy-card'],
      ['.case02-delivery .case-aside', '.case02-delivery .case02-copy > p'],
      ['.case-footer-edition', '.case-footer h2'],
      ['.case-footer-signature', '.case-footer-contact > a'],
    ];
    const delays = new Map();
    groups.forEach(selectors => {
      selectors.flatMap(selector => [...content.querySelectorAll(selector)]).forEach((element, index) => {
        delays.set(element, Math.min(index * 75, 225));
      });
    });
    const pending = new Set(delays.keys());
    const animations = new Set();
    function reveal(element, instant = false) {
      if (!pending.delete(element)) return;
      observer.unobserve(element);
      element.classList.remove('case-reveal-pending');
      if (instant || reducedMotion.matches) return;
      const animation = element.animate([
        { opacity: 0, transform: 'translate3d(0, 24px, 0)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ], { duration: 900, delay: delays.get(element), easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' });
      animations.add(animation);
      animation.finished.then(() => animation.cancel(), () => {}).finally(() => animations.delete(animation));
    }
    // Trigger from the leading edge, including for images taller than the viewport.
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); });
    }, { rootMargin: '0px 0px -48px 0px', threshold: 0 });
    pending.forEach(element => {
      element.classList.add('case-reveal-pending');
      observer.observe(element);
    });
    const revealAll = () => {
      [...pending].forEach(element => reveal(element, true));
      animations.forEach(animation => animation.cancel());
      animations.clear();
    };
    // Keyboard navigation must never land on an invisible control.
    const onFocus = event => {
      const element = event.target.closest('.case-reveal-pending');
      if (element) reveal(element, true);
    };
    const onMotionChange = () => { if (reducedMotion.matches) revealAll(); };
    content.addEventListener('focusin', onFocus);
    reducedMotion.addEventListener('change', onMotionChange);
    window.addEventListener('beforeprint', revealAll);
    dispose = () => {
      revealAll();
      observer.disconnect();
      content.removeEventListener('focusin', onFocus);
      reducedMotion.removeEventListener('change', onMotionChange);
      window.removeEventListener('beforeprint', revealAll);
    };
  }

  window.addEventListener('portfolio:pagechange', initializeReveals);
  initializeReveals();
})();
