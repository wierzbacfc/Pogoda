/**
 * PWA Service Worker registration controller.
 */

const PWA = {
  register() {
    if ('serviceWorker' in navigator) {
      if (document.readyState === 'complete') {
        this._registerSW();
      } else {
        window.addEventListener('load', () => this._registerSW());
      }
    }
  },

  _registerSW() {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        console.log('[PWA] Service Worker registered successfully with scope:', reg.scope);
      })
      .catch(err => {
        console.error('[PWA] Service Worker registration failed:', err);
      });
  }
};
