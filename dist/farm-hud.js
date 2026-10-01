// Presentation only: authoritative inventory and plot actions remain in schoolAction.
export function createFarmHud({viewport,selectedInfo,getState,isFarm,selected,labels}){
 const bar=document.createElement('div');bar.className='farm-hud';bar.setAttribute('aria-label','농장 정보');bar.innerHTML='<button data-hud-store type="button"></button><button data-hud-goal type="button"></button>';viewport.append(bar,selectedInfo);
 const help=document.querySelector('.first-steps');if(help)viewport.parentElement.before(help);
 const trialGuide=document.querySelector('.trial-guide');if(trialGuide)viewport.parentElement.before(trialGuide);
 const growth=document.querySelector('.farm-progression');
 if(growth)growth.open=false;
 const goalCard=document.createElement('section');goalCard.className='farm-goal-popover';goalCard.hidden=true;goalCard.setAttribute('aria-label','다음 농장 목표');goalCard.innerHTML='<button type="button" class="farm-goal-close" aria-label="목표 닫기">×</button><b></b><p></p><progress max="1" value="0"></progress>';viewport.append(goalCard);if(growth)goalCard.append(growth);
 const notice=document.querySelector('.first-harvest-notice');if(notice)viewport.append(notice);
 const status=document.querySelector('#farmerStatus');if(status)viewport.append(status);
 const actionMenu=document.createElement('details');actionMenu.className='farm-action-menu';actionMenu.innerHTML='<summary>시설·확장</summary><div class="farm-action-row" aria-label="농장 기능"></div>';viewport.append(actionMenu);const actions=actionMenu.querySelector('.farm-action-row');
 for(const selector of ['.smart-farm-label','.land-expansion-marker','.ranch-marker']){const button=viewport.querySelector(selector);if(button)actions.append(button)}
 actions.addEventListener('click',event=>{if(event.target.closest('button'))actionMenu.open=false});
 const seeds=document.querySelector('.seed-picker');if(seeds){const picker=document.createElement('details');picker.className='farm-seed-menu';picker.innerHTML='<summary>🌱 씨앗 · 상추</summary>';viewport.append(picker);picker.append(seeds);const caption=picker.querySelector('summary');seeds.addEventListener('click',e=>{const button=e.target.closest('[data-seed]');if(!button||button.disabled)return;caption.textContent='🌱 씨앗 · '+button.firstChild.textContent.trim().split(/\s+/).slice(1).join(' ');picker.open=false});}
 bar.querySelector('[data-hud-store]').onclick=()=>document.querySelector('[data-menu-dest="bag"]').click();
 const goalButton=bar.querySelector('[data-hud-goal]');goalButton.setAttribute('aria-expanded','false');
 function closeGoal(){goalCard.hidden=true;if(growth)growth.open=false;goalButton.setAttribute('aria-expanded','false')}
 goalButton.onclick=()=>{if(!goalCard.hidden){closeGoal();return}document.querySelector('.smart-farm-panel')?.setAttribute('hidden','');goalCard.hidden=false;if(growth)growth.open=true;goalButton.setAttribute('aria-expanded','true')};
 goalCard.querySelector('.farm-goal-close').onclick=closeGoal;
 viewport.classList.add('has-farm-hud');
 function fit(){if(!isFarm())return;const documentTop=viewport.getBoundingClientRect().top+scrollY;viewport.style.setProperty('--play-height',Math.min(680,Math.max(300,innerHeight-documentTop-12))+'px');}
 new ResizeObserver(fit).observe(document.querySelector('.compact-tabs'));window.addEventListener('resize',fit);window.addEventListener('village-screen-change',()=>{requestAnimationFrame(fit)});
 function sync(){const farm=isFarm();bar.hidden=!farm;selectedInfo.hidden=!farm||selected()===null;if(!farm){closeGoal();if(growth)growth.open=false;return}const s=getState(),n=s.farm?.picked||0,stored=(s.stock?.[0]||0)+(s.garden?.stock||[]).reduce((a,b)=>a+b,0),milestones=[6,16,30,50,80],names=['당근','토마토','감자','딸기','젖소'],index=milestones.findIndex(v=>v>n),next=milestones[index];bar.querySelector('[data-hud-store]').textContent='🧺 보관 '+stored+'개';goalButton.textContent=next?'🌱 다음 목표 '+n+'/'+next:'🌱 수확 '+n+'개';goalCard.querySelector('b').textContent=next?'다음은 '+names[index]+' · 수확 '+(next-n)+'개 남음':s.cow?'젖소 돌봄이 열렸어요':'젖소 입양이 열렸어요';goalCard.querySelector('p').textContent=next?'누적 수확 '+n+'/'+next+'개. 새 씨앗은 지금 쓰는 빈 밭에 심어요.':s.cow?'목장에서 먹이와 물을 챙겨 주세요.':'누적 수확 80개와 100코인으로 입양할 수 있어요.';goalCard.querySelector('progress').max=next||80;goalCard.querySelector('progress').value=Math.min(n,next||80);fit();}
 function position(){if(selectedInfo.hidden)return;const all=labels(),target=all[selected()];if(!target)return;const w=viewport.clientWidth,h=viewport.clientHeight,pw=selectedInfo.offsetWidth,ph=selectedInfo.offsetHeight,margin=8,top=bar.offsetTop+bar.offsetHeight+8;const x=parseFloat(target.style.left),y=parseFloat(target.style.top);if(!Number.isFinite(x+y))return;
  const clamp=(v,min,max)=>Math.max(min,Math.min(Math.max(min,max),v));
  if(selectedInfo.classList.contains('is-working')){selectedInfo.style.left=clamp(w-pw-margin,margin,w-pw-margin)+'px';selectedInfo.style.top=clamp(top+47,top,h-ph-28)+'px';selectedInfo.dataset.tail='none';return}
  const candidates=[[x-pw/2,y-ph-30],[x-pw-34,y-ph/2],[x+34,y-ph/2],[x-pw/2,y+34],[x-pw-150,y-ph/2],[x+150,y-ph/2],[x-pw/2,y-ph-90],[x-pw/2,y+90],[x+115,y-ph-70],[x-pw-115,y-ph-70]].map(([a,b])=>({x:clamp(a,margin,w-pw-margin),y:clamp(b,top,h-ph-28)}));
  const host=viewport.getBoundingClientRect();
  for(const c of candidates){c.score=0;for(const l of all){if(l===target)continue;const r=l.getBoundingClientRect(),lx=r.left-host.left,ly=r.top-host.top,rx=r.right-host.left,by=r.bottom-host.top;const overlap=Math.max(0,Math.min(c.x+pw,rx)-Math.max(c.x,lx))*Math.max(0,Math.min(c.y+ph,by)-Math.max(c.y,ly));c.score+=overlap*5}c.score+=Math.hypot(c.x+pw/2-x,c.y+ph/2-y)}
  candidates.sort((a,b)=>a.score-b.score);const best=candidates[0];selectedInfo.style.left=best.x+'px';selectedInfo.style.top=best.y+'px';const side=best.x+pw<x-12?'right':best.x>x+12?'left':best.y+ph<y?'bottom':'top';selectedInfo.dataset.tail=side;selectedInfo.style.setProperty('--tail',clamp(side==='left'||side==='right'?y-best.y:x-best.x,18,(side==='left'||side==='right'?ph:pw)-18)+'px');
 }
 sync();return {sync,position};
}
