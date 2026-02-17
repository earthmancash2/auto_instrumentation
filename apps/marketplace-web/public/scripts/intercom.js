/**
 * Fake Intercom script
 * Loaded in _document.tsx
 */

(function() {
  console.log('[Intercom Public Script] Initializing...');

  window.Intercom = function() {
    console.log('[Intercom]', Array.from(arguments));
  };

  window.Intercom('boot', {
    app_id: 'fake_intercom_app_id',
  });
})();
