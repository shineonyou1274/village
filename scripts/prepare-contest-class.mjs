import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
const base=process.env.CONTEST_URL||'https://shiny-village-student-preview.peace-shiny.chatgpt.site';
const file='private/nwec26-judging-class.json';await mkdir('private',{recursive:true});
async function request(route,body,token){const r=await fetch(base+route,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});const d=await r.json();if(!r.ok)throw Error(`${route}: ${r.status} ${d.error}`);return d}
let room;if(existsSync(file)){room=JSON.parse(await readFile(file,'utf8'));if(room.base!==base)throw Error('Existing judging class has another origin');}
else {const setupKey=(await readFile('private/teacher-setup.txt','utf8')).trim();room={...await request('/api/create',{setupKey,size:4,roleMode:'balanced'}),base};await writeFile(file,JSON.stringify(room,null,2),{mode:0o600});}
// Only the newly created judging class is configured; existing classrooms stay intact.
const state=await request('/api/teacher',{day:1,weather:0,phase:'개인 성장',market:true,paused:false},room.teacherKey);
if(state.players.length!==4||state.room.day!==1||state.room.weather!==0||!state.room.market||state.room.paused)throw Error('Judging class verification failed');
const links=await request('/api/teacher/entry-links',null,room.teacherKey);
const text=['NWEC 26 · Shiny Village 심사용 실제 학급','교사만 보관하세요. 학생에게는 자기 코드만 전달합니다.',`학생 입장: ${base}/`,`교사 운영실: ${base}/teacher.html`,`학급 코드: ${room.roomCode}`,`교사 코드: ${room.teacherKey}`,`공통 입장 링크: ${base}/?entry=1&class=${room.roomCode}#farm`,'상태: 1일차 · 맑음 · 장터 열림 · 수업 진행','',...room.students.flatMap((s,i)=>[`${s.name} · 입장 코드: ${s.code}`,`전용 링크: ${base}/?entry=1#join=${links.students[i].token}`]),'','2026-10-19~2026-10-26 심사 기간 배포 금지.'];
await writeFile('private/NWEC26-심사용-입장정보.txt',text.join('\n'),{mode:0o600});
console.log(JSON.stringify({ready:true,classCode:room.roomCode,students:4,weather:state.room.weather,day:state.room.day,market:state.room.market,credentialFile:'private/NWEC26-심사용-입장정보.txt'}));
