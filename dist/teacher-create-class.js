(()=>{
 const form=document.querySelector('#authenticatedCreateClass');if(!form)return;
 const status=document.querySelector('#authenticatedCreateStatus'),result=document.querySelector('#authenticatedClassResult');
 form.onsubmit=async event=>{
  event.preventDefault();const submit=form.querySelector('button');if(submit.disabled)return;submit.disabled=true;status.textContent='기존 학급은 유지하고 새 학급을 만드는 중이에요.';
  try{
   const size=Number(document.querySelector('#authenticatedClassSize').value),roleMode=document.querySelector('#authenticatedRoleMode').value;
   const created=await window.request('/api/create',{size,roleMode});
   const text=[`새 학급 코드: ${created.roomCode}`,`교사 입장 코드: ${created.teacherKey}`,'교사 코드는 선생님만 보관하세요. 학생에게는 자기 코드만 전달하세요.','',...created.students.map(s=>`${s.name}: ${s.code}`)].join('\n');
   result.replaceChildren();result.hidden=false;
   const title=document.createElement('h3');title.textContent=`학급 ${created.roomCode} · ${created.students.length}명 생성 완료`;
   const details=document.createElement('textarea');details.readOnly=true;details.rows=8;details.style.width='100%';details.setAttribute('aria-label','새 학급 교사·학생 입장 정보');details.value=text;
   const save=document.createElement('button');save.type='button';save.textContent='교사·학생 입장 정보 저장';save.onclick=()=>{const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`학급-${created.roomCode}-입장정보.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
   const enter=document.createElement('button');enter.type='button';enter.textContent='새 학급 운영실로 전환';enter.onclick=()=>{sessionStorage.setItem('village-teacher-token',created.teacherKey);sessionStorage.removeItem('village-managed-room');location.reload()};
   result.append(title,details,save,enter);status.textContent='새 학급을 만들었어요. 입장 정보를 저장하세요. 현재 학급의 학생·기록·운영 설정은 바뀌지 않았어요.';
  }catch(error){status.textContent=error.message||'새 학급을 만들지 못했어요.';submit.disabled=false}
 };
})();
