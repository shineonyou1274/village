import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base=process.env.LOAD_TEST_URL||'http://127.0.0.1:8793';
assert(['http://127.0.0.1:8793','https://ieum-village-play-0921.peace-shiny.chatgpt.site'].includes(base),'Only isolated local server or the owned Shiny Village site');
const hosted=base.startsWith('https:'),run=randomUUID(),rows=[],checks=[],rooms=[],students=[];let sessions=[];
await mkdir('test-output',{recursive:true});
const file='test-output/load120-'+(hosted?'hosted':'local')+'.json';
let inFlight=0;const waiting=[];const limit=120;async function enter(){if(inFlight>=limit)await new Promise(r=>waiting.push(r));else inFlight++}function leave(){const next=waiting.shift();if(next)next();else inFlight--}
const stats=()=>Object.fromEntries([...new Set(rows.map(r=>r.phase))].map(phase=>{const a=rows.filter(r=>r.phase===phase),t=a.map(r=>r.ms).sort((a,b)=>a-b);return [phase,{requests:a.length,failures:a.filter(r=>!r.ok).length,p50_ms:t[Math.floor(t.length*.5)],p95_ms:t[Math.min(t.length-1,Math.floor(t.length*.95))],max_ms:t.at(-1)}]}));
async function req(phase,url,body,token){const start=performance.now();let status=0;await enter();try{const r=await fetch(base+url,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});status=r.status;const d=await r.json();if(!r.ok)throw Error(url+' HTTP '+status+': '+d.error);rows.push({phase,ms:Math.round(performance.now()-start),ok:true,status});return d;}catch(e){rows.push({phase,ms:Math.round(performance.now()-start),ok:false,status,error:e.message,cause:e.cause?.code||e.cause?.message||null});throw e}finally{leave()}}
async function wave(phase,fn){const start=Date.now(),out=await Promise.allSettled(students.map(fn));const bad=out.filter(x=>x.status==='rejected');console.log(JSON.stringify({phase,requests:students.length,elapsed_ms:Date.now()-start,failed:bad.length}));if(bad.length)throw Error(phase+': '+bad.length+' failures; first '+bad[0].reason.message);return out.map(r=>r.value)}
const act=(phase,s,i,action,extra={})=>req(phase,'/api/action',{action,...extra,requestId:run+'-'+action+'-'+i},s.code);
let passed=false,error=null,started=Date.now();
try{
 await req('health','/api/health');const key=(await readFile('private/teacher-setup.txt','utf8')).trim();
 for(let i=0;i<4;i++)rooms.push(await req('setup','/api/create',{setupKey:key,size:30}));
 await writeFile('private/load120-'+(hosted?'hosted':'local')+'.json',JSON.stringify({run,base,rooms}));
 for(let i=1;i<4;i++)await req('setup','/api/campus/link',{code:rooms[i].roomCode,teacherKey:rooms[i].teacherKey,label:'성능검증 전용 '+(i+1)+'반'},rooms[0].teacherKey);
 rooms.forEach(r=>r.students.forEach(s=>students.push({...s,roomCode:r.roomCode})));
 await wave('join',(s)=>req('join','/api/join',{roomCode:s.roomCode,code:s.code}));checks.push('120 joins across four new, separate 30-student classes');
 await wave('plant',(s,i)=>act('plant',s,i,'plant',{plot:0,crop:0}));await wave('water',(s,i)=>act('water',s,i,'water',{plot:0}));const watered=Date.now();
 sessions=await wave('study-start',(s,i)=>req('study-start','/api/campus/study',{action:'start',id:run+'-study-'+i,goal:'성능검증 비공개 목표 '+i,plan:15,seat:'도서관',seatNumber:i%30+1},s.code));
 checks.push('120 simultaneous study sessions, unique seats in four classes');
 for(let round=0;round<4;round++){
  const tick=Date.now();await wave('mixed-round-'+round,async(s,i)=>{
   const jobs=[req('state-poll','/api/state',null,s.code),req('study-heartbeat','/api/campus/study',{action:'heartbeat',id:run+'-study-'+i},s.code)];if(round%2===0)jobs.push(req('growth-poll','/api/growth',null,s.code));
   const settled=await Promise.allSettled(jobs);const failure=settled.find(r=>r.status==='rejected');if(failure)throw failure.reason;const [state,campus]=settled.map(r=>r.value);assert.equal(state.me.state.farm.plots[0].seeded,true);assert.equal(campus.current.goal,'성능검증 비공개 목표 '+i);assert.equal(campus.peers.length,120);assert(campus.peers.every(p=>!('goal' in p)));assert.equal(new Set(campus.seats.map(s=>s.studyRoom+':'+s.number)).size,120);return null;
  });
  if(round<3)await new Promise(r=>setTimeout(r,Math.max(0,15000-(Date.now()-tick))));
 }
 checks.push('Four synchronized polling rounds at 15-second intervals; peer privacy and 120 distinct occupied seats');
 if(Date.now()-watered<21000)await new Promise(r=>setTimeout(r,21000-(Date.now()-watered)));
 await wave('harvest',(s,i)=>act('harvest',s,i,'harvest',{plot:0}));
 await wave('donate-and-replay',async(s,i)=>{await act('donate',s,i,'crop_donate',{crop:0,qty:1});return act('donate-replay',s,i,'crop_donate',{crop:0,qty:1})});
 await wave('integrity',async(s)=>{const d=await req('integrity','/api/growth',null,s.code);assert.equal(d.stock[0],1);assert.equal(d.project.totals.find(c=>c.crop===0).qty,30);assert(d.badges.find(b=>b.id==='first-harvest').earned)});
 checks.push('120 harvests and 240 donation/replay requests produce exactly 120 donations; per-class totals and inventories verified');passed=true;
}catch(e){error=e.message;console.error(error)}finally{
 // End only sessions created by this run; leave test credentials private for auditing.
 if(sessions.length)await wave('cleanup',(s,i)=>req('cleanup','/api/campus/study',{action:'cancel',id:run+'-study-'+i},s.code)).catch(e=>{passed=false;error=(error||'')+' cleanup: '+e.message});
 const report={testedAt:new Date().toISOString(),base,passed,error,duration_ms:Date.now()-started,totalRequests:rows.length,totalFailures:rows.filter(r=>!r.ok).length,maxInFlight:limit,errors:rows.filter(r=>!r.ok).slice(0,10),checks,metrics:stats(),limitations:['Synthetic HTTP requests from one machine, not 120 rendered browsers','Does not establish classroom Wi-Fi capacity or low-end device frame rate','Uses only newly created test classes; existing student records are not modified']};await writeFile(file,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
process.exitCode=passed?0:1;

