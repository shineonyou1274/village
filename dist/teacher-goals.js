// A teacher may lower an ongoing story's goals without discarding contributions.
const drawTeacherStoryBase=showTeacherStory;
let proposedStoryParticipants=null;
showTeacherStory=function(d){
 drawTeacherStoryBase(d);
 const mission=d.mission;
 if(!mission||mission.completed)return;
 const root=el('#teacherStory');
 const onlineCount=d.players.filter(player=>player.online).length;
 const participants=proposedStoryParticipants??(onlineCount||Math.min(d.players.length,8));
 const box=document.createElement('div');
 box.className='teacher-story-goals';
 box.innerHTML=`<h3>이번 참여 인원에 맞춰 목표 조정</h3><p>등록 학생 ${d.players.length}명 중 현재 접속 ${onlineCount}명 · 저장된 직업 미션 목표는 각 ${mission.target}명이에요. 소규모 시험이나 실제 참여 학생이 적은 수업이라면 아래 인원을 바꿔 목표를 낮춰 주세요. 이미 한 활동과 보관 기록은 남습니다.</p><div class="teacher-grid"><label>이번 이야기 참여 예상 인원<input id="storyGoalParticipants" type="number" min="1" max="${d.players.length}" value="${participants}"></label><button type="button" id="adjustStoryGoals">이번 인원으로 목표 낮추기</button></div><p id="storyGoalPreview"></p><p id="storyGoalMessage" role="status"></p>`;
 root.append(box);
 const input=box.querySelector('#storyGoalParticipants');
 const preview=()=>{const count=Number(input.value);box.querySelector('#storyGoalPreview').textContent=Number.isInteger(count)&&count>=1&&count<=d.players.length?`적용하면 직업 미션마다 ${Math.min(mission.target,Math.ceil(count/8))}명, 재료마다 ${Math.max(...mission.food,Math.min(mission.goal,Math.ceil(count/4)))}개가 목표예요.`:'1명부터 등록 학생 수까지 입력해 주세요.'};
 input.oninput=()=>{proposedStoryParticipants=Number(input.value);preview()};preview();
 box.querySelector('#adjustStoryGoals').onclick=async()=>{
  const button=box.querySelector('#adjustStoryGoals');button.disabled=true;
  try{const result=await request('/api/story/goals',{participants:Number(input.value)});proposedStoryParticipants=null;show(result,true);el('#teacherStatus').textContent='협력 이야기 목표를 조정했어요.'}
  catch(error){box.querySelector('#storyGoalMessage').textContent=error.message;button.disabled=false}
 };
};
