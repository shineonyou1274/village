import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const base=process.env.TEST_URL||'http://127.0.0.1:8793';assert.equal(new URL(base).hostname,'127.0.0.1');
const setupKey=(await readFile('private/teacher-setup.txt','utf8')).trim();
async function req(route,body,token){const r=await fetch(base+route,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()}}
const made=await req('/api/create',{setupKey,size:4,roleMode:'balanced'});assert.equal(made.status,201);const room=made.data;
const settings=await req('/api/teacher',{day:1,weather:0,market:true,phase:'개인 성장',paused:false},room.teacherKey);assert.equal(settings.status,200);
assert.equal(settings.data.players.length,4);assert.equal(settings.data.room.market,true);assert.equal(settings.data.room.weather,0);
const links=await req('/api/teacher/entry-links',null,room.teacherKey);assert.equal(links.status,200);assert.equal(links.data.students.length,4);
for(const s of links.data.students){assert.match(s.token,/^[a-f0-9]{96}$/);const st=await req('/api/state',null,s.token);assert.equal(st.status,200);assert.equal(st.data.me.accountName,s.name);assert.equal(st.data.room.code,room.roomCode)}
assert.equal((await req('/api/teacher/entry-links',null,room.students[0].code)).status,403);
assert.equal((await fetch(base+'/campus')).status,200);
const teacherHTML=await (await fetch(base+'/teacher.html')).text();assert.match(teacherHTML,/result-export\.js/);
const html=await (await fetch(base+'/?entry=1&class='+room.roomCode)).text();assert.match(html,/result-export\.js/);
console.log('PASS: standalone Node server, 4-student class, 4 signed entry links, teacher-only authorization, main/library aliases and export asset');
