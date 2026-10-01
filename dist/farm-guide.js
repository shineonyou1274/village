// Keep onboarding available without occupying the play area after it is read.
(()=>{
 const menu=document.querySelector('.compact-menu-grid');
 const first=document.querySelector('.first-steps');
 const trial=document.querySelector('.trial-guide');
 if(!menu||!first)return;
 const key=()=>`shiny-guide-seen:${window.classroomActive?classroomData?.me?.id||'classroom':'practice'}`;
 if(localStorage.getItem(key())==='seen')first.hidden=true;
 first.addEventListener('toggle',()=>{
  if(first.open){
   if(localStorage.getItem(key())==='seen'&&first.dataset.manual!=='1'){first.open=false;first.hidden=true;return}
   first.dataset.presented='1';
  }else if(first.dataset.presented==='1'){
   localStorage.setItem(key(),'seen');first.hidden=true;first.dataset.manual='';
  }
 });
 const button=document.createElement('button');button.type='button';button.textContent='🌱 처음 시작하는 방법';menu.append(button);
 button.onclick=()=>{
  document.querySelector('.compact-menu')?.close();
  const guide=state?.trial?trial:first;
  if(!guide)return;
  guide.dataset.manual='1';guide.hidden=false;guide.open=true;
  window.scrollTo({top:0,behavior:'instant'});
  guide.querySelector('summary')?.focus();
 };
})();
