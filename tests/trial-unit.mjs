import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {api} from '../src/api.mjs';import {writeFile} from 'node:fs/promises';
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');function prepare(sqlText,args=[]){return {bind(...v){return prepare(sqlText,v)},async first(){return sql.prepare(sqlText).get(...args)||null},async all(){return {results:sql.prepare(sqlText).all(...args)}},async run(){const r=sql.prepare(sqlText).run(...args);return {meta:{changes:Number(r.changes)}}},sqlText,args}}const db={prepare,async batch(stmts){sql.exec('BEGIN');try{const out=[];for(const s of stmts)out.push(await s.run());sql.exec('COMMIT');return out}catch(e){sql.exec('ROLLBACK');throw e}}};let clock=Date.now();const realNow=Date.now;Date.now=()=>clock;
async function req(path,body,token){const r=await api(new Request('http://test'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}),{DB:db,TEACHER_SETUP_KEY:'test-key'});return {status:r.status,data:await r.json()}}const ok=r=>{assert.equal(r.status,200,JSON.stringify(r));return r.data};

try{
const key='a'.repeat(32), otherKey='b'.repeat(32);
const demo=ok(await req('/api/trial',{key}));assert.equal(demo.me.state.trial,true);assert.equal(demo.players.length,3);assert.equal(demo.offers.length,2);assert.equal(demo.room.market,true);
const again=ok(await req('/api/trial',{key}));assert.equal(again.me.id,demo.me.id);
const other=ok(await req('/api/trial',{key:otherKey}));assert.notEqual(other.room.id,demo.room.id);
let seq=0;const act=b=>req('/api/action',{requestId:'trial-test-'+(++seq),...b},key);
ok(await act({action:'plant',plot:0}));ok(await act({action:'water',plot:0}));clock+=21000;ok(await act({action:'harvest',plot:0}));ok(await act({action:'accept',offer:demo.offers[0].id}));
assert.equal(ok(await req('/api/state',null,otherKey)).me.state.farm.picked,0);
const real=(await req('/api/create',{setupKey:'test-key',size:1})).data;
assert.equal(ok(await req('/api/community',null,real.students[0].code)).players.length,1);
assert.equal((await req('/api/trial',{key:'bad'})).status,400);
console.log('PASS trial: code-free entry, resume, isolated visitors and real classes, plant/water/harvest/trade');
}finally{Date.now=realNow;sql.close()}
