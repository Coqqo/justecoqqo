# justecoqqo.fr

Le site vitrine des applis gratuites justecoqqo.

- `public/` : le site (HTML, CSS, JS, vidéos, `apps.json` lu par le site et par le launcher).
- `api/donation.js` : la petite fonction (Vercel) qui prépare un paiement Stripe pour les dons.
  (`functions/api/donation.js` est la même pour Cloudflare Pages, si un jour tu changes d'hébergeur.)
- `outils/serveur-local.ps1` : lance le site sur un PC Windows (voir « Lancer le site.bat »).

## Réglages

Tout se règle dans `public/assets/config.js` (dépôt GitHub des installateurs, clé publique Stripe, TikTok,
mentions légales). La clé secrète Stripe se met uniquement dans Vercel :
Projet > Settings > Environment Variables > `STRIPE_SECRET_KEY`.

## Mise en ligne

Vercel, relié à ce dépôt GitHub : Framework preset « Other », rien d'autre à régler (voir `vercel.json`).
Chaque envoi sur la branche `main` republie le site.

Les installateurs (`Capte-Cut-Setup.exe`, `justecoqqo-Setup.exe`) sont dans les Releases de ce dépôt :
les boutons « Télécharger » du site pointent vers la dernière Release.
