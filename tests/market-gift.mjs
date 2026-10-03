import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

const base=process.env.TEST_URL||'http://127.0.0.1:8787';
assert(new URL(base).hostname==='127.0.0.1'&&process.env.TEST_DB&&path.resolve(process.env.TEST_DB).startsWith(path.resolve('test-output')+path.sep),'Use an isolated local test database');
const setup=(await readFile('private/teacher-setup.txt','utf8')).trim();
let sequence=0;
async function call(route,body,token){const response=await fetch(base+route,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()}}
const act=(token,action,fields={})=>call('/api/action',{action,...fields,requestId:'gift-check-'+(++sequence)},token);

const created=await call('/api/create',{setupKey:setup,size:3});
assert.equal(created.status,201);
const room=created.data,[seller,recipient,other]=room.students;
assert.equal((await call('/api/teacher',{day:1,weather:0,market:true,phase:'협력',paused:false},room.teacherKey)).status,200);
assert.equal((await act(seller.code,'produce')).status,200);
const before=(await call('/api/state',null,recipient.code)).data.me.state.stock[0];
assert.equal(before,0);
const posted=await act(seller.code,'offer',{giveItem:0,giveQty:1,gift:true});
assert.equal(posted.status,200,JSON.stringify(posted.data));
const gift=posted.data.offers.find(o=>o.seller===posted.data.me.id&&o.want_qty===0);
assert(gift,'gift offer must request no item');
assert.equal((await call('/api/state',null,seller.code)).data.me.state.stock[0],1,'gift stock must be escrowed');
assert.equal((await act(seller.code,'accept',{offer:gift.id})).status,400,'seller cannot claim own gift');
const accepted=await act(recipient.code,'accept',{offer:gift.id});
assert.equal(accepted.status,200,JSON.stringify(accepted.data));
assert.equal(accepted.data.me.state.stock[0],1,'empty-stock recipient must receive gift');
assert.equal((await act(other.code,'accept',{offer:gift.id})).status,409,'gift can be claimed only once');
assert.equal((await call('/api/state',null,seller.code)).data.me.state.stock[0],1,'seller must not lose stock twice');
console.log('PASS: one student can share an escrowed item with a zero-stock classmate exactly once');
