import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {api} from '../src/api.mjs';import {writeFile} from 'node:fs/promises';
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');function prepare(sqlText,args=[]){return {bind(...v){return prepare(sqlText,v)},async first(){return sql.prepare(sqlText).get(...args)||null},async all(){return {results:sql.prepare(sqlText).all(...args)}},async run(){const r=sql.prepare(sqlText).run(...args);return {meta:{changes:Number(r.changes)}}},sqlText,args}}const db={prepare,async batch(stmts){sql.exec('BEGIN');try{const out=[];for(const s of stmts)out.push(await s.run());sql.exec('COMMIT');return out}catch(e){sql.exec('ROLLBACK');throw e}}};let clock=Date.now();const realNow=Date.now;Date.now=()=>clock;
async function req(path,body,token){const r=await api(new Request('http://test'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}),{DB:db,TEACHER_SETUP_KEY:'test-key'});return {status:r.status,data:await r.json()}}const ok=r=>{assert.equal(r.status,200,JSON.stringify(r));return r.data};

try{
const token='c'.repeat(32);ok(await req('/api/trial',{key:token}));let seq=0;const act=b=>req('/api/action',{requestId:'merge-test-'+(++seq),...b},token);
let d=ok(await act({action:'merge_start'}));const id=d.me.state.mergeGame.id;
assert.equal((await act({action:'merge_move',gameId:id,from:0,to:0})).status,400);
assert.equal((await act({action:'merge_move',gameId:id,from:0,to:8})).status,400);
assert.equal((await act({action:'merge_move',gameId:'wrong',from:0,to:1})).status,409);
let final;
async function win(){let x=ok(await act({action:'merge_start'}));while(!x.me.state.mergeGame.complete){const g=x.me.state.mergeGame;let pair;for(let i=0;i<16&&!pair;i++)for(let j=i+1;j<16;j++)if(g.board[i]&&g.board[i]===g.board[j]){pair=[i,j];break}assert.ok(pair);final={action:'merge_move',requestId:'merge-finish-'+(++seq),gameId:g.id,from:pair[0],to:pair[1]};x=ok(await req('/api/action',final,token));}return x.me.state}
assert.equal((await win()).coins,90);assert.equal(ok(await req('/api/action',final,token)).me.state.coins,90);assert.equal((await win()).coins,90);clock+=86400000;assert.equal((await win()).coins,100);
const board=ok(await req('/api/community',null,token));assert.equal(board.players.find(p=>p.isMe).sales,0);
console.log('PASS merge: legal moves, stale game rejected, duplicate final, daily reward cap, next calendar day, excluded from sales');
}finally{Date.now=realNow;sql.close()}
