import {readFile} from 'node:fs/promises';
const d=JSON.parse(await readFile('private/load120-hosted.json','utf8'));let cursor=0,failed=0;const students=d.rooms.flatMap(r=>r.students);
async function call(path,body,token){for(let n=0;n<3;n++){try{const r=await fetch(d.base+path,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);return true}catch(e){if(n===2){console.log({error:e.message,cause:e.cause?.code});return false}}}}
await Promise.all(Array.from({length:8},async()=>{while(cursor<students.length){const i=cursor++;if(!await call('/api/campus/study',{action:'cancel',id:d.run+'-study-'+i},students[i].code))failed++}}));
for(const r of d.rooms)if(!await call('/api/teacher',{day:1,weather:0,phase:'개인 성장',market:false,paused:true},r.teacherKey))failed++;
console.log({testSessions:students.length,cleanupFailures:failed,testClassesPaused:4});
