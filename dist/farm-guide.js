// Optional help lives on the map. No gameplay or account state changes.
(()=>{
 const menu=document.querySelector('.compact-menu-grid');
 const first=document.querySelector('.first-steps'),trial=document.querySelector('.trial-guide');
 if(!menu||!first)return;
 for(const guide of [first,trial].filter(Boolean)){
  guide.open=false;
  guide.querySelector('summary').textContent=guide===trial?'? 처음 시작하는 방법':'? 마을 길잡이';
  guide.addEventListener('keydown',e=>{if(e.key==='Escape'){guide.open=false;guide.querySelector('summary').focus()}});
 }
 const button=document.createElement('button');button.type='button';button.textContent='🌱 처음 시작하는 방법';menu.append(button);
 button.onclick=()=>{
  document.querySelector('.compact-menu')?.close();
  window.villageNavigate?.('farm');
  const guide=state?.trial?trial:first;if(!guide)return;
  guide.dataset.manual='1';guide.hidden=false;guide.open=true;
  guide.querySelector('summary')?.focus();
 };
})();
