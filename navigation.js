(() => {
  const app = document.getElementById('app');
  const pages = window.portfolioPages;
  const intro = window.portfolioIntro;
  if (!app || !pages || !intro) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const hasPage = page => typeof page === 'string' && Object.hasOwn(pages, page);
  let currentPage = app.dataset.page;
  let queuedRoute = null;
  let navigating = false;
  const imageLoads = new Map();

  function pageFromURL(url) {
    const hash = url.hash.slice(1);
    if (hasPage(hash)) return hash;
    return Object.keys(pages).find(key => new URL(pages[key].filename, location.href).pathname === url.pathname);
  }

  function prepareImages(page) {
    const content = document.createElement('template');
    content.innerHTML = pages[page].content;
    return Promise.all([...content.content.querySelectorAll('img')].map(element => {
      const src = new URL(element.getAttribute('src'), location.href).href;
      if (!imageLoads.has(src)) {
        const image = new Image();
        image.src = src;
        imageLoads.set(src, image.decode().catch(() => {}));
      }
      return imageLoads.get(src);
    }));
  }

  function updateMenu(page) {
    const links = [...app.querySelectorAll('.navigation a')];
    const indicator = app.querySelector('.active-underline');
    for (const link of links) {
      const active = new URL(link.href).pathname.endsWith(`/${pages[pages[page].menuPage || page].filename}`);
      link.classList.toggle('current', active);
      if (active) {
        link.setAttribute('aria-current', 'page');
        if (indicator) {
          indicator.src = pages[page].indicator.src;
          indicator.width = pages[page].indicator.width;
          link.append(indicator);
        }
      } else {
        link.removeAttribute('aria-current');
      }
    }
  }

  async function swapPage(page, historyMode) {
    if (page === currentPage) return;
    // Keep the current page on screen until the next page's assets are ready.
    await prepareImages(page);
    await intro.finish({ preserveVisual: true });
    const previous = document.getElementById('page-content');
    const outgoing = getComputedStyle(previous).display === 'contents' ? [...previous.children] : [previous];
    const animations = reducedMotion.matches || !Element.prototype.animate ? [] : outgoing.map(element => element.animate(
      [{ opacity: getComputedStyle(element).opacity, transform: getComputedStyle(element).transform }, { opacity: 0, transform: 'translateY(-6px)' }],
      { duration: 160, easing: 'ease-out', fill: 'forwards' },
    ));
    await Promise.all(animations.map(animation => animation.finished.catch(() => {})));

    const next = document.createElement('main');
    next.id = 'page-content';
    next.className = pages[page].mainClass;
    next.innerHTML = pages[page].content;
    if (!reducedMotion.matches) document.documentElement.classList.add('intro-pending');
    // The header stays mounted: no new document, font reload, or blank frame.
    previous.replaceWith(next);
    animations.forEach(animation => animation.cancel());
    app.className = pages[page].appClass;
    app.dataset.page = page;
    app.dataset.nodeId = pages[page].nodeId;
    document.title = pages[page].title;
    document.querySelector('meta[name="description"]').content = pages[page].description;
    updateMenu(page);
    currentPage = page;

    if (historyMode === 'push') {
      // Local files support hash history without fetching or reopening the HTML.
      const url = location.protocol === 'file:' ? `#${page}` : new URL(pages[page].filename, location.href);
      history.pushState({ ...history.state, portfolioPage: page }, '', url);
    }
    window.scrollTo(0, 0);
    window.dispatchEvent(new CustomEvent('portfolio:pagechange'));
    intro.play();
    next.tabIndex = -1;
    next.focus({ preventScroll: true });
  }

  async function navigate(page, historyMode = 'push') {
    queuedRoute = { page, historyMode };
    if (navigating) return;
    navigating = true;
    try {
      while (queuedRoute) {
        const route = queuedRoute;
        queuedRoute = null;
        await swapPage(route.page, route.historyMode);
      }
    } finally {
      navigating = false;
    }
  }

  app.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('.navigation a, a[data-portfolio-link]');
    if (!link || link.target || link.hasAttribute('download')) return;
    const url = new URL(link.href);
    const page = pageFromURL(url);
    if (!page || url.origin !== location.origin) return;
    event.preventDefault();
    navigate(page);
  });

  window.addEventListener('popstate', event => {
    const page = event.state?.portfolioPage || pageFromURL(new URL(location.href));
    if (hasPage(page)) navigate(page, 'none');
  });

  const initialPage = pageFromURL(new URL(location.href)) || currentPage;
  history.replaceState({ ...history.state, portfolioPage: initialPage }, '');
  if (initialPage !== currentPage) navigate(initialPage, 'none');
  // Warm the small, local set of route assets before the visitor clicks.
  Object.keys(pages).forEach(prepareImages);
})();
