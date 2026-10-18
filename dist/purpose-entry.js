(()=>{
 const campus=!!document.querySelector('#studyPage'),seen='village-purpose-seen';
 const actor=()=>campus?data?.actor:classroomData?.me?.id;
 const pending=()=>!!actor()&&sessionStorage.getItem(seen)!==actor();
 const fetchAPI=(path,body)=>campus?request(path,body):schoolFetch(path,body);
 let purpose,loading=false,historyActor='',lastGoal='',board=null,studyBoard=null,renderKey='';
 const button=(text,fn,primary=false)=>{const b=document.createElement('button');b.type='button';b.textContent=text;if(primary)b.className='primary';b.onclick=fn;return b};
 const activeStudy=()=>campus?data?.current:studyBoard?.current;
 const continueLabel=()=>{const c=activeStudy();if(!c)return '공부 시작';const gap=Math.max(0,Math.floor((Date.now()-c.tick)/1000));const seconds=Math.min(c.plan*60,c.elapsed+(c.status==='active'&&gap<45?gap:0));return '공부 이어가기 · '+String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')};
 const done=()=>{sessionStorage.setItem(seen,actor());purpose?.close()};
 function focusStudy(){document.querySelector('[data-screen=study]')?.click();document.querySelector('[data-study-section=focus]')?.click();document.querySelector('.focus-card')?.scrollIntoView({block:'start'})}
 async function start(goal=''){
  if(loading)return;loading=true;const note=purpose?.querySelector('[role=status]');if(note)note.textContent='빈자리를 확인하고 있어요.';purpose?.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{
   const fresh=await fetchAPI('/api/campus');let result=fresh;
   if(fresh.current){if(!fresh.current.seatNumber){const seatNumber=Array.from({length:30},(_,i)=>i+1).find(n=>!fresh.seats.some(s=>s.studyRoom===fresh.home&&s.number===n));if(!seatNumber)throw Error('지금은 빈자리가 없어요. 잠시 뒤 다시 시작해 주세요.');result=await fetchAPI('/api/campus/study',{action:'claim',id:fresh.current.id,seatNumber,studyRoom:fresh.home})}if(result.current.status==='paused')result=await fetchAPI('/api/campus/study',{action:'resume',id:fresh.current.id})}
   else{const id=sessionStorage.getItem('study-start-id')||crypto.randomUUID();sessionStorage.setItem('study-start-id',id);result=await fetchAPI('/api/campus/study',{action:'start',id,goal,plan:25,seat:'도서관'});sessionStorage.removeItem('study-start-id')}
   done();if(campus){display(result);focusStudy()}else location.href='campus?quickStudy=1#study';
  }catch(e){if(note)note.textContent=e.message;else if(campus)message(e.message,true)}finally{loading=false;purpose?.querySelectorAll('button').forEach(b=>b.disabled=false)}
 }
 function showPurpose(){
  if(!pending()||loading)return;
  if(document.querySelector('dialog[open]:not(.purpose-entry)'))return;
  if(!purpose){purpose=document.createElement('dialog');purpose.className='purpose-entry';purpose.setAttribute('aria-labelledby','purposeTitle');purpose.innerHTML='<h2 id="purposeTitle">무엇을 시작할까요?</h2><p>하고 싶은 일을 바로 시작해요.</p><div class="purpose-actions"></div><label class="purpose-remember"><input type="checkbox"> 내 전용 기기에서만 기억하기</label><p role="status"></p>';purpose.addEventListener('cancel',e=>e.preventDefault());document.body.append(purpose);const remember=purpose.querySelector('.purpose-remember input');remember.checked=!!window.StudentMemory.read();remember.onchange=async()=>{window.StudentMemory.remember(remember.checked);if(remember.checked){try{const d=campus?await fetchAPI('/api/state'):classroomData;window.StudentMemory.save(d,sessionStorage.getItem('village-student-token'))}catch{remember.checked=false;window.StudentMemory.remember(false);purpose.querySelector('[role=status]').textContent='기기에 저장하지 못했어요. 다시 선택해 주세요.'}}}}
  purpose.querySelector('.purpose-remember').hidden=campus?!!data?.village?.trial:!!classroomData?.me?.state?.trial;const r=campus?board?.room:classroomData.room;const nextKey=JSON.stringify([actor(),lastGoal,r?.lessonActive,r?.paused,r?.phase,activeStudy()?.id,activeStudy()?.status]);if(purpose.open&&renderKey===nextKey)return;renderKey=nextKey;
  const host=purpose.querySelector('.purpose-actions');host.replaceChildren();
  const lesson=!!r?.lessonActive;
  if(lesson)host.append(button('오늘의 수업',()=>{done();if(campus)location.href='./#farm';else{gameNavigate(r.phase==='협력'?'season':'farm');window.CareerJourney?.sync()}},true));
  if(activeStudy()){const resume=button(continueLabel(),()=>start(),!lesson);resume.dataset.continueStudy='';host.append(resume)}
  else{
   if(lastGoal&&!lesson)host.append(button(`지난 목표로 다시 시작: “${lastGoal}” · 25분`,()=>start(lastGoal),true));
   const study=button('공부 시작',()=>start(lesson?lastGoal:''),!lesson);study.setAttribute('aria-label','공부 시작');
   if(lesson&&lastGoal){const hint=document.createElement('small');hint.textContent=`지난 목표: “${lastGoal}” · 25분`;hint.style.display='block';study.append(hint)}host.append(study);
  }
  if(!lesson)host.append(button('마을 들어가기',()=>{done();if(campus)location.href='./#farm';else{gameNavigate('farm');window.CareerJourney?.sync()}}));
  if(!purpose.open)purpose.showModal();
  if(historyActor!==actor()){historyActor=actor();const who=actor();fetchAPI('/api/campus').then(d=>{if(actor()!==who)return;studyBoard=d;lastGoal=d.history?.find(s=>s.goal&&s.goal!=='자유 공부')?.goal||'';if(purpose.open)showPurpose()}).catch(()=>{});if(campus)fetchAPI('/api/state').then(d=>{board=d;if(purpose.open)showPurpose()}).catch(()=>{})}
 }
 window.PurposeEntry={pending,start};
 setInterval(()=>{if(purpose?.open){const b=purpose.querySelector('[data-continue-study]');if(b)b.textContent=continueLabel()}},1000);
 if(campus){
  const before=display;display=function(d){before(d);if(new URLSearchParams(location.search).has('quickStudy')&&d.current){sessionStorage.setItem(seen,d.actor);const url=new URL(location.href);url.searchParams.delete('quickStudy');history.replaceState(null,'',url.pathname+url.search+url.hash);setTimeout(focusStudy,0)}else showPurpose();const input=document.querySelector('#quickGoal');if(input&&document.activeElement!==input)input.value=d.current?.goal==='자유 공부'?'':d.current?.goal||''};
  const form=document.createElement('form');form.className='quick-goal';form.innerHTML='<label>할 일은 나중에 적어도 돼요.<input id="quickGoal" maxlength="120" placeholder="어떤 공부를 할까요?"></label><button>할 일 저장</button><p role="status"></p>';const goalDetails=document.createElement('details');const goalSummary=document.createElement('summary');goalSummary.textContent='할 일 적기 · 선택이에요';goalDetails.className='quick-goal-details';goalDetails.append(goalSummary,form);document.querySelector('#activeGoal').after(goalDetails);form.onsubmit=async e=>{e.preventDefault();const b=form.querySelector('button');b.disabled=true;try{const d=await request('/api/campus/study',{action:'goal',id:data.current.id,goal:form.querySelector('input').value});display(d);form.querySelector('p').textContent='할 일을 저장했어요.'}catch(e){form.querySelector('p').textContent=e.message}finally{b.disabled=false}};
  const change=button('자리 바꾸기',()=>{const free=(data.seats||[]),choices=Array.from({length:30},(_,i)=>i+1).filter(n=>!free.some(s=>s.studyRoom===data.home&&s.number===n));let dlg=document.querySelector('#quickSeatChoice');if(!dlg){dlg=document.createElement('dialog');dlg.id='quickSeatChoice';document.body.append(dlg)}dlg.replaceChildren();const title=document.createElement('h2');title.textContent='빈자리로 바꿔요.';dlg.append(title);const note=document.createElement('p');note.setAttribute('role','status');if(!choices.length)note.textContent='지금은 빈자리가 없어요.';choices.forEach(n=>dlg.append(button(n+'번',async()=>{dlg.querySelectorAll('button').forEach(b=>b.disabled=true);try{const active=data.current.status==='active';const d=await request('/api/campus/study',{action:'claim',id:data.current.id,seatNumber:n,studyRoom:data.home});display(d);if(active)display(await request('/api/campus/study',{action:'resume',id:d.current.id}));dlg.close();focusStudy()}catch(e){note.textContent=e.message;dlg.querySelectorAll('button').forEach(b=>b.disabled=false)}})));dlg.append(note,button('닫기',()=>dlg.close()));dlg.showModal()});change.className='quiet quick-seat-change';document.querySelector('#activeSeat').after(change);
  document.querySelector('#studyGoal').required=false;document.querySelector('#studyPlan').value='25';
  if(data)display(data);
 }else{
  const before=applySchool;applySchool=function(d){before(d);showPurpose()};if(window.classroomActive)showPurpose();
 }
 document.addEventListener('close',()=>setTimeout(showPurpose,0),true);
})();
