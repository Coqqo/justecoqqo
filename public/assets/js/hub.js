// Home page: hero video, app cards, "coming soon" card.
import { toast, wireTilt, wireVideo } from './site.js';

wireVideo(document.querySelector('.hero-video'), document.querySelector('[data-video-toggle]'));

document.querySelectorAll('[data-soon]').forEach((button) => {
  button.addEventListener('click', () => {
    toast('Elle arrive bientôt ! Suis justecoqqo sur TikTok pour être prévenu à sa sortie.');
  });
});

// each app card leans a little towards the pointer
document.querySelectorAll('.app-card[data-tilt]').forEach((card) => wireTilt(card, { max: 4, lift: 24 }));
