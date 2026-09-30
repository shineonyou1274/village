const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.TEST_URL||'http://127.0.0.1:8817';
let seq=0;
async function call(path,body,token){const response=await fetch(base+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()}}
async function action(token,kind,requestId){return call('/api/action',{action:kind,requestId:requestId||`waterside-${++seq}`},token)}
(async()=>{
 const setupKey=fs.readFileSync('private/teacher-setup.txt','utf8').trim();
 const created=await call('/api/create',{setupKey,size:2});assert.equal(created.status,201);
 const [farmer,neighbor]=created.data.students.map(s=>s.code),teacher=created.data.teacherKey;
 assert.equal((await call('/api/teacher',{day:1,weather:0,market:true,paused:false,phase:'개인 성장'},teacher)).status,200);
 let result=await action(farmer,'water_sample');assert.equal(result.status,200);assert.equal(result.data.me.state.waterWork.day,1);
 assert.equal((await action(farmer,'water_sample')).status,409,'sample should be once per day');
 result=await action(farmer,'water_care');assert.equal(result.status,200);assert(result.data.me.state.waterWork.caredAt>0);
 assert.equal((await action(farmer,'water_harvest')).status,409,'fish cannot be harvested early');
 await new Promise(resolve=>setTimeout(resolve,20500));
 const harvestId='waterside-harvest-replay';result=await action(farmer,'water_harvest',harvestId);assert.equal(result.status,200);assert.equal(result.data.me.state.logistics.warehouse[3],2);
 assert.equal((await action(farmer,'water_harvest',harvestId)).status,200,'same request is idempotent');
 assert.equal((await action(farmer,'water_harvest')).status,409,'second harvest should be rejected');
  const packed=await call('/api/action',{action:'shipment_pack',requestId:'waterside-pack',item:3,qty:2},farmer);assert.equal(packed.status,200);const shipmentId=packed.data.me.state.logistics.shipment.id;for(const [index,kind] of ['shipment_check','shipment_dispatch','shipment_arrive'].entries()){const step=await call('/api/action',{action:kind,requestId:'waterside-ship-'+index,shipmentId},farmer);assert.equal(step.status,200,JSON.stringify(step))}
 const offered=await call('/api/action',{action:'offer',requestId:'waterside-offer',giveItem:3,giveQty:1,wantItem:0,wantQty:1},farmer);assert.equal(offered.status,200);const offer=offered.data.offers.find(o=>o.seller===offered.data.me.id);
 assert(offer);assert.equal((await action(neighbor,'produce')).status,200);
 const traded=await call('/api/action',{action:'accept',requestId:'waterside-accept',offer:offer.id},neighbor);assert.equal(traded.status,200);assert.equal(traded.data.me.state.stock[3],1);
 const after=await call('/api/state',null,farmer);assert.equal(after.data.me.state.stock[3],1);assert.equal(after.data.me.state.stock[0],1);
 assert.equal((await call('/api/teacher',{day:2,weather:1,market:true,paused:false,phase:'개인 성장'},teacher)).status,200);
 result=await action(farmer,'water_sample');assert.equal(result.status,200);assert.equal(result.data.me.state.waterWork.day,2);
 console.log('PASS: sample, care, timed harvest, idempotency, fish trade, next-day reset');
})().catch(error=>{console.error(error);process.exitCode=1});
