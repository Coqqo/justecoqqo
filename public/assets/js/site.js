// Shared behaviour for every page: settings, links, reveals, page transitions, small effects.

import { offerReport, setupReports } from './report.js';

export const SITE = Object.freeze({ ...(window.SITE || {}) });

// "Prévenir Coqqo de l'incident": problems on the site go to the "site" Discord channel
setupReports({
  app: 'site',
  accent: '#8b6dff',
  send: async (payload) => {
    const response = await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(String(response.status));
  },
});
export { offerReport };
if (/introuvable/i.test(document.title)) setTimeout(() => offerReport(`Page introuvable : ${location.pathname}`, { where: 'page introuvable', quiet: true }), 900);
export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Where the installers are downloaded from: the latest GitHub release, or /downloads/ before it exists. */
export const downloadUrl = (file) => {
  const repo = String(SITE.githubRepo || '').trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/+$/, '');
  if (/^[\w.-]+\/[\w.-]+$/.test(repo)) return `https://github.com/${repo}/releases/latest/download/${encodeURIComponent(file)}`;
  return `/downloads/${encodeURIComponent(file)}`;
};

export const fetchCatalog = (() => {
  let pending = null;
  return () => {
    pending ??= fetch('/apps.json', { cache: 'no-cache' })
      .then((response) => (response.ok ? response.json() : { apps: [] }))
      .catch(() => ({ apps: [] }));
    return pending;
  };
})();

/* ------------------------------------------------------------------ toast */

let toastTimer = 0;
export const toast = (message) => {
  let element = document.querySelector('.toast');
  if (!element) {
    element = document.createElement('div');
    element.className = 'toast';
    element.setAttribute('role', 'status');
    document.body.append(element);
  }
  element.textContent = message;
  requestAnimationFrame(() => element.classList.add('is-on'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('is-on'), 3600);
};

/* ------------------------------------------------------------------ page transitions */

/** Covers the screen with a circle of `color` growing from (x, y), then opens `href`. */
export const transitionTo = (href, color, x = window.innerWidth / 2, y = window.innerHeight / 2) => {
  if (reducedMotion) {
    window.location.href = href;
    return;
  }
  const wipe = document.createElement('div');
  wipe.className = 'page-wipe';
  wipe.style.setProperty('--wipe', color);
  wipe.style.setProperty('--x', `${Math.round(x)}px`);
  wipe.style.setProperty('--y', `${Math.round(y)}px`);
  document.body.append(wipe);
  try {
    sessionStorage.setItem('jq.wipe', JSON.stringify({ color, at: Date.now() }));
  } catch {
    /* no storage: the next page simply appears */
  }
  requestAnimationFrame(() => requestAnimationFrame(() => wipe.classList.add('is-on')));
  setTimeout(() => {
    window.location.href = href;
  }, 640);
};

const finishArrival = () => {
  const root = document.documentElement;
  if (!root.classList.contains('is-arriving')) return;
  root.classList.replace('is-arriving', 'is-leaving-arrival');
  setTimeout(() => root.classList.remove('is-leaving-arrival'), 900);
};

// Coming back with the browser's back button restores the page as it was left: remove the wipe.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) document.querySelectorAll('.page-wipe').forEach((wipe) => wipe.remove());
});

/* ------------------------------------------------------------------ wiring */

const wireLinks = () => {
  document.querySelectorAll('[data-download]').forEach((link) => {
    link.href = downloadUrl(link.dataset.download);
  });

  document.querySelectorAll('[data-tiktok]').forEach((link) => {
    if (SITE.tiktokUrl && /^https:\/\//.test(SITE.tiktokUrl)) link.href = SITE.tiktokUrl;
    else link.hidden = true;
  });

  document.querySelectorAll('[data-fill]').forEach((element) => {
    const value = SITE[element.dataset.fill];
    if (value) element.textContent = value;
  });

  document.querySelectorAll('[data-year]').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  // Links that open another page with a colour transition.
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-wipe]');
    if (!link || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
    event.preventDefault();
    let { clientX: x, clientY: y } = event;
    if (!x && !y) {
      // opened with the keyboard: grow from the middle of the link
      const rect = link.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }
    transitionTo(link.href, link.dataset.wipe, x, y);
  });
};

const wireHeader = () => {
  const header = document.querySelector('[data-header]');
  if (!header) return;
  const darkZones = [...document.querySelectorAll('[data-dark-zone]')];
  const alwaysDark = header.dataset.header === 'dark' || getComputedStyle(document.documentElement).colorScheme === 'dark';
  const update = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 24);
    const probe = header.getBoundingClientRect().top + 24;
    const overDark = alwaysDark || darkZones.some((zone) => {
      const rect = zone.getBoundingClientRect();
      return rect.top <= probe && rect.bottom >= probe;
    });
    header.classList.toggle('on-dark', overDark);
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
};

const wireReveals = () => {
  const items = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) || reducedMotion) {
    items.forEach((item) => item.classList.add('is-in'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  items.forEach((item) => observer.observe(item));
};

// A soft light that follows the pointer on cards.
const wireSpotlights = () => {
  if (!finePointer) return;
  document.querySelectorAll('[data-spotlight]').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      card.style.setProperty('--my', `${event.clientY - rect.top}px`);
    });
  });
};

// 3D tilt that follows the pointer.
export const wireTilt = (element, { max = 7, lift = 0 } = {}) => {
  if (!finePointer || reducedMotion || !element) return;
  let frame = 0;
  let target = { x: 0, y: 0 };
  let current = { x: 0, y: 0 };
  const step = () => {
    current.x += (target.x - current.x) * 0.12;
    current.y += (target.y - current.y) * 0.12;
    element.style.setProperty('--rx', `${(-current.y * max).toFixed(3)}deg`);
    element.style.setProperty('--ry', `${(current.x * max).toFixed(3)}deg`);
    element.style.setProperty('--lift', `${(lift * (Math.abs(current.x) + Math.abs(current.y))).toFixed(2)}px`);
    if (Math.abs(target.x - current.x) > 0.001 || Math.abs(target.y - current.y) > 0.001) frame = requestAnimationFrame(step);
    else frame = 0;
  };
  const kick = () => {
    if (!frame) frame = requestAnimationFrame(step);
  };
  element.addEventListener('pointermove', (event) => {
    const rect = element.getBoundingClientRect();
    target = { x: (event.clientX - rect.left) / rect.width - 0.5, y: (event.clientY - rect.top) / rect.height - 0.5 };
    kick();
  });
  element.addEventListener('pointerleave', () => {
    target = { x: 0, y: 0 };
    kick();
  });
};

/** Pauses autoplaying videos that are out of view, and wires their play/pause button. */
export const wireVideo = (video, button) => {
  if (!video) return;
  if (reducedMotion) {
    video.removeAttribute('autoplay');
    video.pause();
  }
  const sync = () => {
    if (!button) return;
    const playing = !video.paused;
    button.setAttribute('aria-label', playing ? 'Mettre la vidéo en pause' : 'Lire la vidéo');
    button.dataset.state = playing ? 'playing' : 'paused';
  };
  let userPaused = reducedMotion;
  button?.addEventListener('click', () => {
    if (video.paused) {
      userPaused = false;
      video.play().catch(() => {});
    } else {
      userPaused = true;
      video.pause();
    }
  });
  video.addEventListener('play', sync);
  video.addEventListener('pause', sync);
  sync();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !userPaused) video.play().catch(() => {});
      else if (!entry.isIntersecting) video.pause();
    }, { threshold: 0.15 }).observe(video);
  }
};

wireLinks();
wireHeader();
wireReveals();
wireSpotlights();
requestAnimationFrame(() => requestAnimationFrame(finishArrival));
