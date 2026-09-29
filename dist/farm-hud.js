// Presentation only: authoritative inventory and plot actions remain in schoolAction.
export function createFarmHud({viewport,selectedInfo,getState,isFarm,selected,labels}){
 const bar=document.createElement('div');bar.className='farm-hud';bar.setAttribute('aria-label','농장 정보');bar.innerHTML='<span data-hud-coins></span><button data-hud-store type="button"></button><button data-hud-goal type="button"></button>';viewport.append(bar,selectedInfo);
 const help=document.querySelector('.first-steps');if(help)viewport.parentElement.after(help);
 const growth=document.querySelector('.farm-progression');if(growth)viewport.after(growth);
 const notice=document.querySelector('.first-harvest-notice');if(notice)viewport.append(notice);
 const status=document.querySelector('#farmerStatus');if(status)viewport.append(status);
 bar.querySelector('[data-hud-store]').onclick=()=>document.querySelector('[data-menu-dest="bag"]').click();
 bar.querySelector('[data-hud-goal]').onclick=()=>{if(growth){growth.open=!growth.open;if(growth.open)growth.scrollIntoView({block:'nearest',behavior:'smooth'})}};
 viewport.classList.add('has-farm-hud');
 function fit(){if(!isFarm())return;const top=viewport.getBoundingClientRect().top+scrollY;viewport.style.setProperty('--play-height',Math.max(300,innerHeight-top-12)+'px');}
 new ResizeObserver(fit).observe(document.querySelector('.compact-tabs'));window.addEventListener('resize',fit);window.addEventListener('village-screen-change',()=>{requestAnimationFrame(fit)});
 function sync(){const farm=isFarm();bar.hidden=!farm;selectedInfo.hidden=!farm||selected()===null;if(!farm)return;const s=getState(),n=s.farm?.picked||0,stored=(s.stock?.[0]||0)+(s.garden?.stock||[]).reduce((a,b)=>a+b,0),next=[6,16,30,50,80].find(v=>v>n);bar.querySelector('[data-hud-coins]').textContent='🪙 '+s.coins;bar.querySelector('[data-hud-store]').textContent='🧺 보관 '+stored+'개';bar.querySelector('[data-hud-goal]').textContent=next?'🌱 다음 목표 '+n+'/'+next:'🌱 수확 '+n+'개';fit();}
 function position(){if(selectedInfo.hidden)return;const all=labels(),target=all[selected()];if(!target)return;const w=viewport.clientWidth,h=viewport.clientHeight,pw=selectedInfo.offsetWidth,ph=selectedInfo.offsetHeight,margin=8,top=bar.offsetTop+bar.offsetHeight+8;const x=parseFloat(target.style.left),y=parseFloat(target.style.top);if(!Number.isFinite(x+y))return;
  const clamp=(v,min,max)=>Math.max(min,Math.min(Math.max(min,max),v));
  const candidates=[[x-pw/2,y-ph-30],[x-pw-34,y-ph/2],[x+34,y-ph/2],[x-pw/2,y+34]].map(([a,b])=>({x:clamp(a,margin,w-pw-margin),y:clamp(b,top,h-ph-28)}));
  for(const c of candidates){c.score=0;for(const l of all){const lx=parseFloat(l.style.left),ly=parseFloat(l.style.top);if(lx>c.x-24&&lx<c.x+pw+24&&ly>c.y-24&&ly<c.y+ph+24)c.score+=l===target?10000:1000}c.score+=Math.hypot(c.x+pw/2-x,c.y+ph/2-y)}
  candidates.sort((a,b)=>a.score-b.score);const best=candidates[0];selectedInfo.style.left=best.x+'px';selectedInfo.style.top=best.y+'px';const side=best.x+pw<x-12?'right':best.x>x+12?'left':best.y+ph<y?'bottom':'top';selectedInfo.dataset.tail=side;selectedInfo.style.setProperty('--tail',clamp(side==='left'||side==='right'?y-best.y:x-best.x,18,(side==='left'||side==='right'?ph:pw)-18)+'px');
 }
 sync();return {sync,position};
}
