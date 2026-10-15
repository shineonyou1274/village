// Export only class aggregates: student names, codes and private reflections stay out.
(()=>{
 const names=['상추','우유','사과','생선'],roles=['안전한 길 연결','전력 복구','품질 검수','급식 인계'];
 function summary(){
  const teacher=typeof data!=='undefined'&&data?.teacher;
  const d=teacher?data:window.classroomData;
  const m=teacher?d.mission:typeof currentMission==='function'?currentMission():null;
  const room=d?.room||{code:'체험 마을',day:typeof state!=='undefined'?state.day:1};
  const food=m?.food||room.coop||(typeof state!=='undefined'?state.donated:[0,0,0,0]);
  return {room,mission:m,food:food||[0,0,0,0],goal:m?.goal||room.goal||0};
 }
 async function save(){
  try{
   await document.fonts.ready;
   const {room,mission:m,food,goal}=summary(),c=document.createElement('canvas');c.width=1200;c.height=900;
   const g=c.getContext('2d');g.fillStyle='#f4f7ee';g.fillRect(0,0,1200,900);
   g.fillStyle='#24553d';g.fillRect(0,0,1200,180);g.fillStyle='#fff';g.font='bold 44px sans-serif';g.fillText('Shiny Village · 함께 만든 한 끼',60,83);
   g.font='26px sans-serif';g.fillText(`학급 ${room.code} · ${room.day}일째 · ${new Date().toLocaleDateString('ko-KR')}`,60,135);
   g.fillStyle='#24553d';g.font='bold 32px sans-serif';g.fillText(m?(m.completed?'협력 이야기 · 급식 준비 완료':'협력 이야기 · 진행 중'):'공동 도시락 · 우리 반 진행',60,246);
   g.font='28px sans-serif';names.forEach((n,i)=>g.fillText(`${n}   ${food[i]||0} / ${goal}개`,60+(i%2)*550,315+Math.floor(i/2)*64));
   if(m){g.font='bold 30px sans-serif';g.fillText('직업별 협력 참여',60,490);g.font='26px sans-serif';roles.forEach((n,i)=>g.fillText(`${n}   ${m.counts[i]||0} / ${m.target}명`,60,550+i*48));}
   else {g.font='26px sans-serif';g.fillText('서로의 생산물을 모아 공동 식탁을 준비해요.',60,510);}
   g.font='24px sans-serif';g.fillText('돌아보기: 내 일은 누구의 일과 이어졌나요?',60,800);g.font='20px sans-serif';g.fillText('학급 공동 결과 · 개인별 순위와 입장 정보는 포함하지 않습니다.',60,851);
   const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!blob)throw Error('이미지를 만들지 못했어요.');
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`Shiny-Village-${room.code}-협력결과.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   if(typeof toast==='function')toast('결과 이미지를 저장했어요. 팀보드에 첨부해 주세요.');
  }catch(e){if(typeof toast==='function')toast(e.message);else alert(e.message)}
 }
 window.VillageResultExport={save,summary};
 function button(){const b=document.createElement('button');b.type='button';b.textContent='결과 이미지 저장 · 팀보드용';b.dataset.resultExport='';b.onclick=save;return b}
 if(document.querySelector('#teacherStory')){const box=document.createElement('section');box.className='teacher-card';box.innerHTML='<h2>협력 이야기·공동 도시락 결과</h2><p>학급 공동 진행을 PNG로 저장하여 웨일 팀보드에 첨부하세요.</p>';box.append(button());document.querySelector('#teacherStory').after(box)}
 else if(typeof renderPanel==='function'){const original=renderPanel;renderPanel=function(){original();if(tab==='season'&&!document.querySelector('#panel [data-result-export]'))document.querySelector('#panel')?.append(button())};}
})();
