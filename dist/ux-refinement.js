(()=>{
const farm=!!document.querySelector('#farmScene');
const guide=document.querySelector('.trial-guide');if(guide)guide.querySelector('summary').textContent='처음 시작하는 방법';
function tidy(){if(!farm)return;const n=state.farm?.picked||0;document.body.dataset.firstHarvest=String(n===0);document.querySelectorAll('.seed-picker button').forEach((b,i)=>{b.hidden=i>0&&b.disabled});}
if(farm){const old=render;render=function(){old();tidy()};tidy();const info=document.createElement('p');info.className='activity-intro';info.textContent='퀴즈로 직업을 알아보고, 공동 도시락에 작물을 보태거나 잠깐 머지 놀이를 즐겨 보세요.';document.querySelector('.compact-activities').prepend(info);}
})();
