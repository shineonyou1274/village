import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const setup=(await readFile(path.join(root,'private','teacher-setup.txt'),'utf8')).trim();
await mkdir(path.join(root,'test-output'),{recursive:true});
const dbFile=path.join(root,'test-output',`reset-${Date.now()}.sqlite`);
const socket=createServer();
await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));
const port=socket.address().port;
await new Promise(resolve=>socket.close(resolve));
const base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,DB_FILE:dbFile,PORT:String(port)},stdio:'ignore'});
async function request(route,body,token=''){
 const response=await fetch(base+route,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(8000)});
 return {status:response.status,data:await response.json()};
}
try{
 let ready=false;
 for(let i=0;i<60;i++){
  try{if((await request('/api/health')).status===200){ready=true;break}}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 assert(ready,'local test server did not start');
 const created=await request('/api/create',{setupKey:setup,size:4,roleMode:'balanced'});
 const other=await request('/api/create',{setupKey:setup,size:2,roleMode:'balanced'});
 assert.equal(created.status,201);
 const room=created.data,student=room.students[0];
 assert.equal((await request('/api/action',{action:'produce',requestId:'reset-produce-1'},student.code)).status,200);
 const before=await request('/api/state',undefined,student.code);
 assert(before.data.me.state.stock.some(n=>n>0));
 const backup=await request('/api/teacher/reset-backup',undefined,room.teacherKey);
 assert.equal(backup.status,200);
 assert.equal(backup.data.records.players.length,4);
 assert(backup.data.records.commands.length>0);
 assert(!Object.hasOwn(backup.data.records.players[0],'token_hash'));
 const expectedRoomVersion=backup.data.records.rooms[0].version;
 const checkpoint={expectedRoomVersion,expectedPlayerVersions:backup.data.records.players.reduce((sum,p)=>sum+p.version,0),expectedPlayerCount:backup.data.records.players.length,expectedCommandCount:backup.data.records.commands.length,expectedOfferCount:backup.data.records.offers.length};
 assert.equal((await request('/api/teacher/reset',{classCode:'WRONG',confirm:'RESET_CLASS_ACTIVITY',mode:'choice'},room.teacherKey)).status,400);
 assert.equal((await request('/api/teacher/reset',{classCode:room.roomCode,confirm:'RESET_CLASS_ACTIVITY',mode:'choice'},student.code)).status,403);
 assert.equal((await request('/api/teacher/reset',{classCode:room.roomCode,confirm:'RESET_CLASS_ACTIVITY',mode:'choice',...checkpoint,expectedRoomVersion:expectedRoomVersion-1},room.teacherKey)).status,409);
 assert.equal((await request('/api/teacher/reset',{classCode:room.roomCode,confirm:'RESET_CLASS_ACTIVITY',mode:'choice',...checkpoint,expectedCommandCount:checkpoint.expectedCommandCount-1},room.teacherKey)).status,409);
 const reset=await request('/api/teacher/reset',{classCode:room.roomCode,confirm:'RESET_CLASS_ACTIVITY',mode:'choice',...checkpoint},room.teacherKey);
 assert.equal(reset.status,200);
 assert.equal(reset.data.reset.students,4);
 assert.equal(reset.data.room.roleMode,'choice');
 assert.equal(reset.data.room.paused,true);
 assert(reset.data.players.every(p=>p.rolePending));
 const after=await request('/api/state',undefined,student.code);
 assert.equal(after.status,200);
 assert.equal(after.data.me.state.coins,80);
 assert(after.data.me.state.stock.every(n=>n===0));
 const cleared=await request('/api/teacher/reset-backup',undefined,room.teacherKey);
 assert.equal(cleared.data.records.commands.length,0);
 assert.equal(cleared.data.records.offers.length,0);
 const untouched=await request('/api/state',undefined,other.data.teacherKey);
 assert.equal(untouched.data.room.roleMode,'balanced');
 assert.equal(untouched.data.players.length,2);
 console.log('class reset: backup, authorization, account preservation, room isolation, and clean state passed');
}finally{child.kill()}
