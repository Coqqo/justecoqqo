// ⚙️ Les seuls réglages du site. Remplis les guillemets vides, enregistre, et republie.
window.SITE = {
  // Ton dépôt GitHub, sous la forme 'pseudo/justecoqqo'.
  // Les boutons « Télécharger » pointent vers la dernière version publiée dans ses « Releases ».
  githubRepo: 'Coqqo/justecoqqo',

  // Ta clé PUBLIQUE Stripe (elle commence par pk_live_ ou pk_test_).
  // ⚠️ La clé SECRÈTE (sk_...) ne va JAMAIS ici : elle se met dans Cloudflare (voir le guide).
  stripePublishableKey: 'pk_live_51UQTOH4lhx7f2fRocpBcNrSNPMTb0sK4EwOVNxOjBlExYjJBzTnxUMldMt5S4m2Q7wMedMibHHkVQp9pxH7io3wV00rIhbCdSP',

  // Optionnel : protection anti-robots de la page de don (Cloudflare Turnstile), la « clé de site ».
  turnstileSiteKey: '',

  // Ton compte TikTok. Exemple : 'https://www.tiktok.com/@justecoqqo'
  tiktokUrl: 'https://www.tiktok.com/@justecoqqo',

  // Pour les mentions légales (obligatoires en France)
  publisherName: 'Corentin Cuvelliez',
  contactEmail: '',
};
