// "Toutes les applis" page: the app cards (same as the home page), with versions and counts from the catalogue.
import { fetchCatalog, toast, wireTilt } from './site.js';

document.querySelectorAll('[data-soon]').forEach((button) => {
  button.addEventListener('click', () => {
    toast('Elle arrive bientôt ! Suis justecoqqo sur TikTok pour être prévenu à sa sortie.');
  });
});

document.querySelectorAll('.app-card[data-tilt]').forEach((card) => wireTilt(card, { max: 4, lift: 24 }));

fetchCatalog()
  .then((catalog) => {
    const apps = catalog.apps || [];
    const available = apps.filter((app) => app.status === 'available').length;
    const soon = apps.filter((app) => app.status === 'soon').length;
    if (available) document.querySelector('[data-count-available]').textContent = String(available);
    if (soon) document.querySelector('[data-count-soon]').textContent = String(soon);
    for (const app of apps) {
      const target = document.querySelector(`[data-app-version="${app.id}"]`);
      if (target && app.version) target.textContent = `Version ${app.version}`;
    }
  })
  .catch(() => {});
