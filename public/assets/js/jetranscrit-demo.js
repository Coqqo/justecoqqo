// The jetranscrit page: a conversation that writes itself, voice by voice, in a loop.
import { reducedMotion } from './site.js';

const VOICES = {
  lea: { name: 'Léa', color: '#ff6b4a' },
  hugo: { name: 'Hugo', color: '#4a8bff' },
  invitee: { name: 'Invitée', color: '#2fbf8f' },
};

const SCRIPT = [
  ['lea', 0, "Aujourd'hui, on parle de ce qui prend le plus de temps au montage."],
  ['hugo', 6, 'Les sous-titres. Je les tape encore à la main, phrase par phrase.'],
  ['invitee', 12, 'Et retrouver la phrase exacte dans une heure de rush…'],
  ['lea', 17, "Maintenant, tu récupères tout le texte d'un coup, avec qui parle à quel moment."],
  ['hugo', 24, 'Et je peux exporter seulement ce que dit notre invitée ?'],
  ['lea', 28, 'Oui, voix par voix. Texte, Word ou sous-titres.'],
];

const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const demo = (root) => {
  if (!root) return;
  const list = root.querySelector('[data-jt-lines]');
  const wave = root.querySelector('[data-jt-wave]');
  const time = root.querySelector('[data-jt-time]');
  const bars = Array.from({ length: 120 }, (_, i) => {
    const bar = document.createElement('i');
    bar.style.height = `${6 + Math.abs(Math.sin(i * 0.7) * 14 + Math.sin(i * 0.23) * 6)}px`;
    wave.append(bar);
    return bar;
  });

  const line = (voiceId, seconds) => {
    const voice = VOICES[voiceId];
    const item = document.createElement('li');
    item.className = 'jt-line';
    item.style.setProperty('--voice', voice.color);
    const stamp = document.createElement('time');
    stamp.textContent = clock(seconds);
    const chip = document.createElement('span');
    chip.className = 'jt-chip';
    chip.textContent = voice.name;
    const text = document.createElement('div');
    text.className = 'jt-text';
    item.append(stamp, chip, text);
    list.append(item);
    return text;
  };

  if (reducedMotion) {
    for (const [voice, seconds, words] of SCRIPT) line(voice, seconds).textContent = words;
    return;
  }

  let visible = false;
  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { threshold: 0.2 }).observe(root);

  const play = async () => {
    for (;;) {
      list.replaceChildren();
      for (const [index, [voiceId, seconds, words]] of SCRIPT.entries()) {
        while (!visible) await wait(300);
        time.textContent = clock(seconds);
        const lit = Math.round(((index + 1) / SCRIPT.length) * bars.length);
        bars.forEach((bar, i) => {
          bar.classList.toggle('on', i < lit);
          if (i < lit && i >= Math.round((index / SCRIPT.length) * bars.length)) bar.style.setProperty('--voice', VOICES[voiceId].color);
        });
        const text = line(voiceId, seconds);
        const caret = document.createElement('span');
        caret.className = 'caret';
        const parts = words.split(' ');
        for (let i = 0; i < parts.length; i++) {
          text.textContent = parts.slice(0, i + 1).join(' ');
          text.append(caret);
          await wait(70 + Math.random() * 60);
        }
        caret.remove();
        await wait(650);
      }
      await wait(3200);
      bars.forEach((bar) => bar.classList.remove('on'));
    }
  };
  play();
};

demo(document.querySelector('[data-jt-demo]'));
