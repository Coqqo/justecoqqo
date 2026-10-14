// App page: presentation video, moving waveform, 3D before/after timeline, tutorial player.
import { fetchCatalog, reducedMotion, wireTilt, wireVideo } from './site.js';

const APP_ID = document.body.dataset.app;

/* ------------------------------------------------------------------ helpers */

const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const whenVisible = (element, callback, options = { threshold: 0.01 }) => {
  if (!('IntersectionObserver' in window)) {
    callback(true);
    return;
  }
  new IntersectionObserver(([entry]) => callback(entry.isIntersecting), options).observe(element);
};

const css = (name) => getComputedStyle(document.body).getPropertyValue(name).trim();

/* ------------------------------------------------------------------ hero */

wireTilt(document.querySelector('[data-tilt]'), { max: 6 });
wireVideo(document.querySelector('.app-video'), document.querySelector('[data-video-toggle]'));

fetchCatalog().then((catalog) => {
  const app = catalog.apps?.find((entry) => entry.id === APP_ID);
  if (!app?.version) return;
  document.querySelectorAll('[data-app-version]').forEach((element) => {
    element.textContent = app.version;
  });
});

// A waveform that scrolls slowly behind the presentation, like a timeline being played.
const waveField = (canvas) => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const random = mulberry32(11);
  const bars = [];
  while (bars.length < 1600) {
    const word = 6 + Math.floor(random() * 26);
    const loud = 0.45 + random() * 0.55;
    for (let k = 0; k < word; k++) {
      const shape = Math.sin((Math.PI * (k + 0.5)) / word) ** 0.7;
      bars.push({ a: loud * shape * (0.55 + random() * 0.45), blank: false });
    }
    const pause = random() < 0.3 ? 9 + Math.floor(random() * 16) : 1 + Math.floor(random() * 3);
    for (let k = 0; k < pause; k++) bars.push({ a: 0.03 + random() * 0.05, blank: pause > 8 });
  }
  const SPACING = 7;
  const accent = css('--accent') || '#ff4f6d';
  const wave = css('--wave') || '#dfe6ff';
  let width = 0;
  let height = 0;
  let offset = 0;
  let visible = true;
  let frame = 0;
  let last = performance.now();

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    const mid = height * 0.56;
    const amp = Math.min(height * 0.3, 260);
    const playhead = width * 0.5;
    const first = Math.floor(offset / SPACING);
    const shift = offset - first * SPACING;
    const count = Math.ceil(width / SPACING) + 2;
    let blankStart = null;
    const flushBlank = (endX) => {
      if (blankStart === null) return;
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.07;
      ctx.beginPath();
      ctx.roundRect(blankStart, mid - amp * 0.42, endX - blankStart, amp * 0.84, 10);
      ctx.fill();
      blankStart = null;
    };
    for (let i = 0; i < count; i++) {
      const bar = bars[(first + i) % bars.length];
      const x = i * SPACING - shift;
      if (bar.blank && blankStart === null) blankStart = x - 2;
      if (!bar.blank) flushBlank(x - 2);
      const h = Math.max(2, bar.a * amp);
      ctx.fillStyle = bar.blank ? accent : wave;
      ctx.globalAlpha = bar.blank ? 0.35 : x < playhead ? 0.22 : 0.09;
      ctx.beginPath();
      ctx.roundRect(x, mid - h / 2, 3, h, 1.5);
      ctx.fill();
    }
    flushBlank(width);
    ctx.globalAlpha = 1;
  };

  const tick = (now) => {
    frame = 0;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    offset += dt * 26;
    draw();
    if (visible && !reducedMotion) frame = requestAnimationFrame(tick);
  };

  resize();
  draw();
  new ResizeObserver(() => {
    resize();
    draw();
  }).observe(canvas);
  whenVisible(canvas, (isVisible) => {
    visible = isVisible && !document.hidden;
    if (visible && !frame && !reducedMotion) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  });
};

waveField(document.querySelector('.wave-field'));

/* ------------------------------------------------------------------ before / after timeline */

const DEMO = [
  ['clip', 3.2], ['blank', 0.9], ['clip', 2.4], ['blank', 1.4], ['clip', 4.1],
  ['blank', 0.7], ['clip', 2.0], ['blank', 1.6], ['clip', 3.0], ['blank', 1.1], ['clip', 2.6],
];

const svgBars = (random, count, { min = 0.15, max = 1, steady = false } = {}) => {
  const width = 100;
  const step = width / count;
  let rects = '';
  for (let i = 0; i < count; i++) {
    const envelope = steady ? 0.55 + 0.25 * Math.sin(i * 0.9) : Math.sin((Math.PI * (i + 0.5)) / count) ** 0.5;
    const h = Math.max(min, envelope * (min + random() * (max - min))) * 100;
    rects += `<rect x="${(i * step + step * 0.2).toFixed(2)}" y="${((100 - h) / 2).toFixed(2)}" width="${(step * 0.55).toFixed(2)}" height="${h.toFixed(2)}" rx="0.6"/>`;
  }
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${rects}</svg>`;
};

const buildTimeline = (scene) => {
  if (!scene) return;
  const random = mulberry32(5);
  const lanes = scene.querySelectorAll('.tl-lane');
  const blanks = DEMO.filter(([type]) => type === 'blank');
  const saved = blanks.reduce((sum, [, d]) => sum + d, 0);

  lanes.forEach((lane) => {
    const kind = lane.dataset.lane;
    const strip = lane.querySelector('.tl-strip');
    strip.innerHTML = '';
    DEMO.forEach(([type, duration], index) => {
      const seg = document.createElement('div');
      seg.style.setProperty('--w', String(duration));
      if (kind === 'music') {
        // the music is one continuous clip: it simply gets shorter
        seg.className = `tl-seg music ${type === 'blank' ? 'gone' : ''}`;
        seg.innerHTML = svgBars(random, Math.round(duration * 9), { min: 0.25, max: 0.6, steady: true });
      } else if (type === 'clip') {
        seg.className = 'tl-seg clip';
        seg.innerHTML = svgBars(random, Math.round(duration * 11), { min: 0.12, max: kind === 'voice' ? 1 : 0.7 });
      } else {
        seg.className = 'tl-seg blank';
        if (kind === 'voice') seg.dataset.label = `${String(duration).replace('.', ',')} s`;
      }
      seg.dataset.index = String(index);
      strip.append(seg);
    });
  });

  const count = scene.parentElement.querySelector('[data-tl-count]');
  const savedLabel = scene.parentElement.querySelector('[data-tl-saved]');
  const buttons = scene.parentElement.querySelectorAll('[data-view]');
  let auto = !reducedMotion;
  let loop = 0;

  const show = (view) => {
    scene.classList.toggle('is-after', view === 'after');
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
    count.textContent = String(blanks.length);
    savedLabel.textContent = view === 'after' ? `${saved.toFixed(1).replace('.', ',')} s` : '0 s';
  };
  show('before');

  buttons.forEach((button) =>
    button.addEventListener('click', () => {
      auto = false;
      clearInterval(loop);
      show(button.dataset.view);
    }),
  );

  // Scroll drives the tilt: the board lies down, then faces you.
  const board = scene;
  const onScroll = () => {
    const rect = board.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh - rect.top) / (vh * 0.75)));
    board.style.setProperty('--p', (reducedMotion ? 1 : p).toFixed(3));
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  whenVisible(
    scene,
    (visible) => {
      clearInterval(loop);
      if (!visible || !auto) return;
      let after = scene.classList.contains('is-after');
      loop = setInterval(() => {
        after = !after;
        show(after ? 'after' : 'before');
      }, 3200);
    },
    { threshold: 0.5 },
  );
};

buildTimeline(document.querySelector('[data-timeline]'));

/* ------------------------------------------------------------------ tutorials */

const tutorials = async () => {
  const list = document.querySelector('[data-playlist]');
  if (!list) return;
  const frame = document.querySelector('.player-frame');
  const video = document.querySelector('.player-video');
  const title = document.querySelector('[data-player-title]');
  const desc = document.querySelector('[data-player-desc]');
  const step = document.querySelector('[data-player-step]');
  const filters = document.querySelectorAll('[data-filter]');

  let tutos = [];
  try {
    const response = await fetch(`/${APP_ID}/tutos.json`, { cache: 'no-cache' });
    tutos = (await response.json()).tutos || [];
  } catch {
    title.textContent = 'Les tutos arrivent bientôt.';
    return;
  }
  if (!tutos.length) {
    title.textContent = 'Les tutos arrivent bientôt.';
    return;
  }

  const buttons = new Map();
  tutos.forEach((tuto, index) => {
    const item = document.createElement('li');
    item.dataset.group = tuto.group;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.id = tuto.id;
    button.innerHTML = `
      <span class="pl-thumb ${tuto.format === 'tall' ? 'tall' : ''}">
        <img src="${tuto.poster}" alt="" loading="lazy" width="264" height="165">
        ${tuto.duration ? `<span class="pl-dur">${tuto.duration}</span>` : ''}
        <span class="pl-now"><span><i></i><i></i><i></i></span></span>
      </span>
      <span class="pl-text">
        <span class="pl-num">TUTO ${String(index + 1).padStart(2, '0')}</span>
        <span class="pl-title"></span>
        <span class="pl-desc"></span>
      </span>`;
    button.querySelector('.pl-title').textContent = tuto.title;
    button.querySelector('.pl-desc').textContent = tuto.desc;
    button.querySelector('img').addEventListener('error', (event) => event.target.remove(), { once: true });
    button.addEventListener('click', () => select(tuto.id, { play: true }));
    item.append(button);
    list.append(item);
    buttons.set(tuto.id, button);
  });

  let current = null;
  function select(id, { play = false } = {}) {
    const index = tutos.findIndex((tuto) => tuto.id === id);
    if (index < 0) return;
    const tuto = tutos[index];
    current = tuto;
    frame.dataset.format = tuto.format;
    video.poster = tuto.poster;
    video.src = tuto.src;
    title.textContent = tuto.title;
    desc.textContent = tuto.desc;
    step.textContent = `Tuto ${String(index + 1).padStart(2, '0')} sur ${String(tutos.length).padStart(2, '0')}`;
    buttons.forEach((button, key) => button.setAttribute('aria-current', String(key === id)));
    if (play) video.play().catch(() => {});
  }

  const visibleTutos = () => tutos.filter((tuto) => !buttons.get(tuto.id).parentElement.hidden);

  video.addEventListener('ended', () => {
    const shown = visibleTutos();
    const next = shown[shown.findIndex((tuto) => tuto.id === current?.id) + 1];
    if (next) select(next.id, { play: true });
  });

  filters.forEach((button) =>
    button.addEventListener('click', () => {
      const group = button.dataset.filter;
      filters.forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
      list.querySelectorAll('li').forEach((item) => {
        item.hidden = group !== 'all' && item.dataset.group !== group;
      });
      const shown = visibleTutos();
      if (shown.length && !shown.includes(current)) select(shown[0].id);
    }),
  );

  // Deep links: /capte-cut/#tuto-reglages or /capte-cut/?tuto=reglages
  const wanted = new URLSearchParams(window.location.search).get('tuto') || window.location.hash.replace(/^#tuto-/, '');
  const start = tutos.find((tuto) => tuto.id === wanted) || tutos.find((tuto) => tuto.group !== 'installer') || tutos[0];
  select(start.id);
  if (wanted && start.id === wanted) {
    requestAnimationFrame(() => document.getElementById('tutos')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }));
  }
};

tutorials();
