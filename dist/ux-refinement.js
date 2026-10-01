(()=>{
const farm=!!document.querySelector('#farmScene');
const guide=document.querySelector('.trial-guide');if(guide)guide.querySelector('summary').textContent='처음 시작하는 방법';
const notice=document.createElement('div');notice.className='first-harvest-notice';notice.hidden=true;notice.setAttribute('role','status');notice.innerHTML='<div><b>첫 수확을 축하해요!</b><p>상추는 한 번 수확하면 2개씩 모여요. 수확한 작물은 보관소에 모였어요. 이제 오늘 시세와 밭 확장을 살펴볼 수 있어요. 상추를 총 6개 수확하면 당근 씨앗이 열립니다. 새 씨앗도 지금의 빈 밭에 심어요.</p></div><button type=button>알겠어요</button>';if(farm)document.querySelector('.farm-bottom').before(notice);let noticeKey='';notice.querySelector('button').onclick=()=>{try{localStorage.setItem(noticeKey,'seen')}catch{}notice.hidden=true};
function tidy(){if(!farm)return;const n=state.farm?.picked||0;document.body.dataset.firstHarvest=String(n===0);noticeKey='shiny-first-harvest:'+((window.classroomActive&&classroomData.me.id)||'practice');let seen=false;try{seen=localStorage.getItem(noticeKey)==='seen'}catch{}notice.hidden=n===0||seen; document.querySelectorAll('.seed-picker button').forEach((b,i)=>{b.hidden=i>0&&b.disabled});}
if(farm){const old=render;render=function(){old();tidy()};tidy();const info=document.createElement('p');info.className='activity-intro';info.textContent='퀴즈로 직업을 알아보고, 공동 도시락에 작물을 보태거나 잠깐 머지 놀이를 즐겨 보세요.';document.querySelector('.compact-activities').prepend(info);}
})();
