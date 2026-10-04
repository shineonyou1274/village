export const roleNames=['채소 농업인','낙농업인','과수 농업인','양식 어업인'];

export function balancedRoles(size,counts=[0,0,0,0]){
 const jobs=[];
 for(let i=0;i<size;i++){
  const least=Math.min(...counts);
  const candidates=counts.map((n,j)=>n===least?j:-1).filter(j=>j>=0);
  const pick=candidates[crypto.getRandomValues(new Uint32Array(1))[0]%candidates.length];
  jobs.push(pick);counts[pick]++;
 }
 return jobs;
}

export function canReassignRole(s){
 if(s.rolePending)return true;
 return (s.history?.length||0)<=1 && (s.farm?.picked||0)===0 &&
  !(s.farm?.plots||[]).some(p=>p.seeded) &&
  !(s.stock||[]).some(Boolean) && !(s.donated||[]).some(Boolean) &&
  !(s.dailyProduction||0) && !(s.quizDay||0) &&
  !s.specialized && !s.cow && !s.waterWork && !s.logistics?.shipment;
}

export function assignRole(s,mode,job=0){
 s.job=job;
 s.progression=0;
 s.rolePending=mode==='choice';
 s.roleAssigned=mode==='balanced';
 return s;
}
