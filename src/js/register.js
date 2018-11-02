/**
 * If no serviceworker, call sw.js to install
 */
document.addEventListener('DOMContentLoaded', (event) => {
  if (navigator.serviceWorker) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js').then(function(registration) {
        // Registration was successful
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      }, function(err) {
        console.log('ServiceWorker registration failed: ', err);
      });
    });
  }
});
