/* A shared market scene. Inventory remains owned by the existing transactional API. */
(()=>{
 const greetings={wave:'👋 안녕!',thanks:'💛 고마워!',together:'🌱 같이 도와주자!'};
 let visitors=[],spot=8,selected='',page=0,lastKey='',activeToken='',busy=false,timer=null,notice='친구들의 방문을 확인하고 있어요.',lastGreeting=0,wasMarket=false;
 const active=()=>window.classroomActive&&document.body.dataset.screen==='market'&&!document.hidden;
 const esc=escapeHtml;
 const hash=id=>Array.from(id).reduce((n,c)=>n+c.charCodeAt(0),0);
 const avatar=(id,me=false)=>`<span class="market-person ${me?'is-me':''}" style="--shirt:${['#527ea0','#ca775c','#81924e','#ab78a1'][hash(id)%4]}"><i class="person-hair"></i><i class="person-face"></i><i class="person-body"></i><i class="person-legs"></i></span>`;
 function detail(){
  const d=classroomData,peer=d.players?.find(p=>p.id===selected),here=visitors.some(p=>p.id===selected),offers=(d.offers||[]).filter(o=>o.seller===selected);
  if(!peer)return '<b>함께 걷고, 서로의 물건을 나눠요</b><p>친구나 가판대를 누르면 가까이 가서 물건을 볼 수 있어요.</p>';
  return `<b>${esc(peer.name)}${selected===d.me.id?' · 나':''}</b><span class="market-presence-state">${here?'지금 장터에 있어요':state.trial&&selected!==d.me.id?'연습 친구 · 실제 접속자가 아니에요':'지금은 물건만 맡겨 두었어요'}</span>${offers.length?offers.map(o=>`<div class="market-goods"><span>${symbols[o.give_item]} ${items[o.give_item]} ${o.give_qty}개 <b>↔</b> ${symbols[o.want_item]} ${items[o.want_item]} ${o.want_qty}개</span><button data-market-trade="${esc(o.id)}" ${(!d.room.market&&o.seller!==d.me.id)||schoolPending?'disabled':''}>${o.seller===d.me.id?'제안 취소':'마주 보고 교환'}</button></div>`).join(''):'<p>아직 맡겨 둔 물건은 없어요. 인사를 건네 보세요.</p>'}`;
 }
 function draw(){
  if(!window.classroomActive||document.body.dataset.screen!=='market')return;
  const d=classroomData;if(!d?.me)return;
  let root=document.querySelector('#marketSquare');if(!root){$('#panel').innerHTML='<section id="marketSquare" aria-label="함께 만나는 장터"></section>';root=$('#marketSquare');lastKey=''}
  const peers=[...new Map([...(d.offers||[]).map(o=>({id:o.seller,name:o.seller_name})),...visitors].map(p=>[p.id,p])).values()].filter(p=>p.id!==d.me.id);
  const pages=Math.max(1,Math.ceil(peers.length/(innerWidth<650?3:6)));page=Math.min(page,pages-1);const perPage=innerWidth<650?3:6,shown=peers.slice(page*perPage,page*perPage+perPage);
  const used=new Set(),positions=new Map();for(const p of shown){const v=visitors.find(v=>v.id===p.id);if(v){let pos=v.spot;while(used.has(pos))pos=(pos+1)%12;used.add(pos);positions.set(p.id,pos)}}
  const key=JSON.stringify([d.me.id,d.me.version,d.room.market,d.room.paused,d.offers,d.shipping,visitors,selected,page,notice,schoolPending]);
  if(key===lastKey){position();return}lastKey=key;const previousHero=$('#marketHero');
  root.innerHTML=`<div class="market-heading"><div><small>SHINY VILLAGE · 우리 반 만남의 광장</small><h2>반가워, 장터에서 만나!</h2><p>${d.room.market?'가판대에 물건을 맡기고 친구에게 인사해요.':'지금은 장터 준비 시간이에요. 친구와 인사는 할 수 있어요.'}</p></div><span class="market-count">함께 있는 ${visitors.length}명</span></div>
  <div class="market-toolbar"><button data-market-return>← 마을로</button><button id="newSchoolOffer" ${!d.room.market||d.room.paused?'disabled':''}>＋ 내 가판대에 물건 놓기</button><button data-market-mine>내 물건 보기</button><span id="marketSync" role="status">${esc(notice)}</span></div>
  <div class="market-plaza" aria-label="장터 광장"><div class="market-trees" aria-hidden="true">🌳 🌳</div><div class="market-sign" aria-hidden="true">우리의 작은 장터</div><div class="market-path" aria-hidden="true"></div>
  <div class="market-stalls">${Array.from({length:perPage},(_,i)=>{const p=shown[i],o=p&&(d.offers||[]).find(o=>o.seller===p.id),online=p&&visitors.some(v=>v.id===p.id);return p?`<button class="market-stall ${selected===p.id?'chosen':''}" data-market-peer="${esc(p.id)}"><span class="stall-awning" aria-hidden="true"></span><span class="stall-goods" aria-hidden="true">${o?symbols[o.give_item]+' '+symbols[o.want_item]:'🧺'}</span><b>${esc(p.name)}</b><small>${online?'● 함께 있어요':state.trial?'연습 친구의 가판대':'물건만 맡김'}</small></button>`:'<div class="market-stall vacant"><span class="stall-awning"></span><span class="stall-goods">🧺</span><small>이웃의 가판대 자리</small></div>'}).join('')}</div>
  <div class="market-walk-spots">${Array.from({length:12},(_,i)=>`<button data-market-spot="${i}" aria-label="광장 ${i+1}번 자리로 걷기" style="left:${19+(i%6)*14}%;top:${67+Math.floor(i/6)*18}%"><span aria-hidden="true">·</span></button>`).join('')}</div>
  ${shown.filter(p=>visitors.some(v=>v.id===p.id)).map((p,i)=>{const v=visitors.find(v=>v.id===p.id),pos=positions.get(p.id);return `<button class="market-visitor" data-market-peer="${esc(p.id)}" style="left:${8+(pos%6)*16}%;top:${51+Math.floor(pos/6)*18}%" aria-label="${esc(p.name)}에게 다가가기">${avatar(p.id)}<span class="visitor-name">${esc(p.name)}</span>${v.greeting?`<span class="market-greeting">${greetings[v.greeting]||''}</span>`:''}</button>`}).join('')}
  <div class="market-hero" id="marketHero">${avatar(d.me.id,true)}<span class="visitor-name">${esc(state.name)} · 나</span></div><div class="plaza-caption">발자국 자리를 눌러 걸어요 · 친구를 눌러 만나요</div></div>
  <div class="market-bottom"><div class="market-emotes" aria-label="친구에게 인사">${Object.entries(greetings).map(([id,text])=>`<button data-market-greet="${id}" ${d.room.paused?'disabled':''}>${text}</button>`).join('')}</div>${pages>1?`<div class="market-paging"><button data-market-page="-1" ${page===0?'disabled':''}>이전 이웃</button><span>${page+1}/${pages}</span><button data-market-page="1" ${page===pages-1?'disabled':''}>다음 이웃</button></div>`:''}</div>${coldChainPanel(true)}<section class="market-detail" aria-label="선택한 친구와 물건">${detail()}</section><p class="market-note">방문·인사는 약 8~11초마다 반영돼요. 자리를 비우면 캐릭터가 사라지고, 맡긴 물건은 남아요.${state.trial?' 연습 친구는 실제 접속자가 아닙니다.':''}</p>`;
  if(previousHero)$('#marketHero').replaceWith(previousHero);
  const selfGreeting=visitors.find(p=>p.id===d.me.id)?.greeting;$('#marketHero .market-greeting')?.remove();if(selfGreeting){const bubble=document.createElement('span');bubble.className='market-greeting';bubble.textContent=greetings[selfGreeting];$('#marketHero').append(bubble)}
  $('#newSchoolOffer').onclick=newSchoolOffer;
  root.onclick=e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.hasAttribute('data-market-return')){window.villageNavigate('village');return}if(b.dataset.marketPeer){selected=b.dataset.marketPeer;const v=visitors.find(v=>v.id===selected);spot=v?v.spot:(Math.max(0,shown.findIndex(p=>p.id===selected))+6);draw();sync()}
   if(b.hasAttribute('data-market-mine')){selected=d.me.id;draw()}
   if(b.dataset.marketSpot!==undefined){spot=Number(b.dataset.marketSpot);position();sync()}
   if(b.dataset.marketGreet){sendGreeting(b.dataset.marketGreet)}
   if(b.dataset.marketTrade){trade(b.dataset.marketTrade)}
   if(b.dataset.marketPage){page+=Number(b.dataset.marketPage);draw()}
  };position();
 }
 function position(){const h=$('#marketHero');if(h){h.style.left=(19+(spot%6)*14)+'%';h.style.top=(67+Math.floor(spot/6)*18)+'%'}}
 async function sync(greeting){if(!active()||busy)return;const token=schoolToken;busy=true;activeToken=token;try{const d=await schoolFetch('/api/market-presence',{action:greeting?'greet':'visit',...(greeting?{greeting}:{spot})},token);if(active()&&schoolToken===token){visitors=d.visitors;notice='친구들의 방문을 확인했어요';draw()}}catch(e){visitors=[];notice=e.message||'방문 상태를 확인하지 못했어요';draw()}finally{busy=false;if(!active()||schoolToken!==token){await leave(token)}}}
 async function leave(token=activeToken){if(!token)return;activeToken='';visitors=[];try{await schoolFetch('/api/market-presence',{action:'leave'},token)}catch{} }
 async function sendGreeting(g){if(Date.now()-lastGreeting<5000){toast('인사는 5초 뒤에 다시 보낼 수 있어요.');return}if(busy){toast('입장을 확인하고 있어요. 잠시 뒤 인사해 주세요.');return}lastGreeting=Date.now();await sync(g);toast(greetings[g])}
 function trade(id){const o=classroomData.offers.find(o=>o.id===id);if(!o)return;const own=o.seller===classroomData.me.id,here=visitors.some(v=>v.id===o.seller);modal(`<h2>${own?'가판대에서 물건을 가져올까요?':'서로의 물건을 확인해요'}</h2><div class="market-meeting"><div>${avatar(classroomData.me.id,true)}<b>${esc(state.name)}</b><span>${symbols[o.want_item]} ${items[o.want_item]} ${o.want_qty}개</span></div><span class="meeting-arrow">↔</span><div>${avatar(o.seller)}<b>${esc(o.seller_name)}</b><span>${symbols[o.give_item]} ${items[o.give_item]} ${o.give_qty}개</span></div></div><p>${own?'맡겨 둔 물건이 내 보관함으로 돌아옵니다.':here?'친구가 올린 제안에 내가 동의하면 교환됩니다.':'친구가 미리 맡긴 물건이에요. 지금 자리에 없어도 제안대로 교환할 수 있어요.'}</p><div class="dialog-actions"><button data-close>돌아가기</button><button id="confirmSchoolTrade" class="primary">${own?'제안 취소하기':'이 물건으로 교환하기'}</button></div>`);$('#confirmSchoolTrade').onclick=async()=>{const ok=await schoolAction({action:own?'cancel':'accept',offer:id});if(ok){close();notice=own?'물건을 보관함으로 가져왔어요':'🎁 물건이 서로의 보관함으로 건너갔어요!';draw();const root=$('#marketSquare');root?.classList.add('trade-complete');setTimeout(()=>root?.classList.remove('trade-complete'),1500);toast(notice)}}}
 const previous=renderPanel;renderPanel=function(){if(window.classroomActive&&document.body.dataset.screen==='market'){draw();return}previous()};
 function changed(){if(active()){draw();if(!wasMarket){const root=$('#marketSquare');root?.classList.remove('market-arriving');void root?.offsetWidth;root?.classList.add('market-arriving');const heading=root?.querySelector('h2');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'})}wasMarket=true;sync()}else{wasMarket=false;leave()}}
 window.addEventListener('resize',()=>{lastKey='';draw()});window.addEventListener('village-screen-change',changed);document.addEventListener('visibilitychange',changed);
 window.addEventListener('pagehide',()=>{if(activeToken)fetch('/api/market-presence',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+activeToken},body:JSON.stringify({action:'leave'}),keepalive:true}).catch(()=>{})});
 async function tick(){if(active())await sync();else if(activeToken)await leave();timer=setTimeout(tick,8000+Math.random()*3000)}
 // One completion-based heartbeat, independent of frequent scene rendering.
 timer=setTimeout(tick,500);window.addEventListener('village-screen-change',()=>{if(!timer)timer=setTimeout(tick,500)});
 changed();
})();
