/* Installable app: registers the service worker (offline copy of the app, see sw.js).
   'sw.js' is relative, so it works from a GitHub Pages sub-folder, a custom domain or localhost. */
if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost')){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('sw.js',{scope:'./'}).then(reg=>{
      // an installed app can stay open for days: look for a new version whenever it comes back to the screen
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')reg.update().catch(()=>{})});
    }).catch(()=>{});
  });
}
