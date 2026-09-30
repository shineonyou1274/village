'use strict';

// A student begins as a vegetable farmer, then chooses one lasting specialty.
// The server validates eligibility; this UI only explains it before sending an action.
function showSchoolCareers(){
 const picked=state.farm?.picked||0;
 const specialized=!!state.specialized||(state.job!==0&&picked>=16);
 const roles=jobs.map((job,index)=>{
  const target=index===1?80:index===0?0:16;
  const current=index===state.job;
  const locked=specialized||picked<target||index===0;
  const reason=current?'지금 내 역할':index===0?'처음 시작하는 역할':specialized?'이미 전문 역할을 정했어요':picked<target?`누적 수확 ${target}개부터 선택`:'선택할 수 있어요';
  return `<button class="wide" type="button" data-career-specialize="${index}" ${locked?'disabled':''}>${job.icon} ${job.name} · ${reason}</button>`;
 }).join('');
 modal(`<h2>내 직업과 전문 역할</h2><p>모두 상추밭에서 시작해요. 누적 수확 16개가 되면 과수·물가 역할을, 80개가 되면 목장 역할도 고를 수 있어요.</p><div class="notice">내 수확 ${picked}개 · ${specialized?'전문 역할을 이미 골랐어요.':'전문 역할은 한 번 선택하면 유지돼요. 기존 밭과 물건은 그대로 남아요.'}</div>${roles}<button class="wide quiet" data-close>계속하기</button>`);
}
window.showSchoolCareers=showSchoolCareers;

document.addEventListener('click',event=>{
 const choice=event.target.closest('[data-career-specialize]');if(!choice||choice.disabled)return;
 const job=Number(choice.dataset.careerSpecialize);
 modal(`<h2>${jobs[job].icon} ${jobs[job].name}이 될까요?</h2><p>전문 역할은 한 번 정하면 유지돼요. 농장 밭과 수확 기록, 보관한 물건은 그대로 남습니다.</p><div class="dialog-actions"><button type="button" id="cancelSpecialize">다시 고르기</button><button type="button" class="primary" id="confirmSpecialize">이 역할 선택</button></div>`);
 $('#cancelSpecialize').onclick=showSchoolCareers;
 $('#confirmSpecialize').onclick=async()=>{const button=$('#confirmSpecialize');button.disabled=true;button.textContent='저장하는 중…';if(await schoolAction({action:'job',job})){close();toast(`${jobs[job].name} 역할을 맡았어요. 내 기록은 그대로예요.`)}else{button.disabled=false;button.textContent='다시 시도하기'}};
});

const previousCareerPanel=renderPanel;
renderPanel=function(){
 previousCareerPanel();
 if(window.classroomActive&&tab==='season'){
  const heading=$('#panel .story-subhead');
  if(heading){
   const guide=document.createElement('details');guide.className='field-hint';
   guide.innerHTML='<summary>급식 재료는 어디서 얻나요?</summary><p>상추는 내 밭에서 수확해요. 사과는 누적 수확 16개 뒤 과수 역할을 고른 친구가 만들어요. 우유는 누적 수확 80개 뒤 젖소를 입양하고 돌보면 얻어요. 생선은 우리 마을 물가에서 수질을 확인하고 돌본 뒤 수확해요. 장터에서 친구와 교환할 수도 있어요.</p>';
   heading.after(guide);
  }
  return;
 }
 if(!window.classroomActive||tab!=='work'||state.progression!==1)return;
 const box=$('#panel .school-prod');if(!box)return;
 const picked=state.farm?.picked||0;
 if(state.job===0&&!state.specialized){
  const hint=document.createElement('p');hint.className='field-hint';hint.textContent=`다음 진로 · 수확 ${Math.max(0,16-picked)}개 뒤 과수·물가 역할을 고를 수 있어요.`;box.append(hint);
 }
 if(state.job===1||state.job===3){
  $('#panel [data-action="harvest"]')?.remove();
  const ranch=state.job===1;
  box.innerHTML=ranch
   ?'<b>🥛 목장 일꾼의 일</b><p>젖소에게 먹이와 물을 챙긴 뒤 우유를 모아요. 누적 수확 80개와 100코인이 필요해요.</p><button type="button" class="wide" id="goSpecialtyPlace">내 목장으로 이동</button>'
   :'<b>🐟 양식업자의 일</b><p>물가에서 수질을 확인하고 물고기를 돌본 뒤 수확해요. 수질 지표는 교육용 시뮬레이션이에요.</p><button type="button" class="wide" id="goSpecialtyPlace">물가 일터로 이동</button>';
  $('#goSpecialtyPlace').onclick=()=>{
   gameNavigate(ranch?'farm':'village');
   requestAnimationFrame(()=>{
    if(ranch)document.querySelector('.ranch-marker')?.click();
    else [...document.querySelectorAll('.district3d')].find(node=>node.textContent==='물가 마을')?.click();
   });
  };
 }
};
