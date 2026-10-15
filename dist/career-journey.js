// Presentation only. Reads existing saved activity; never grants items or server badges.
(()=>{
 const farm=!!document.querySelector('#farmScene');
 let route=null,intro=null,key='',record={},snapshot=null,selectedStep=null;
 const sum=a=>(a||[]).reduce((n,v)=>n+(Number(v)||0),0);
 const get=()=>farm&&window.classroomActive?state:null;
 const persist=()=>{try{localStorage.setItem(key,JSON.stringify(record))}catch{}};
 function read(){
  const s=get();if(!s)return null;
  const next='shiny-journey-ui-v1:'+classroomData.room.id+':'+classroomData.me.id;
  if(next!==key){key=next;try{record=JSON.parse(localStorage.getItem(key)||'{}')}catch{record={}}snapshot=null;selectedStep=null;intro?.close()}
  const old=JSON.stringify(record),history=s.history||[];
  record.traded=!!record.traded||history.some(t=>/교환했어요|교환 성사/.test(t));
  record.gift=!!record.gift||history.some(t=>/나눴어요/.test(t));
  const helper=classroomData.mission?.helpers?.find(h=>h.actor===classroomData.me.id);
  const food=Object.entries(helper?.work||{}).some(([k,v])=>Number(k)>=4&&v>0);
  record.contributed=!!record.contributed||sum(s.donated)>0||sum(s.garden?.given)>0||food||history.some(t=>/기부했어요|보탰어요/.test(t));
  const produced=Math.max(s.dailyProduction||0,s.harvest||0);
  record.production=Math.max(record.production||0,produced);
  record.produced=!!record.produced||produced>0||!!s.waterWork?.harvested||!!s.cow?.milkDay||history.some(t=>/생산물을 만들|우유 2개를 모|물고기 2개/.test(t));
  if(old!==JSON.stringify(record))persist();
  return s;
 }
 function stamps(base){
  const s=read();if(!s)return base;
  const savedFirst=base.find(b=>b.id==='first-harvest'),picked=s.farm?.picked||0;
  const first={id:'first-harvest',title:'첫 수확',reason:'내 밭에서 작물 수확',target:1,...savedFirst,value:Math.max(savedFirst?.value||0,picked),earned:savedFirst?.earned||picked>0};
  const defs=[['first-trade','첫 교환','다른 직업 친구와 물건 교환',Number(!!record.traded),1],['first-gift','첫 나눔','친구가 내 나눔 제안을 받기',Number(!!record.gift),1],['table-contribution','공동 식탁 기여','공동 식탁·도시락에 재료 보태기',Number(!!record.contributed),1],['job-production','직업 생산 3회','직업 생산·돌봄 생산을 3회 경험하기',record.production||0,3]];
  const added=defs.map(([id,title,reason,value,target])=>({id,title,reason,value,target,earned:value>=target}));
  return [first,...added,...base.filter(b=>b.id!=='first-harvest')];
 }
 function go(step){
  const s=read();if(!s)return;
  if(step===0){if(s.job===0)window.villageNavigate('farm');else{window.villageNavigate('activity');document.querySelector('[data-activity="work"]')?.click()}}
  if(step===1)window.villageNavigate('market');
  if(step===2){
   // Uses the existing delegated donate handler and authoritative server validation.
   modal(`<h2>🥗 공동 식탁에 보태기</h2><p>내 재료와 친구의 재료가 만나 한 끼가 돼요.</p>${items.slice(0,4).map((n,i)=>`<div class="journey-food"><span>${symbols[i]} ${n} · 보관 ${s.stock[i]}개</span><button data-school-donate="${i}" ${classroomData.room.paused||classroomData.room.phase!=='협력'||s.stock[i]<1?'disabled':''}>1개 보태기</button></div>`).join('')}<p>${classroomData.room.phase!=='협력'?'선생님이 협력 시즌을 열면 보탤 수 있어요.':'필요한 재료는 장터에서 친구와 바꿔 보세요.'}</p><button data-close>닫기</button>`);
  }
 }
 function sync(){
  const s=read();if(!s)return;
  const job=Number.isInteger(s.job)?s.job:0,role=['채소를 키우는 농부','젖소를 돌보는 목장 농부','과일나무를 가꾸는 농부','물고기를 기르는 양식 어부'][job]||'마을 일꾼';
  const mode=document.querySelector('#playMode');if(mode)mode.textContent=`${symbols[job]} ${role} · ${s.trial?'체험 마을':classroomData.room.code}`;
  const complete=[job===0?(s.farm?.picked||0)>0:!!record.produced,!!record.traded,!!record.contributed];
  const current=complete.findIndex(v=>!v),step=selectedStep??(current<0?2:current);
  const titles=[job===0?'상추 키워 수확하기':`${items[job]} 생산하기`,s.trial?'연습 친구 우유와 바꾸기':'다른 직업 친구와 교환하기','공동 식탁에 보태기'];
  if(route){route.hidden=document.body.dataset.screen!=='farm';const stamp=JSON.stringify([titles,complete,step,current]);if(snapshot!==stamp){snapshot=stamp;route.innerHTML=`<small>내 일이 한 끼가 되는 3단계</small><div class="journey-steps">${['생산','교환','기여'].map((t,i)=>`<button data-step="${i}" aria-label="${i+1}단계 ${titles[i]} ${complete[i]?'완료':'진행 중'}" aria-pressed="${step===i}">${complete[i]?'✓':i+1} ${t}</button>`).join('')}</div><button class="journey-next" data-go="${step}">${titles[step]} →</button>${current<0?'<p>다른 직업 친구가 없으면 식탁이 안 채워져요.</p>':''}`}}
  if(!intro){intro=document.createElement('dialog');intro.className='journey-intro';intro.setAttribute('aria-labelledby','journeyIntroTitle');intro.innerHTML='<small>SHINY VILLAGE · 진로 체험 마을</small><h2 id="journeyIntroTitle"></h2><p></p><button class="primary">시작하기</button>';document.body.append(intro);const done=()=>{record.intro=true;persist()};intro.querySelector('button').onclick=()=>{done();intro.close()};intro.addEventListener('cancel',done)}
  if(!record.intro&&!document.querySelector('dialog[open]')&&!s.rolePending){intro.querySelector('h2').textContent=`이 마을에서 ${role}예요.`;intro.querySelector('p').textContent=`혼자서는 식탁을 다 채울 수 없어요. 친구의 ${items.slice(0,4).filter((_,i)=>i!==job).join('·')}${job===3?'가':'이'} 필요해요.`;intro.showModal()}
 }
 function mount(viewport,goalButton,actions){
  goalButton.classList.add('journey-old-goal');const growth=document.createElement('button');growth.textContent='🌱 농장 성장';growth.onclick=()=>goalButton.click();actions.append(growth);
  route=document.createElement('section');route.className='career-route';route.setAttribute('aria-label','진로 체험 목표');viewport.append(route);route.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.step!==undefined){selectedStep=Number(b.dataset.step);snapshot=null;sync()}if(b.dataset.go!==undefined)go(Number(b.dataset.go))};sync();
 }
 window.CareerJourney={stamps,mount,sync};
 if(!farm)return;
 // Preserve all actions, responses and errors; observe only confirmed results for UI records.
 const action=schoolAction;schoolAction=function(payload,...args){read();const productionBefore=record.production||0;return action(payload,...args).then(ok=>{if(ok){read();if(['produce','cow_milk','water_harvest'].includes(payload.action)){record.production=Math.max(record.production||0,productionBefore+1);record.produced=true;persist()}sync();const dlg=document.querySelector('#dialogContent');if(payload.action==='donate'&&dlg?.querySelector('.journey-food')){const text=document.createElement('p');text.setAttribute('role','status');text.textContent='식탁에 재료를 보탰어요.';dlg.replaceChildren(text);const closeButton=document.createElement('button');closeButton.textContent='계속하기';closeButton.onclick=()=>close();dlg.append(closeButton)}}return ok})};
 const original=render;render=function(){original();sync()};
 const originalToast=toast;toast=function(text){if(/^(씨앗을 심었어요!|물을 줬어요!|상추 \d+개를 수확했어요!|\d+번 밭 · (심기|물 주기|수확) 완료)/.test(String(text)))return;originalToast(text)};
 window.addEventListener('village-screen-change',sync);
 window.addEventListener('farm-visual-harvest-end',e=>{const v=document.querySelector('.farm3d-viewport');if(!v||!e.detail?.amount)return;const bubble=document.createElement('span');bubble.className='journey-yield';bubble.textContent=`+${e.detail.amount} ${CROP_TYPES[e.detail.crop]?.name||'상추'}`;bubble.setAttribute('role','status');v.append(bubble);setTimeout(()=>bubble.remove(),1600);sync()});
 document.addEventListener('DOMContentLoaded',sync);
})();
