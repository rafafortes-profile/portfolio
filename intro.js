/* Share timing and easing while preserving each page's original typesetting. */
let cancelActiveIntro = () => {};
let activeIntroCompletion = Promise.resolve();

window.portfolioIntro = {
  play() {
    activeIntroCompletion = playIntro();
    return activeIntroCompletion;
  },
  async finish(options) {
    cancelActiveIntro(options);
    await activeIntroCompletion;
  },
};

async function playIntro() {
  const root = document.documentElement;
  const title = document.querySelector('h1');
  if (!title) {
    root.classList.remove('intro-pending', 'intro-menu-pending');
    return;
  }
  const isMultiline = title.dataset.intro === 'lines';
  const isCollection = title.dataset.intro === 'cards';
  const animateMenu = document.getElementById('app')?.dataset.page === 'home' && root.classList.contains('intro-menu-pending');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const originalText = title.textContent;
  const animations = [];
  let stopped = false;
  let preserveVisual = false;
  let frozen = false;
  const restoreTitle = () => {
    title.textContent = originalText;
    title.style.removeProperty('color');
    title.removeAttribute('aria-label');
  };
  const reveal = () => root.classList.remove('intro-pending', 'intro-menu-pending');
  const finishImmediately = (options = {}) => {
    preserveVisual ||= options.preserveVisual === true;
    stopped = true;
    if (preserveVisual) {
      if (!frozen) {
        // Navigation can interrupt the intro: freeze what is currently visible
        // instead of briefly revealing the complete page before fading it out.
        title.closest('#page-content')?.querySelectorAll('h1, [data-intro-reveal], .expertise, .name, .contact a').forEach(element => {
          if (getComputedStyle(element).visibility === 'hidden') element.style.visibility = 'hidden';
        });
        animations.forEach(animation => {
          const element = animation.effect.target;
          const style = getComputedStyle(element);
          const opacity = style.opacity;
          const transform = style.transform;
          animation.cancel();
          if (!element.closest('.header')) {
            element.style.opacity = opacity;
            element.style.transform = transform;
          }
        });
        frozen = true;
      }
    } else {
      animations.forEach(animation => animation.cancel());
      restoreTitle();
    }
    reveal();
  };
  cancelActiveIntro = finishImmediately;

  if (reducedMotion.matches || !Element.prototype.animate) {
    reveal();
    return;
  }

  try {
    await Promise.race([
      document.fonts.ready,
      new Promise(resolve => setTimeout(resolve, 1200)),
    ]);
    if (stopped || reducedMotion.matches) return;

    const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
    if (!isCollection) {
      const text = title.firstChild;
      const range = document.createRange();
      const pieces = [];

      if (isMultiline) {
        // Detect the browser's actual line breaks, including on narrow screens.
        for (let index = 0; index < originalText.length; index++) {
          range.setStart(text, index);
          range.setEnd(text, index + 1);
          const top = range.getBoundingClientRect().top;
          const line = pieces.at(-1);
          if (!line || Math.abs(top - line.top) > 1) {
            pieces.push({ text: originalText[index], top });
          } else {
            line.text += originalText[index];
          }
        }
      } else {
        const titleLeft = title.getBoundingClientRect().left;
        Array.from(originalText).forEach((character, index) => {
          range.setStart(text, index);
          range.setEnd(text, index + 1);
          pieces.push({ text: character, left: range.getBoundingClientRect().left - titleLeft });
        });
      }

      title.setAttribute('aria-label', originalText);
      title.style.color = 'transparent';

      const lineHeight = parseFloat(getComputedStyle(title).lineHeight);
      const stagedTitle = pieces.map(piece => {
        const content = document.createElement('span');
        content.className = isMultiline ? 'intro-line' : 'intro-letter';
        content.setAttribute('aria-hidden', 'true');
        content.textContent = isMultiline ? piece.text.trim() : piece.text;
        if (isMultiline) {
          const mask = document.createElement('span');
          mask.className = 'intro-line-mask';
          mask.setAttribute('aria-hidden', 'true');
          mask.style.top = `${piece.top - pieces[0].top}px`;
          mask.style.height = `${lineHeight}px`;
          mask.append(content);
          title.append(mask);
        } else {
          content.style.left = `${piece.left}px`;
          title.append(content);
        }
        return content;
      });

      const stagger = isMultiline ? Math.min(56, 168 / Math.max(1, pieces.length - 1)) : 24;
      stagedTitle.forEach((piece, index) => {
        animations.push(piece.animate([
          { transform: `translate3d(0, -112%, 0) rotate(${isMultiline ? '0deg' : '-2deg'})` },
          { transform: 'translate3d(0, 0, 0) rotate(0deg)' },
        ], { duration: 1120, delay: 80 + index * stagger, easing: ease, fill: 'both' }));
      });
    }

    const elements = isMultiline || isCollection ? [
      ...Array.from(document.querySelectorAll('[data-intro-reveal]'), element => [element, Number(element.dataset.introReveal)]),
    ] : [
      ['.expertise', 1500],
      ['.name', 1570],
      ['.phone', 1640],
      ['.email', 1690],
      ['.linkedin', 1740],
    ];
    if (animateMenu) elements.unshift(['.navigation', 1400], ['.date', 1440]);
    elements.forEach(([target, delay]) => {
      const element = typeof target === 'string' ? document.querySelector(target) : target;
      if (!element) return;
      animations.push(element.animate([
        { opacity: 0, transform: 'translate3d(0, -10px, 0)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ], { duration: 650, delay, easing: ease, fill: 'both' }));
    });

    reveal();
    reducedMotion.addEventListener('change', finishImmediately, { once: true });
    // A resize changes measured positions and line breaks; restore native text.
    window.addEventListener('resize', finishImmediately, { once: true });
    await Promise.all(animations.map(animation => animation.finished));
  } catch {
    // Interrupted or unsupported motion must always leave a complete page.
  } finally {
    finishImmediately();
    reducedMotion.removeEventListener('change', finishImmediately);
    window.removeEventListener('resize', finishImmediately);
  }
}

const initialRoute = location.hash.slice(1);
if (!['home', 'sobre-mim', 'trabalhos', 'trabalho-01'].includes(initialRoute) || initialRoute === document.getElementById('app')?.dataset.page) {
  window.portfolioIntro.play();
}
