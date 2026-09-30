const names=['상추','우유','사과','생선'];
const fail=(message,status=409)=>{throw Object.assign(new Error(message),{status})};
const count=(value,min=1,max=50)=>{if(!Number.isInteger(value)||value<min||value>max)fail('수량을 확인해 주세요.',400);return value};

export function logistics(state){
 if(!state.logistics)state.logistics={warehouse:[0,0,0,0],shipment:null,lastDelivery:null};
 return state.logistics;
}

export function shippingConditions(room,mission,state){
 const reasons=[];
 if(room.weather===3){
  if(mission&&!mission.completed){
   if(mission.counts[0]<mission.target)reasons.push('폭우로 길이 차단됐어요. 안전한 경로 미션을 마쳐야 해요.');
   if(mission.counts[1]<mission.target)reasons.push('정전으로 냉장창고 전력을 확인할 수 없어요. 전문가 전력 복구 미션이 필요해요.');
  }else if(state.repairDay!==room.day){
   reasons.push('폭우로 길이 차단됐어요. 안전 복구 미션을 먼저 해 주세요.');
   reasons.push('정전으로 냉장 전력을 확인할 수 없어요. 안전 복구 미션을 먼저 해 주세요.');
  }
 }
 return {routeSafe:!reasons.some(reason=>/길|경로/.test(reason)),powerReady:!reasons.some(reason=>/전력|전기/.test(reason)),reasons};
}

export function coldChainAction(state,input,room,mission,makeId,note){
 const store=logistics(state),kind=input.action,active=store.shipment;
 if(kind==='shipment_pack'){
  if(active)fail('진행 중인 배송을 먼저 마치거나 취소해 주세요.');
  const item=count(input.item,0,3),qty=count(input.qty);
  const warehouseQty=Math.min(store.warehouse[item],qty),stockQty=qty-warehouseQty;
  if(state.stock[item]<stockQty)fail('포장할 물건이 부족해요.',400);
  store.warehouse[item]-=warehouseQty;state.stock[item]-=stockQty;
  const source={warehouse:warehouseQty,stock:stockQty};
  store.shipment={id:makeId(),item,qty,source,status:'packed',routeChecked:false,powerChecked:false};
  note(state,`${names[item]} ${qty}개를 보냉상자에 포장했어요.`);
  return;
 }
 if(!active||input.shipmentId!==active.id)fail('진행 중인 배송을 다시 확인해 주세요.');
 if(kind==='shipment_cancel'){
  store.warehouse[active.item]+=active.source.warehouse;
  state.stock[active.item]+=active.source.stock;
  store.shipment=null;
  note(state,'배송을 취소하고 물건을 원래 보관 장소로 돌려놓았어요.');
  return;
 }
 const conditions=shippingConditions(room,mission,state);
 if(conditions.reasons.length)fail(conditions.reasons.join(' '));
 if(kind==='shipment_check'){
  if(active.status!=='packed')fail('포장한 물건만 점검할 수 있어요.');
  active.routeChecked=true;active.powerChecked=true;active.status='checked';
  note(state,'안전한 경로와 냉장 전력을 확인했어요.');
 }else if(kind==='shipment_dispatch'){
  if(active.status!=='checked'||!active.routeChecked||!active.powerChecked)fail('경로와 전력을 먼저 확인해 주세요.');
  active.status='in_transit';
  note(state,`${names[active.item]} ${active.qty}개가 장터로 출발했어요.`);
 }else if(kind==='shipment_arrive'){
  if(active.status!=='in_transit')fail('배송 중인 물건만 장터에 도착할 수 있어요.');
  if(!room.market)fail('장터가 아직 닫혀 있어요. 개장 후 물건을 인계해 주세요.');
  state.stock[active.item]+=active.qty;
  store.lastDelivery={item:active.item,qty:active.qty,at:Date.now()};
  store.shipment=null;
  note(state,`${names[active.item]} ${active.qty}개가 장터에 도착했어요. 이제 교환할 수 있어요.`);
 }else fail('지원하지 않는 배송 활동입니다.',400);
}
