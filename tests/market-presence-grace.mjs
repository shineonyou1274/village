import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';

const base=process.env.TEST_URL||'http://127.0.0.1:8851';
const dbFile=path.resolve(process.env.TEST_DB||'');
assert(new URL(base).hostname==='127.0.0.1'&&dbFile.startsWith(path.resolve('test-output')+path.sep),'Use an isolated local test database');
const setup=(await readFile('private/teacher-setup.txt','utf8')).trim();
async function api(route,body,token){const response=await fetch(base+route,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const result=await response.json();assert(response.ok,`${route}: ${JSON.stringify(result)}`);return result}

const room=await api('/api/create',{setupKey:setup,size:2});
const [first,second]=room.students.map(student=>student.code);
await api('/api/teacher',{day:1,weather:0,phase:'협력',market:true,paused:false},room.teacherKey);
await Promise.all([first,second].map(token=>api('/api/market-presence',{action:'visit',spot:8},token)));
const secondId=(await api('/api/state',null,second)).me.id;
const db=new DatabaseSync(dbFile);
try{
 db.prepare('UPDATE market_visitors SET seen=? WHERE player=?').run(Date.now()-45000,secondId);
 const delayed=await api('/api/market-presence',null,first);
 assert(delayed.visitors.some(visitor=>visitor.id===secondId),'One delayed heartbeat must not mark a visible student away after 45 seconds');
 await api('/api/market-presence',{action:'leave'},second);
 const left=await api('/api/market-presence',null,first);
 assert(!left.visitors.some(visitor=>visitor.id===secondId),'An explicit leave must remove the student immediately');
 console.log('PASS: delayed heartbeat grace and immediate explicit departure');
}finally{db.close()}
