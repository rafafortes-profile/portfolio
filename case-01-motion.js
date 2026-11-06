(() => {
  let dispose = () => {};

  function initializeRewardDemos() {
    dispose();
    dispose = () => {};
    const demos = [...document.querySelectorAll('[data-reward-demo]')];
    if (!demos.length) return;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const states = new Map(demos.map(demo => [demo, {
      video: demo.querySelector('[data-reward-video]'),
      button: demo.querySelector('[data-reward-toggle]'),
      visible: false,
      paused: false,
      manualPlay: false,
    }]));

    const shouldPlay = state => !controller.signal.aborted && state.visible && !document.hidden && !state.paused && (!reducedMotion.matches || state.manualPlay);
    function syncButton(state) {
      const running = !state.video.paused;
      state.button.textContent = running ? 'Pausar animação' : 'Reproduzir animação';
      state.button.setAttribute('aria-label', `${running ? 'Pausar' : 'Reproduzir'} animação do aumento de limite`);
      state.button.setAttribute('aria-pressed', String(running));
    }
    function update(state) {
      if (shouldPlay(state)) {
        // Autoplay may be denied; keep a working manual play button in that case.
        const playback = state.video.play();
        playback?.then(() => {
          if (!shouldPlay(state)) state.video.pause();
          syncButton(state);
        }, () => syncButton(state));
      } else {
        state.video.pause();
      }
      syncButton(state);
    }

    const observer = window.IntersectionObserver ? new IntersectionObserver(entries => {
      entries.forEach(({target, isIntersecting}) => {
        const state = states.get(target);
        state.visible = isIntersecting;
        update(state);
      });
    }, { threshold: .15 }) : null;
    states.forEach((state, demo) => {
      state.video.muted = true;
      state.video.addEventListener('play', () => {
        if (!shouldPlay(state)) state.video.pause();
        syncButton(state);
      }, options);
      state.video.addEventListener('pause', () => syncButton(state), options);
      state.button.addEventListener('click', () => {
        state.paused = !state.video.paused;
        state.manualPlay = !state.paused;
        update(state);
      }, options);
      if (observer) observer.observe(demo);
      else { state.visible = true; update(state); }
    });
    reducedMotion.addEventListener('change', () => {
      states.forEach(state => { state.manualPlay = false; update(state); });
    }, options);
    document.addEventListener('visibilitychange', () => states.forEach(update), options);
    dispose = () => {
      observer?.disconnect();
      controller.abort();
      states.forEach(state => { state.video.pause(); syncButton(state); });
    };
  }

  window.addEventListener('portfolio:pagechange', initializeRewardDemos);
  initializeRewardDemos();
})();
