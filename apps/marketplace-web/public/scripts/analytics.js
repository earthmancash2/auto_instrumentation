/**
 * Fake Analytics script
 * Loaded in _document.tsx
 */

(function() {
  console.log('[GA Public Script] Initializing...');

  window.ga = function() {
    console.log('[GA]', Array.from(arguments));
  };

  window.ga('create', 'GA-FAKE-12345', 'auto');
  window.ga('send', 'pageview');
})();
