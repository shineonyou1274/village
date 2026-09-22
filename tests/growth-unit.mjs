import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {api} from '../src/api.mjs';import {writeFile} from 'node:fs/promises';
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');function prepare(sqlText,args=[]){return {bind(...v){return prepare(sqlText,v)},async first(){return sql.prepare(sqlText).get(...args)||null},async all(){return {results:sql.prepare(sqlText).all(...args)}},async run(){const r=sql.prepare(sqlText).run(...args);return {meta:{changes:Number(r.changes)}}},sqlText,args}}const db={prepare,async batch(stmts){sql.exec('BEGIN');try{const out=[];for(const s of stmts)out.push(await s.run());sql.exec('COMMIT');return out}catch(e){sql.exec('ROLLBACK');throw e}}};let clock=Date.now();const realNow=Date.now;Date.now=()=>clock;
async function req(path,body,token){const r=await api(new Request('http://test'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}),{DB:db,TEACHER_SETUP_KEY:'test-key'});return {status:r.status,data:await r.json()}}const ok=r=>{assert.equal(r.status,200,JSON.stringify(r));return r.data};

try{
const room=(await req('/api/create',{setupKey:'test-key',size:2})).data,t=room.teacherKey,student=room.students[0].code;let seq=0;
const act=(b)=>req('/api/action',{requestId:'growth-check-'+(++seq),...b},student);
// Mature farm fixture for the multi-crop regression suite.
const mature=ok(await req('/api/state',null,student));mature.me.state.farm.picked=80;sql.prepare('UPDATE players SET state=? WHERE id=?').run(JSON.stringify(mature.me.state),mature.me.id);
for(let i=0;i<5;i++){ok(await act({action:'plant',plot:i,crop:i}));ok(await act({action:'water',plot:i}));assert.equal((await act({action:'harvest',plot:i})).status,409)}clock+=61000;
for(let i=0;i<5;i++)ok(await act({action:'harvest',plot:i}));
let d=ok(await req('/api/growth',null,student));assert.deepEqual(d.stock,[2,3,2,4,2]);assert(d.badges.find(b=>b.id==='variety-5').earned);assert(d.badges.find(b=>b.id==='first-harvest').earned);
assert.equal((await act({action:'crop_donate',crop:1,qty:4})).status,400);
const duplicate={action:'crop_donate',crop:1,qty:2,requestId:'same-donation-123'};ok(await req('/api/action',duplicate,student));ok(await req('/api/action',duplicate,student));d=ok(await req('/api/growth',null,student));assert.equal(d.stock[1],1);assert.equal(d.project.totals.find(t=>t.crop===1).qty,2);
assert.equal((await act({action:'garden_role',step:0,answer:0})).status,409);
for(let n=0;n<2;n++){clock+=41000;ok(await act({action:'harvest',plot:2}))}let state=ok(await req('/api/state',null,student));assert.equal(state.me.state.farm.plots[2].seeded,false);assert.equal(state.me.state.garden.harvested[2],6);
for(let i=0;i<50;i++){sql.prepare('UPDATE rooms SET day=? WHERE id=?').run(i+1,state.room.id);d=ok(await req('/api/growth',null,student));assert.equal(d.quiz.id,i);ok(await act({action:'quiz',quizId:i,answer:i%2}));assert.equal((await act({action:'quiz',quizId:i,answer:i%2})).status,400)}d=ok(await req('/api/growth',null,student));assert.equal(d.quiz,null);assert(d.badges.find(b=>b.id==='quiz-50').earned);
const actor=state.me.id;for(let i=0;i<14;i++){const day=new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10);sql.prepare("INSERT INTO study_sessions(id,actor,room,goal,plan,seat,status,elapsed,tick,created,reported,day,reflection) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)");
// Fixture rows bypass the live seat trigger only for historical completed-session setup.
sql.exec('DROP TRIGGER IF EXISTS study_seat_required');sql.prepare("INSERT INTO study_sessions(id,actor,room,goal,plan,seat,status,elapsed,tick,created,reported,day,reflection) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").run('historic-'+i,actor,state.room.id,'읽기',15,'창가','finished',600,clock,clock,600,day,'읽고 정리');}
d=ok(await req('/api/growth',null,student));assert(d.badges.find(b=>b.id==='streak-14').earned);assert(d.badges.find(b=>b.id==='focus-60').earned);
assert.equal((await req('/api/growth/award',{actor,reason:'친구 도움'},student)).status,403);ok(await req('/api/growth/award',{actor,reason:'포장을 도운 친구'},t));d=ok(await req('/api/growth',null,student));assert.equal(d.badges.find(b=>b.id==='kind-neighbor').reason,'포장을 도운 친구');
ok(await req('/api/growth/policy',{mode:'school'},t));ok(await req('/api/growth/schoolday',{},t));d=ok(await req('/api/growth',null,student));assert.equal(d.mode,'school');assert(d.badges.find(b=>b.id==='streak-14').earned,'past badge retained after policy change');
for(let i=0;i<5;i++)sql.prepare('INSERT INTO garden_totals(room,crop,qty) VALUES(?,?,30) ON CONFLICT(room,crop) DO UPDATE SET qty=30').run(state.room.id,i);
for(let i=0;i<3;i++)ok(await act({action:'garden_role',step:i,answer:0}));d=ok(await req('/api/growth',null,student));assert(d.badges.find(b=>b.id==='shared-lunch').earned);assert.equal(d.project.roles.length,3);
console.log('PASS: crop timers/yields, tomato regrowth, distinct inventory, donation idempotency, 50 quizzes, badge persistence, teacher authorization, study streaks, project stages');
}finally{Date.now=realNow;sql.close()}
