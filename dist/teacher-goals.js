// A teacher may lower an ongoing story's goals without discarding contributions.
const drawTeacherStoryBase=showTeacherStory;
let proposedStoryParticipants=null;
showTeacherStory=function(d){
 drawTeacherStoryBase(d);
 const mission=d.mission;
 if(!mission||mission.completed)return;
 const root=el('#teacherStory');
 const participants=proposedStoryParticipants??Math.min(d.players.length,8);
 const box=document.createElement('div');
 box.className='teacher-story-goals';
 box.innerHTML=`<h3>참여 목표 조정</h3><p>현재 직업 미션마다 ${mission.target}명, 재료마다 ${mission.goal}개가 필요해요. 실제 참여할 학생 수를 기준으로 목표를 낮출 수 있습니다. 이미 한 활동과 보관 기록은 남습니다.</p><div class="teacher-grid"><label>이번 이야기 참여 예상 인원<input id="storyGoalParticipants" type="number" min="1" max="${d.players.length}" value="${participants}"></label><button type="button" id="adjustStoryGoals">목표 낮추기</button></div><p id="storyGoalMessage" role="status"></p>`;
 root.append(box);
 const input=box.querySelector('#storyGoalParticipants');
 input.oninput=()=>{proposedStoryParticipants=Number(input.value)};
 box.querySelector('#adjustStoryGoals').onclick=async()=>{
  const button=box.querySelector('#adjustStoryGoals');button.disabled=true;
  try{const result=await request('/api/story/goals',{participants:Number(input.value)});proposedStoryParticipants=null;show(result,true);el('#teacherStatus').textContent='협력 이야기 목표를 조정했어요.'}
  catch(error){box.querySelector('#storyGoalMessage').textContent=error.message;button.disabled=false}
 };
};
