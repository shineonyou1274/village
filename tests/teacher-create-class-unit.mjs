import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {api} from '../src/api.mjs';
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
function prepare(q,args=[]){return {bind(...v){return prepare(q,v)},async first(){return sql.prepare(q).get(...args)||null},async all(){return {results:sql.prepare(q).all(...args)}},async run(){return {meta:{changes:Number(sql.prepare(q).run(...args).changes)}}}}}
const db={prepare,async batch(stmts){sql.exec('BEGIN');try{const out=[];for(const s of stmts)out.push(await s.run());sql.exec('COMMIT');return out}catch(e){sql.exec('ROLLBACK');throw e}}};
async function req(body,token,route='/api/create'){const r=await api(new Request('http://test'+route,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}),{DB:db,TEACHER_SETUP_KEY:'local-test-key'});return {status:r.status,data:await r.json()}}
try{
 assert.equal((await req({size:4})).status,403);assert.equal((await req({setupKey:'wrong',size:4})).status,403);
 const parent=await req({setupKey:'local-test-key',size:120,roleMode:'balanced'});assert.equal(parent.status,201);
 const originalRooms=sql.prepare('SELECT * FROM rooms ORDER BY id').all(),originalPlayers=sql.prepare('SELECT * FROM players ORDER BY id').all();
 assert.equal((await req({size:4},parent.data.students[0].code)).status,403);
 assert.equal((await req({size:4},'0'.repeat(48))).status,401);
 const child=await req({size:4,roleMode:'balanced'},parent.data.teacherKey);assert.equal(child.status,201);assert.equal(child.data.students.length,4);assert.notEqual(child.data.roomCode,parent.data.roomCode);
 assert.deepEqual(sql.prepare('SELECT * FROM rooms WHERE code=?').all(parent.data.roomCode),originalRooms);
 assert.deepEqual(sql.prepare('SELECT * FROM players WHERE room=? ORDER BY id').all(originalRooms[0].id),originalPlayers);
 const newRoom=sql.prepare('SELECT * FROM rooms WHERE code=?').get(child.data.roomCode);assert.equal(newRoom.day,1);assert.equal(newRoom.weather,0);assert.equal(newRoom.paused,0);
 for(const s of child.data.students){const st=await req(null,s.code,'/api/state');assert.equal(st.status,200);assert.equal(st.data.room.code,child.data.roomCode)}
 assert.equal((await req(null,child.data.teacherKey,'/api/state')).data.teacher,true);
 const roomCount=sql.prepare('SELECT count(*) n FROM rooms').get().n;
 assert.equal((await req({size:0},parent.data.teacherKey)).status,400);assert.equal((await req({size:4,roleMode:'bad'},parent.data.teacherKey)).status,400);assert.equal(sql.prepare('SELECT count(*) n FROM rooms').get().n,roomCount);
 console.log('PASS: existing teacher creates independent 4-person class; 120 existing students/settings unchanged; anonymous/student/invalid codes denied; old setup flow and new logins work');
}finally{sql.close()}
