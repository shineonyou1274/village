// Keep the legacy fallback out of the first paint until scene and account settle.
(()=>{
const ready=new Set();let finished=false;
function show(){if(finished)return;finished=true;document.documentElement.classList.remove('village-loading');clearTimeout(timeout);}
window.villageBootReady=part=>{ready.add(part);if(ready.has('scene')&&ready.has('account'))requestAnimationFrame(show)};
const timeout=setTimeout(show,22000);
window.addEventListener('error',event=>{if(event.target?.tagName==='SCRIPT'||event.message)window.villageBootReady('scene')},true);
window.addEventListener('pageshow',event=>{if(event.persisted)show()});
})();
