import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {api} from '../src/api.mjs';

const sql=new DatabaseSync(':memory:');
sql.exec('PRAGMA foreign_keys=ON');
function prepare(text,args=[]){return {bind(...values){return prepare(text,values)},async first(){return sql.prepare(text).get(...args)||null},async all(){return {results:sql.prepare(text).all(...args)}},async run(){return {meta:{changes:Number(sql.prepare(text).run(...args).changes)}}}}}
const db={prepare,async batch(statements){sql.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sql.exec('COMMIT');return results}catch(error){sql.exec('ROLLBACK');throw error}}};
let now=Date.now(),sequence=0;
const originalNow=Date.now;
Date.now=()=>now;
async function request(path,body,token){const response=await api(new Request('http://test'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}),{DB:db,TEACHER_SETUP_KEY:'test-key'});return {status:response.status,data:await response.json()}}
const action=(token,body)=>request('/api/action',{requestId:'career-loop-'+(++sequence),...body},token);
const ok=result=>{assert.equal(result.status,200,JSON.stringify(result));return result.data};

try{
 const created=await request('/api/create',{setupKey:'test-key',size:3});assert.equal(created.status,201);const room=created.data;
 const student=room.students[0].code;
 assert.equal((await action(student,{action:'job',job:2})).status,400,'new student starts on the farm');
 for(let round=0;round<2;round++){
  for(let plot=0;plot<4;plot++){ok(await action(student,{action:'plant',plot,crop:0}));ok(await action(student,{action:'water',plot}))}
  now+=21000;
  for(let plot=0;plot<4;plot++)ok(await action(student,{action:'harvest',plot}));
 }
 const before=ok(await request('/api/state',null,student));
 assert.equal(before.me.state.farm.picked,16);
 ok(await action(student,{action:'job',job:2}));
 let state=ok(await request('/api/state',null,student)).me.state;
 assert.equal(state.job,2);
 assert.equal(state.farm.picked,16,'role choice must preserve harvest history');
 ok(await action(student,{action:'produce'}));
 state=ok(await request('/api/state',null,student)).me.state;
 assert.equal(state.stock[2],2,'orchard work produces real apples');
 assert.equal((await action(student,{action:'job',job:3})).status,400,'specialization is a one-time choice');
 ok(await request('/api/story/start',{participants:3},room.teacherKey));
 ok(await action(student,{action:'mission_task',item:0,answer:1}));
 ok(await action(student,{action:'mission_task',item:1,answer:0}));
 const donated=ok(await action(student,{action:'mission_donate',item:2,qty:1}));
 assert.equal(donated.mission.food[2],1,'harvest → specialization → apple → shared meal must connect');
 ok(await action(student,{action:'mission_donate',item:0,qty:1}));

 async function unlockStudent(token,picked){const snapshot=ok(await request('/api/state',null,token));const saved=snapshot.me.state;saved.farm.picked=picked;saved.coins=200;saved.stock[0]=1;sql.prepare('UPDATE players SET state=?,version=version+1 WHERE id=?').run(JSON.stringify(saved),snapshot.me.id)}
 const rancher=room.students[1].code;await unlockStudent(rancher,80);
 ok(await action(rancher,{action:'job',job:1}));
 assert.equal((await action(rancher,{action:'produce'})).status,400,'milk requires actual cow care');
 ok(await action(rancher,{action:'cow_adopt'}));ok(await action(rancher,{action:'cow_feed'}));ok(await action(rancher,{action:'cow_water'}));
 now+=21000;ok(await action(rancher,{action:'cow_milk'}));
 ok(await action(rancher,{action:'mission_donate',item:1,qty:1}));

 const fisher=room.students[2].code;await unlockStudent(fisher,16);
 ok(await action(fisher,{action:'job',job:3}));
 assert.equal((await action(fisher,{action:'produce'})).status,400,'fish requires water quality and care');
 ok(await action(fisher,{action:'water_sample'}));ok(await action(fisher,{action:'water_care'}));
 now+=21000;ok(await action(fisher,{action:'water_harvest'}));
 const packed=ok(await action(fisher,{action:'shipment_pack',item:3,qty:1}));
 const shipmentId=packed.me.state.logistics.shipment.id;
 ok(await action(fisher,{action:'shipment_check',shipmentId}));
 ok(await action(fisher,{action:'shipment_dispatch',shipmentId}));
 ok(await action(fisher,{action:'shipment_arrive',shipmentId}));
 const meal=ok(await action(fisher,{action:'mission_donate',item:3,qty:1}));
 assert.deepEqual(meal.mission.food,[1,1,1,1]);
 ok(await action(student,{action:'mission_task',item:2,answer:2}));
 const finished=ok(await action(student,{action:'mission_task',item:3,answer:1}));
 assert(finished.mission.completed>0);
 console.log('PASS: harvest → orchard/apple, cow care/milk, water care/fish → four-ingredient shared meal');
}finally{Date.now=originalNow;sql.close()}
