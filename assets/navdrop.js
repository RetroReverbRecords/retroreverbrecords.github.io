/* © 2018–2026 Retro Reverb Records. All rights reserved. */
/* Top menu: close the Directory dropdown when clicking elsewhere or pressing Escape. */
(function () {
  function closeAll(except) {
    document.querySelectorAll('details.navdrop[open]').forEach(function (d) { if (d !== except) d.removeAttribute('open'); });
  }
  document.addEventListener('click', function (e) { closeAll(e.target.closest ? e.target.closest('details.navdrop') : null); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(null); });
})();
