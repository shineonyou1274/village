const resetCard=document.createElement('section');
resetCard.className='teacher-card';
resetCard.innerHTML=`<h2>시범 수업 전 학급 초기화</h2>
<p id="resetScope"></p>
<p>학생 번호·입장 코드·링크와 학급 연결은 유지합니다. 밭·보관함·코인·교환·미션·퀴즈·도서관 기록은 지워지고, 수업은 일시정지됩니다. 교사가 수업 운영에서 다시 시작할 수 있습니다.</p>
<button id="downloadResetBackup" type="button">현재 기록 백업 내려받기</button>
<div class="teacher-grid">
<label>초기화 후 직업 배정<select id="resetRoleMode"><option value="">배정 방식을 선택하세요</option><option value="balanced">네 직업 균형 무작위</option><option value="choice">학생이 입장해 선착순 선택</option></select></label>
<label>초기화할 학급 코드 입력<input id="resetClassCode" autocomplete="off" spellcheck="false" placeholder="학급 코드"></label>
<button id="resetClassActivity" type="button" disabled>이 학급 활동 초기화</button>
</div><p id="resetClassStatus" role="status"></p>`;
document.querySelector('#teacherRolePolicy').after(resetCard);
let resetBackupRoom='';
let resetBackupVersion=null;
let lastShownResetRoom='';
const previousTeacherShow=show;
show=function(d,force=false){
 previousTeacherShow(d,force);
 if(lastShownResetRoom&&lastShownResetRoom!==d.room.id){resetBackupRoom='';resetBackupVersion=null}
 lastShownResetRoom=d.room.id;
 const scope=document.querySelector('#resetScope');
 scope.textContent=`선택한 학급: ${d.room.code} · 학생 ${d.players.length}명. 다른 학급의 기록은 바뀌지 않습니다.`;
 if(resetBackupRoom!==d.room.id){
  document.querySelector('#resetRoleMode').value='';
  document.querySelector('#resetClassCode').value='';
  document.querySelector('#resetClassStatus').textContent='';
 }
 updateResetButton();
};
function updateResetButton(){
 const room=data?.room;
 document.querySelector('#resetClassActivity').disabled=!room||
  resetBackupRoom!==room.id||resetBackupVersion!==room.version||
  !document.querySelector('#resetRoleMode').value||
  document.querySelector('#resetClassCode').value.trim().toUpperCase()!==room.code;
}
document.querySelector('#resetRoleMode').addEventListener('change',updateResetButton);
document.querySelector('#resetClassCode').addEventListener('input',updateResetButton);
document.querySelector('#downloadResetBackup').onclick=async()=>{
 const status=document.querySelector('#resetClassStatus'),button=document.querySelector('#downloadResetBackup');
 button.disabled=true;status.textContent='현재 기록을 준비하고 있어요.';
 try{
  const backup=await request('/api/teacher/reset-backup');
  const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
  const link=document.createElement('a');
  link.href=url;link.download=`학급-${data.room.code}-초기화전-${new Date().toISOString().slice(0,10)}.json`;
  link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  resetBackupRoom=data.room.id;
  resetBackupVersion=backup.records.rooms[0].version;
  status.textContent='백업 파일을 내려받았습니다. 초기화할 학급 코드와 직업 배정 방식을 확인해 주세요.';
  updateResetButton();
 }catch(error){status.textContent=error.message}finally{button.disabled=false}
};
document.querySelector('#resetClassActivity').onclick=async()=>{
 const room=data?.room,button=document.querySelector('#resetClassActivity'),status=document.querySelector('#resetClassStatus');
 if(!room||button.disabled)return;
 if(!window.confirm(`학급 ${room.code}의 학생 ${data.players.length}명 활동 기록을 초기화할까요? 입장 코드는 유지되고 수업은 일시정지됩니다.`))return;
 button.disabled=true;status.textContent='학급 활동을 초기화하고 있어요.';
 try{
  const result=await request('/api/teacher/reset',{classCode:room.code,confirm:'RESET_CLASS_ACTIVITY',mode:document.querySelector('#resetRoleMode').value,expectedRoomVersion:resetBackupVersion});
  resetBackupRoom='';resetBackupVersion=null;show(result,true);
  status.textContent=`학급 ${result.room.code}의 ${result.reset.students}명 활동을 초기화했습니다. 수업 운영에서 상태를 진행으로 바꾼 뒤 학생에게 입장해 달라고 안내하세요.`;
 }catch(error){status.textContent=error.message;updateResetButton()}
};
