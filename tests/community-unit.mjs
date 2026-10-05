import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {api} from '../src/api.mjs';import {writeFile} from 'node:fs/promises';
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');function prepare(sqlText,args=[]){return {bind(...v){return prepare(sqlText,v)},async first(){return sql.prepare(sqlText).get(...args)||null},async all(){return {results:sql.prepare(sqlText).all(...args)}},async run(){const r=sql.prepare(sqlText).run(...args);return {meta:{changes:Number(r.changes)}}},sqlText,args}}const db={prepare,async batch(stmts){sql.exec('BEGIN');try{const out=[];for(const s of stmts)out.push(await s.run());sql.exec('COMMIT');return out}catch(e){sql.exec('ROLLBACK');throw e}}};let clock=Date.now();const realNow=Date.now;Date.now=()=>clock;
async function req(path,body,token){const r=await api(new Request('http://test'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}),{DB:db,TEACHER_SETUP_KEY:'test-key'});return {status:r.status,data:await r.json()}}const ok=r=>{assert.equal(r.status,200,JSON.stringify(r));return r.data};

try{
const room=(await req('/api/create',{setupKey:'test-key',size:2})).data;const student=room.students[0].code;let seq=0;const act=b=>req('/api/action',{requestId:'community-'+(++seq),...b},student);
ok(await req('/api/teacher',{day:1,weather:0,market:true,paused:false,phase:'협력'},room.teacherKey));
ok(await act({action:'produce'}));ok(await act({action:'produce'}));ok(await act({action:'produce'}));
ok(await act({action:'sell',item:0,qty:1}));ok(await act({action:'quiz',answer:0}));ok(await act({action:'expand'}));ok(await act({action:'crop_sell',crop:0,qty:2}));
const gift={action:'crop_donate',crop:0,qty:1,season:1,requestId:'community-gift-once'};ok(await req('/api/action',gift,student));ok(await req('/api/action',gift,student));ok(await act({action:'donate',item:0,qty:1}));
let board=ok(await req('/api/community',null,student));assert.equal(board.players.length,1);assert.deepEqual(board.totals,{sales:30,donated:2});const me=board.players[0];assert.equal(me.sales,30);assert.equal(me.donated,2);assert.deepEqual(Object.keys(me).sort(),['donated','isMe','name','sales']);
const peer=ok(await req('/api/community',null,room.students[1].code));assert.equal(peer.players.length,1);assert.equal(peer.players[0].sales,0);assert.equal(peer.totals.sales,30);
const teacher=ok(await req('/api/community',null,room.teacherKey));assert.equal(teacher.players.length,2);assert.equal(teacher.totals.sales,30);
const other=(await req('/api/create',{setupKey:'test-key',size:1})).data;assert.equal(ok(await req('/api/community',null,other.students[0].code)).players.length,1);assert.equal((await req('/api/community')).status,401);
console.log('PASS community: sales exclude rewards/spending, donations deduplicated, student privacy, teacher roster, class isolation, authentication');
}finally{Date.now=realNow;sql.close()}
