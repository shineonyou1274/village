(()=>{
 const campus=!!document.querySelector('#studyPage');
 const bar=document.createElement('nav');bar.className='student-navigation';bar.setAttribute('aria-label','학생 활동과 계정');
 bar.innerHTML='<button id="dailyQuizShortcut">💡 오늘의 직업 퀴즈</button><button id="studentLogout">로그아웃 · 학생 바꾸기</button><span id="studentNavigationStatus" role="status"></span>';
 document.querySelector('header').after(bar);
 const note=t=>document.querySelector('#studentNavigationStatus').textContent=t;
 let leaving=false;
 window.logoutStudent=async(confirmed=false)=>{
  if(!confirmed){
   let dialog=document.querySelector('#studentSwitchConfirm');
   if(!dialog){dialog=document.createElement('dialog');dialog.id='studentSwitchConfirm';dialog.className='student-switch-confirm';dialog.innerHTML='<h2>학생을 바꿀까요?</h2><p>지금까지 한 농사와 공부 기록은 그대로 남아요. 이 기기에서는 지난 학생 계정으로 코드 없이 다시 들어올 수 있어요.</p><div class="dialog-actions"><button type="button" data-stay>계속하기</button><button type="button" class="primary" data-switch>나가서 학생 바꾸기</button></div>';document.body.append(dialog);dialog.querySelector('[data-stay]').onclick=()=>dialog.close();dialog.querySelector('[data-switch]').onclick=()=>{dialog.close();window.logoutStudent(true)}}
   if(!dialog.open)dialog.showModal();return;
  }
  if(leaving)return;
  if((typeof schoolPending!=='undefined'&&schoolPending)||(typeof busy!=='undefined'&&busy)){note('지금 작업을 저장 중이에요. 잠시 뒤 학생 바꾸기를 다시 눌러 주세요.');return}
  leaving=true;document.querySelector('#studentLogout').disabled=true;const visibleSwitch=document.querySelector('#compactStudentSwitch');if(visibleSwitch)visibleSwitch.disabled=true;
  const auth=sessionStorage.getItem('village-student-token');
  const pending=sessionStorage.getItem('village-pending-command');
  if(auth&&pending){
   note('이전 작업의 저장 결과를 확인하고 있어요…');
   try{
    const response=await fetch('/api/action',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+auth},body:pending,signal:AbortSignal.timeout(8000)});
    if(response.ok||response.status<500)sessionStorage.removeItem('village-pending-command');
    else throw Error('server');
   }catch{
    note('이전 작업의 저장을 확인하지 못했어요. 연결을 확인한 뒤 다시 눌러 주세요.');
    leaving=false;document.querySelector('#studentLogout').disabled=false;if(visibleSwitch)visibleSwitch.disabled=false;return;
   }
  }
  note('공부 상태를 저장하고 나가고 있어요…');
  try{
   if(auth){
    const call=async(body)=>{const r=await fetch(body?'/api/campus/study':'/api/campus',{method:body?'POST':'GET',headers:{'content-type':'application/json',authorization:'Bearer '+auth},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('connection');return r.json()};
    const board=await call();if(board.current)await call({action:'pause',id:board.current.id});
   }
  }catch{/* Local sign-out must work even when the server cannot be reached. */}
  for(const key of ['village-student-token','study-start-id'])sessionStorage.removeItem(key);
  location.replace('index.html?entry=1');
 };
 document.querySelector('#studentLogout').onclick=window.logoutStudent;
 const openQuiz=()=>{
  if(campus){location.href='index.html#quiz';return}
  if((document.querySelector('#dialog')?.open&&document.querySelector('#schoolEntry'))){note('학생 코드로 입장하면 오늘의 직업 퀴즈를 풀 수 있어요.');return}
  if(state.job===null){note('먼저 내 직업을 선택해 주세요.');document.querySelector('#jobs').click();return}
  if(state.quizDay===state.day){note('오늘 퀴즈를 완료했어요! 다음 수업일에 다시 도전해요.');return}
  quiz('daily');
 };
 document.querySelector('#dailyQuizShortcut').onclick=openQuiz;
 if(!campus&&location.hash==='#quiz'){
  const check=setInterval(()=>{if((document.querySelector('#dialog')?.open&&document.querySelector('#schoolEntry'))||(!window.classroomActive&&sessionStorage.getItem('village-student-token')))return;clearInterval(check);window.villageNavigate?.('activity',true);openQuiz()},250);
 }
})();
