import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';

const base=process.env.TEST_URL||'http://127.0.0.1:8796';
assert.equal(new URL(base).hostname,'127.0.0.1');
const key=process.env.TEST_SETUP_KEY,dbPath=process.env.TEST_DB;
assert(key&&dbPath&&path.resolve(dbPath).startsWith(path.resolve('test-output')+path.sep),'Use an isolated local test DB and setup key');
async function request(route,body,token){const r=await fetch(base+route,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()}}
async function action(token,kind,more={}){return request('/api/action',{action:kind,requestId:randomUUID(),...more},token)}
const room=(await request('/api/create',{setupKey:key,size:2})).data;
const [seller,buyer]=room.students.map(s=>s.code);
assert.equal((await request('/api/teacher',{day:1,weather:0,phase:'협력',market:true,paused:false},room.teacherKey)).status,200);
const sellerId=(await request('/api/state',null,seller)).data.me.id;
const buyerId=(await request('/api/state',null,buyer)).data.me.id;
const db=new DatabaseSync(dbPath);
try{
 db.prepare("UPDATE players SET state=json_set(state,'$.farm.picked',6) WHERE id=?").run(sellerId);
 assert.equal((await action(seller,'plant',{plot:0,crop:1})).status,200);
 assert.equal((await action(seller,'water',{plot:0})).status,200);
 db.prepare("UPDATE players SET state=json_set(state,'$.farm.plots[0].wateredAt',?) WHERE id=?").run(Date.now()-60000,sellerId);
 assert.equal((await action(seller,'harvest',{plot:0})).status,200);
 const state=(await request('/api/state',null,seller)).data.me.state;
 assert.equal(state.garden.stock[1],3,'One carrot harvest adds three to current stock');
 assert.equal(state.garden.harvested[1],3,'Cumulative carrot harvest also increases by three');
 assert.equal((await action(seller,'offer',{giveItem:4,giveQty:5,wantItem:0,wantQty:1})).status,400,'Five carrots cannot be offered from a stock of three');
 assert.equal((await action(seller,'offer',{giveItem:4,giveQty:3,wantItem:0,wantQty:1})).status,200);
 assert.equal((await request('/api/state',null,seller)).data.me.state.garden.stock[1],0,'Offered carrots move into escrow');
 assert.equal((await action(seller,'offer',{giveItem:4,giveQty:1,wantItem:0,wantQty:1})).status,400,'Escrowed carrots cannot be offered again');
 const offer=(await request('/api/state',null,seller)).data.offers.find(o=>o.seller===sellerId);
 db.prepare("UPDATE players SET state=json_set(state,'$.stock[0]',1) WHERE id=?").run(buyerId);
 assert.equal((await action(buyer,'accept',{offer:offer.id})).status,200);
 assert.equal((await request('/api/state',null,buyer)).data.me.state.garden.stock[1],3);
 assert.equal((await request('/api/state',null,seller)).data.me.state.stock[0],1);
 assert.equal((await action(buyer,'accept',{offer:offer.id})).status,409,'Offer cannot be accepted twice');

 assert.equal((await request('/api/plaza',{action:'visit'},seller)).status,200);
 assert.equal((await request('/api/plaza',{action:'move',x:3,z:-15},seller)).status,200);
 db.prepare('UPDATE plaza_visitors SET moved=? WHERE player=?').run(Date.now()-3000,sellerId);
 assert.equal((await request('/api/plaza',{action:'leave'},seller)).status,200);
 let plaza=(await request('/api/plaza',{action:'visit'},buyer)).data;
 assert(plaza.visitors.find(p=>p.id===sellerId)?.away,'Departed player remains visible as away');
 assert.equal((await request('/api/market-presence',{action:'visit',spot:8},seller)).status,200);
 plaza=(await request('/api/plaza',null,buyer)).data;
 assert(plaza.visitors.find(p=>p.id===sellerId)?.atMarket,'Player in market has a distinct status');
 db.prepare('UPDATE plaza_visitors SET seen=? WHERE player=?').run(Date.now()-46000,sellerId);
 assert.equal((await request('/api/market-presence',{action:'leave'},seller)).status,200);
 const returned=(await request('/api/plaza',{action:'visit'},seller)).data.visitors.find(p=>p.id===sellerId);
 assert(Math.abs(returned.x-3)<.1&&Math.abs(returned.z+15)<.1,'Returning within 90 seconds restores last position');
 db.prepare('UPDATE plaza_visitors SET seen=? WHERE player=?').run(Date.now()-106000,sellerId);
 assert.equal((await request('/api/plaza',null,buyer)).data.visitors.some(p=>p.id===sellerId),false,'Away player disappears after about 90 seconds');
 console.log('PASS: carrot stock, escrow, one-time exchange, away/market status, position resume');
}finally{db.close()}
