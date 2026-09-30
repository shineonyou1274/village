import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {api} from '../src/api.mjs';

const sql=new DatabaseSync(':memory:');
sql.exec('PRAGMA foreign_keys=ON');
function prepare(query,args=[]){return {bind(...values){return prepare(query,values)},async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}},async run(){return sql.prepare(query).run(...args)}}}
const db={prepare,async batch(statements){sql.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sql.exec('COMMIT');return results}catch(error){sql.exec('ROLLBACK');throw error}}};
async function request(path,body,token){const response=await api(new Request('http://test'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}),{DB:db,TEACHER_SETUP_KEY:'test-key'});return {status:response.status,data:await response.json()}}
const success=response=>{assert.equal(response.status,200,JSON.stringify(response));return response.data};
let serial=0;
try{
 const room=(await request('/api/create',{setupKey:'test-key',size:2})).data;
 const student=room.students[0].code,friend=room.students[1].code;
 const action=(token,payload)=>request('/api/action',{requestId:'cold-chain-'+(++serial),...payload},token);
 let state=success(await request('/api/state',null,student));
 const playerId=state.me.id,roomId=state.room.id;
 const fishStudent={...state.me.state,job:3,progression:1,waterWork:{day:state.room.day,quality:82,sampledAt:Date.now()-30000,caredAt:Date.now()-22000,harvested:false}};
 sql.prepare('UPDATE players SET state=? WHERE id=?').run(JSON.stringify(fishStudent),playerId);
 sql.prepare('UPDATE rooms SET market=1 WHERE id=?').run(roomId);

 // Reproduces the previous bug: freshly caught fish went straight into tradable stock.
 state=success(await action(student,{action:'water_harvest'}));
 assert.equal(state.me.state.stock[3],0,'harvested fish must not be tradable before delivery');
 assert.equal(state.me.state.logistics.warehouse[3],2);
 assert.equal((await action(student,{action:'offer',giveItem:3,giveQty:1,wantItem:0,wantQty:1})).status,400);

 const packs=await Promise.all([action(student,{action:'shipment_pack',item:3,qty:2}),action(student,{action:'shipment_pack',item:3,qty:2})]);
 assert.deepEqual(packs.map(response=>response.status).sort(),[200,409]);
 state=success(packs.find(response=>response.status===200));
 const shipmentId=state.me.state.logistics.shipment.id;
 assert.equal(state.me.state.logistics.warehouse[3],0);
 state=success(await request('/api/state',null,student));
 assert.equal(state.me.state.logistics.shipment.qty,2,'refresh preserves reserved quantity');
 state=success(await action(student,{action:'shipment_check',shipmentId}));
 assert.equal(state.me.state.logistics.shipment.status,'checked');
 state=success(await action(student,{action:'shipment_dispatch',shipmentId}));
 assert.equal(state.me.state.logistics.shipment.status,'in_transit');
 assert.equal((await action(student,{action:'offer',giveItem:3,giveQty:1,wantItem:0,wantQty:1})).status,400);
 const cancel={action:'shipment_cancel',shipmentId,requestId:'cold-cancel-once'};
 success(await request('/api/action',cancel,student));
 success(await request('/api/action',cancel,student));
 state=success(await request('/api/state',null,student));
 assert.equal(state.me.state.logistics.warehouse[3],2,'cancel and retry return fish exactly once');
 assert.equal(state.me.state.stock[3],0);

 state=success(await action(student,{action:'shipment_pack',item:3,qty:2}));
 const secondId=state.me.state.logistics.shipment.id;
 success(await action(student,{action:'shipment_check',shipmentId:secondId}));
 success(await action(student,{action:'shipment_dispatch',shipmentId:secondId}));
 const arrival={action:'shipment_arrive',shipmentId:secondId,requestId:'arrival-repeat-once'};
 state=success(await request('/api/action',arrival,student));
 success(await request('/api/action',arrival,student));
 assert.equal(state.me.state.stock[3],2);
 assert.equal(state.me.state.logistics.warehouse[3],0);
 assert.equal((await action(student,{action:'shipment_cancel',shipmentId:secondId})).status,409);
 state=success(await action(student,{action:'offer',giveItem:3,giveQty:1,wantItem:0,wantQty:1}));
 const offer=state.offers[0].id;
 success(await action(student,{action:'cancel',offer}));
 assert.equal(success(await request('/api/state',null,student)).me.state.stock[3],2);

 // During a storm, the road and power checks provide distinct reasons.
 success(await request('/api/teacher',{day:1,weather:3,market:true,paused:false,phase:'협력'},room.teacherKey));
 state=success(await action(student,{action:'shipment_pack',item:3,qty:1}));
 const stormId=state.me.state.logistics.shipment.id;
 let blocked=await action(student,{action:'shipment_check',shipmentId:stormId});
 assert.equal(blocked.status,409);
 assert.match(blocked.data.error,/길|경로/);
 state=success(await request('/api/state',null,student));
 assert(state.shipping.reasons.some(reason=>/전력|전기/.test(reason)));
 success(await request('/api/story/start',{participants:2},room.teacherKey));
 success(await action(student,{action:'mission_task',item:0,answer:1}));
 state=success(await request('/api/state',null,student));
 assert.equal(state.shipping.routeSafe,true);
 assert.equal(state.shipping.powerReady,false);
 blocked=await action(student,{action:'shipment_check',shipmentId:stormId});
 assert.match(blocked.data.error,/전력|전기/);
 success(await action(friend,{action:'mission_task',item:1,answer:0}));
 state=success(await request('/api/state',null,student));
 assert.equal(state.shipping.reasons.length,0);
 success(await action(student,{action:'shipment_check',shipmentId:stormId}));
 success(await action(student,{action:'shipment_dispatch',shipmentId:stormId}));
 state=success(await action(student,{action:'shipment_arrive',shipmentId:stormId}));
 assert.equal(state.me.state.stock[3],2,'storm recovery delivers the reserved fish without duplication');

 // The same reservation rules apply to another existing good.
 state=success(await request('/api/state',null,friend));
 const friendState={...state.me.state,stock:[2,0,0,0]};
 sql.prepare('UPDATE players SET state=? WHERE id=?').run(JSON.stringify(friendState),state.me.id);
 success(await request('/api/teacher',{day:1,weather:0,market:true,paused:false,phase:'협력'},room.teacherKey));
 state=success(await action(friend,{action:'shipment_pack',item:0,qty:2}));
 assert.equal(state.me.state.stock[0],0);
 const otherId=state.me.state.logistics.shipment.id;
 assert.equal((await action(friend,{action:'offer',giveItem:0,giveQty:1,wantItem:1,wantQty:1})).status,400);
 success(await action(friend,{action:'shipment_check',shipmentId:otherId}));
 success(await action(friend,{action:'shipment_dispatch',shipmentId:otherId}));
 state=success(await action(friend,{action:'shipment_arrive',shipmentId:otherId}));
 assert.equal(state.me.state.stock[0],2);
 console.log('PASS: fish harvest, packing, checks, transit escrow, cancellation and retry, arrival, exchange, storm reasons, second good');
}finally{sql.close()}
