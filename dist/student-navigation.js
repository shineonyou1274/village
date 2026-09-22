(()=>{
 const campus=!!document.querySelector('#studyPage');
 const bar=document.createElement('nav');bar.className='student-navigation';bar.setAttribute('aria-label','학생 활동과 계정');
 bar.innerHTML='<button id="dailyQuizShortcut">💡 오늘의 직업 퀴즈</button><button id="studentLogout">로그아웃 · 학생 바꾸기</button><span id="studentNavigationStatus" role="status"></span>';
 document.querySelector('header').after(bar);
 const note=t=>document.querySelector('#studentNavigationStatus').textContent=t;
 let leaving=false;
 window.logoutStudent=async()=>{
  if(leaving)return;
  if((typeof schoolPending!=='undefined'&&schoolPending)||(typeof busy!=='undefined'&&busy)||sessionStorage.getItem('village-pending-command')){note('저장 확인 중이에요. 잠시 뒤 다시 눌러 주세요.');return}
  leaving=true;document.querySelector('#studentLogout').disabled=true;note('공부 상태를 저장하고 나가고 있어요…');
  const auth=sessionStorage.getItem('village-student-token');
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
  const check=setInterval(()=>{if((document.querySelector('#dialog')?.open&&document.querySelector('#schoolEntry'))||(!window.classroomActive&&sessionStorage.getItem('village-student-token')))return;clearInterval(check);openQuiz();history.replaceState(null,'',location.pathname)},250);
 }
})();
