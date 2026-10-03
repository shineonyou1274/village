// One student per device: keep only the latest class account on this device.
(()=>{
 const key='village-remembered-student-v1';
 const read=()=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value&&typeof value.token==='string'&&typeof value.room==='string'&&typeof value.name==='string'?value:null}catch{return null}};
 window.StudentMemory={
  read,
  save(data,token){if(!token||data.me?.state?.trial)return;const room=String(data.room?.code||''),name=String(data.me?.accountName||data.me?.state?.name||'학생');try{if(room)localStorage.setItem(key,JSON.stringify({room,name,token}))}catch{}},
  forget(){try{localStorage.removeItem(key)}catch{}},
  restore(){
   if(location.hash.startsWith('#join=')){
    const link=location.hash.slice(6);
    this.linkAttempted=true;
    history.replaceState(null,'',location.pathname+'#farm');
    if(!/^[a-f0-9]{96}$/i.test(link))return '';
    const token=link.toLowerCase();
    sessionStorage.removeItem('village-pending-command');
    sessionStorage.setItem('village-student-token',token);
    return token;
   }
   if(sessionStorage.getItem('village-student-token'))return sessionStorage.getItem('village-student-token');if(new URLSearchParams(location.search).has('entry'))return '';const saved=read();if(saved){sessionStorage.setItem('village-student-token',saved.token);return saved.token}return ''
  }
 };
})();
