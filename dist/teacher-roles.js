const showBeforeRoles=show;
show=function(d,force=false){
 showBeforeRoles(d,force);
 const box=el('#teacherRolePolicy'),mode=d.room.roleMode||'legacy';
 const counts=[0,0,0,0];let waiting=0;
 for(const p of d.players){if(p.rolePending)waiting++;else if(Number.isInteger(p.job))counts[p.job]++}
 if(!box.contains(document.activeElement))el('#roleMode').value=mode==='choice'?'choice':'balanced';
 el('#roleModeSummary').textContent=`현재 방식: ${mode==='legacy'?'기존 성장 방식':mode==='choice'?'입장 순서대로 학생 선택':'균형 무작위 배정'} · 채소 ${counts[0]}명 / 낙농 ${counts[1]}명 / 과수 ${counts[2]}명 / 양식 ${counts[3]}명${waiting?` · 선택 전 ${waiting}명`:''}. 학생 선택 방식은 직업마다 최대 ${Math.ceil(d.players.length/4)}명입니다.`;
};
el('#saveRoleMode').onclick=async()=>{
 const button=el('#saveRoleMode'),status=el('#roleModeStatus');button.disabled=true;status.textContent='배정 방식을 적용하고 있어요.';
 try{
  const result=await request('/api/teacher/roles',{mode:el('#roleMode').value});
  show(result,true);
  status.textContent=`적용했어요. 아직 활동하지 않은 ${result.roleAssignment.changed}명의 역할을 설정했고, 활동한 ${result.roleAssignment.preserved}명의 직업과 기록은 유지했습니다.`;
 }catch(error){status.textContent=error.message}
 finally{button.disabled=false}
};
