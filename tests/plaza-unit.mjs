import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {api} from '../src/api.mjs';import {writeFile} from 'node:fs/promises';
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');function prepare(sqlText,args=[]){return {bind(...v){return prepare(sqlText,v)},async first(){return sql.prepare(sqlText).get(...args)||null},async all(){return {results:sql.prepare(sqlText).all(...args)}},async run(){const r=sql.prepare(sqlText).run(...args);return {meta:{changes:Number(r.changes)}}},sqlText,args}}const db={prepare,async batch(stmts){sql.exec('BEGIN');try{const out=[];for(const s of stmts)out.push(await s.run());sql.exec('COMMIT');return out}catch(e){sql.exec('ROLLBACK');throw e}}};let clock=Date.now();const realNow=Date.now;Date.now=()=>clock;
async function req(path,body,token){const r=await api(new Request('http://test'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}),{DB:db,TEACHER_SETUP_KEY:'test-key'});return {status:r.status,data:await r.json()}}const ok=r=>{assert.equal(r.status,200,JSON.stringify(r));return r.data};

try{
const room=(await req('/api/create',{size:30,setupKey:'test-key'})).data;
const other=(await req('/api/create',{size:1,setupKey:'test-key'})).data;
const a=room.students[0].code,b=room.students[1].code;
for(const s of room.students)ok(await req('/api/plaza',{action:'visit'},s.code));
let d=ok(await req('/api/plaza',null,a));assert.equal(d.visitors.length,30);assert.equal(new Set(d.visitors.map(p=>p.x+','+p.z)).size,30);
assert.equal(ok(await req('/api/plaza',{action:'visit'},other.students[0].code)).visitors.length,1);
assert.equal((await req('/api/plaza',{action:'move',x:99,z:0},a)).status,400);
assert.equal((await req('/api/plaza',null,room.teacherKey)).status,403);
assert.equal((await req('/api/plaza',null,'bad')).status,401);
const before=ok(await req('/api/state',null,a));
d=ok(await req('/api/plaza',{action:'move',x:0,z:-17},a));const me=before.me.id,initial=d.visitors.find(p=>p.id===me);clock+=500;
const moved=ok(await req('/api/plaza',null,b)).visitors.find(p=>p.id===me);assert(Math.hypot(moved.x-initial.x,moved.z-initial.z)<=1.50001);
ok(await req('/api/plaza',{action:'wave'},a));assert(ok(await req('/api/plaza',null,b)).visitors.find(p=>p.id===me).wave);
assert.equal((await req('/api/plaza',{action:'wave'},a)).status,429);
clock+=5000;assert(!ok(await req('/api/plaza',null,b)).visitors.find(p=>p.id===me).wave);
clock+=16000;d=ok(await req('/api/plaza',null,b));assert.equal(d.visitors.length,30);assert(d.visitors.every(p=>p.away));
ok(await req('/api/plaza',{action:'visit'},a));d=ok(await req('/api/plaza',null,b));assert.equal(d.visitors.filter(p=>!p.away).length,1);
ok(await req('/api/plaza',{action:'leave'},a));d=ok(await req('/api/plaza',null,b));assert(d.visitors.every(p=>p.away));
const after=ok(await req('/api/state',null,a));assert.deepEqual(after.me.state,before.me.state);
await req('/api/teacher',{day:1,weather:0,market:false,paused:true,phase:'개인 성장'},room.teacherKey);assert.equal((await req('/api/plaza',{action:'visit'},a)).status,423);
console.log('PASS: 30 distinct arrivals, class isolation, bounds, authentication, server speed, greeting cooldown/expiry, departure/TTL/reconnect, unchanged inventory, teacher pause');
}finally{Date.now=realNow;sql.close()}
