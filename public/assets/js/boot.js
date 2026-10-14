// Runs before the first paint: marks that JavaScript is available and keeps the colour of
// the page transition on screen so the new page appears from it without a flash.
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  // The donation pages take the colours of the app the visitor comes from (?app=capte-cut).
  if (root.hasAttribute('data-theme-query')) {
    var match = /[?&]app=([a-z0-9-]{1,40})(&|$)/.exec(window.location.search);
    if (match) root.setAttribute('data-app', match[1]);
  }
  try {
    var raw = sessionStorage.getItem('jq.wipe');
    if (!raw) return;
    sessionStorage.removeItem('jq.wipe');
    var wipe = JSON.parse(raw);
    if (!wipe || Date.now() - wipe.at > 4000 || !/^#[0-9a-f]{3,8}$/i.test(wipe.color)) return;
    root.style.setProperty('--wipe-color', wipe.color);
    root.classList.add('is-arriving');
  } catch (error) {
    /* storage unavailable: no transition */
  }
})();
