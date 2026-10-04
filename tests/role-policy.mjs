import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const setup=(await readFile(path.join(root,'private','teacher-setup.txt'),'utf8')).trim();
await mkdir(path.join(root,'test-output'),{recursive:true});
const dbFile=path.join(root,'test-output',`roles-${Date.now()}.sqlite`);
const server=createServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
await new Promise(resolve=>server.close(resolve));
const base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,DB_FILE:dbFile,PORT:String(port)},stdio:'ignore'});
async function request(route,body,token=''){
 const response=await fetch(base+route,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(8000)});
 return {status:response.status,data:await response.json()};
}
let id=0;
const act=(token,action,extra={})=>request('/api/action',{action,...extra,requestId:`role-test-${++id}`},token);
try{
 let ready=false;
 for(let i=0;i<60;i++){
  try{if((await request('/api/health')).status===200){ready=true;break}}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 assert(ready,'local test server did not start');
 const balanced=await request('/api/create',{setupKey:setup,size:8,roleMode:'balanced'});
 assert.equal(balanced.status,201);
 assert.deepEqual([0,1,2,3].map(job=>balanced.data.students.filter(s=>s.role===job).length),[2,2,2,2]);
 const roomA=balanced.data;
 let board=await request('/api/state',undefined,roomA.teacherKey);
 assert.equal(board.data.room.roleMode,'balanced');
 const first=roomA.students[0];
 assert.equal((await act(first.code,'plant',{plot:0})).status,200);
 const original=board.data.players.find(p=>p.accountName===first.name).job;
 const changed=await request('/api/teacher/roles',{mode:'choice'},roomA.teacherKey);
 assert.equal(changed.status,200);
 assert.equal(changed.data.roleAssignment.changed,7);
 assert.equal(changed.data.roleAssignment.preserved,1);
 const retained=changed.data.players.find(p=>p.accountName===first.name);
 assert.equal(retained.job,original);
 assert.equal(retained.rolePending,false);
 assert.equal(changed.data.players.filter(p=>p.rolePending).length,7);
 const choice=await request('/api/create',{setupKey:setup,size:4,roleMode:'choice'});
 assert.equal(choice.status,201);
 assert(choice.data.students.every(s=>s.role===null));
 const roomB=choice.data;
 assert.equal((await act(roomB.students[0].code,'plant',{plot:0})).status,409);
 assert.equal((await act(roomB.students[3].code,'profile',{name:'테스트 학생'})).status,200);
 const concurrent=await Promise.all([0,1].map(i=>act(roomB.students[i].code,'job',{job:0})));
 assert.deepEqual(concurrent.map(x=>x.status).sort(),[200,409]);
 const loser=concurrent.findIndex(x=>x.status===409);
 assert.equal((await act(roomB.students[loser].code,'job',{job:1})).status,200);
 assert.equal((await act(roomB.students[2].code,'job',{job:2})).status,200);
 assert.equal((await act(roomB.students[3].code,'job',{job:3})).status,200);
 board=await request('/api/state',undefined,roomB.teacherKey);
 assert.deepEqual([0,1,2,3].map(job=>board.data.players.filter(p=>p.job===job&&!p.rolePending).length),[1,1,1,1]);
 assert.equal((await act(roomB.students[3].code,'produce')).status,200);
 assert.equal((await request('/api/teacher/roles',{mode:'balanced'},roomB.students[3].code)).status,403);
 const pending=await request('/api/create',{setupKey:setup,size:2,roleMode:'choice'});
 assert.equal((await act(pending.data.students[0].code,'profile',{name:'새 이름'})).status,200);
 const switched=await request('/api/teacher/roles',{mode:'balanced'},pending.data.teacherKey);
 assert.equal(switched.data.roleAssignment.changed,2);
 assert.equal(switched.data.players.find(p=>p.name==='새 이름').rolePending,false);
 console.log('role policy: balanced allocation, teacher change, progress preservation, first-come capacity, and authorization passed');
}finally{child.kill()}
