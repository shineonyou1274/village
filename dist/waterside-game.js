// The panel reflects server-owned player state. It never awards fish locally.
export function createWatersideGame({viewport,getState,getDay,isVillage,onAction}){
 const panel=document.createElement('section');panel.className='waterside-panel';panel.hidden=true;panel.setAttribute('aria-label','물가 일터');
 panel.innerHTML='<button type="button" class="waterside-close" aria-label="물가 일터 닫기">×</button><strong>💧 물가 일터</strong><div class="waterside-steps" aria-label="물가 작업 순서"><span>① 수질 확인</span><span>② 물고기 돌봄</span><span>③ 수확</span></div><p class="waterside-status" role="status"></p><small class="waterside-quality"></small><div class="waterside-actions"></div><small>수질 지표는 학습용 시뮬레이션이며 실제 측정값이 아니에요.</small>';
 viewport.append(panel);panel.querySelector('.waterside-close').onclick=()=>{panel.hidden=true};
 let busy=false,lastKey='';
 function update(){
  if(panel.hidden)return;const state=getState(),day=getDay(),work=state.waterWork?.day===day?state.waterWork:null;
  const wait=work?.caredAt?Math.max(0,Math.ceil((20000-(Date.now()-work.caredAt))/1000)):0;
  const key=[day,!!window.classroomActive,work?.sampledAt||0,work?.caredAt||0,!!work?.harvested,wait,busy,state.stock?.[3]||0,state.logistics?.warehouse?.[3]||0,state.logistics?.shipment?.status||''].join(':');
  if(key===lastKey)return;lastKey=key;
  const status=panel.querySelector('.waterside-status'),quality=panel.querySelector('.waterside-quality'),actions=panel.querySelector('.waterside-actions');
  if(!window.classroomActive){status.textContent='체험 마을 또는 학급에 입장하면 물가 일을 할 수 있어요.';quality.textContent='';actions.innerHTML='';return}
  quality.textContent=work?`오늘의 수질 지표 ${work.quality}/100 · 날씨에 따른 교육용 값`:'오늘은 아직 수질을 확인하지 않았어요.';
  if(!work){status.textContent='수질을 먼저 살피고 양식장 일을 시작해요.';actions.innerHTML='<button type="button" data-water-action="water_sample">수질 확인하기</button>'}
  else if(!work.caredAt){status.textContent='수질을 기록했어요. 이제 물고기의 상태를 살펴요.';actions.innerHTML='<button type="button" data-water-action="water_care">물고기 돌보기</button>'}
  else if(!work.harvested){status.textContent=wait?`돌봄을 마쳤어요. 수확까지 ${wait}초 남았어요.`:'물고기가 준비됐어요. 수확해서 냉장창고에 넣어요.';actions.innerHTML=`<button type="button" data-water-action="water_harvest" ${wait?'disabled':''}>${wait?`자라는 중 · ${wait}초`:'물고기 2개 수확하기'}</button>`}
  else{status.textContent=`오늘의 물가 일을 마쳤어요. 냉장창고 생선 ${state.logistics?.warehouse?.[3]||0}개 · 장터 재고 ${state.stock?.[3]||0}개예요.`;actions.innerHTML='<span>활동 → 직업 활동에서 보냉 포장과 배송을 마치면 장터에서 교환할 수 있어요.</span>'}
  if(busy)actions.querySelector('button')?.setAttribute('disabled','');
 }
 panel.querySelector('.waterside-actions').onclick=async event=>{
  const button=event.target.closest('[data-water-action]');if(!button||button.disabled||busy)return;
  busy=true;button.disabled=true;button.textContent='저장하는 중…';
  try{await onAction(button.dataset.waterAction)}finally{busy=false;lastKey='';update()}
 };
 window.addEventListener('village-screen-change',()=>{if(!isVillage())panel.hidden=true});
 return {show(){if(!isVillage())return;panel.hidden=false;lastKey='';update()},tick(){if(!isVillage())panel.hidden=true;else update()}};
}
