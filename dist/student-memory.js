// A remembered class account is a choice on the entry screen, never an automatic login.
(()=>{
 const key='village-remembered-student-v1';
 const optKey='village-remember-device-v1';
 const tabKey='village-confirmed-tab-v1',tabName='shiny-village-student:';
 const optedIn=()=>{try{return localStorage.getItem(optKey)==='yes'}catch{return false}};
 if(!optedIn())try{localStorage.removeItem(key)}catch{}
 const read=()=>{if(!optedIn())return null;try{const value=JSON.parse(localStorage.getItem(key)||'null');return value&&typeof value.token==='string'&&typeof value.room==='string'&&typeof value.name==='string'?value:null}catch{return null}};
 const confirmTab=()=>{const id=crypto.randomUUID();sessionStorage.setItem(tabKey,id);window.name=tabName+id};
 const sameTab=()=>{const id=sessionStorage.getItem(tabKey);return !!id&&window.name===tabName+id};
 window.StudentMemory={
  read,
  remember(yes){try{if(yes)localStorage.setItem(optKey,'yes');else{localStorage.removeItem(optKey);localStorage.removeItem(key)}}catch{}},
  save(data,token){if(!token||data.me?.state?.trial)return;confirmTab();const room=String(data.room?.code||''),name=String(data.me?.accountName||data.me?.state?.name||'학생');try{if(optedIn()&&room)localStorage.setItem(key,JSON.stringify({room,name,token}))}catch{};if(new URLSearchParams(location.search).has('entry')){const url=new URL(location.href);url.searchParams.delete('entry');history.replaceState(null,'',url.pathname+url.search+url.hash)}},
  forget(){this.remember(false)},
  restore(){
   if(location.hash.startsWith('#join=')){
    const link=location.hash.slice(6);
    this.linkAttempted=true;
    history.replaceState(null,'',location.pathname+'#farm');
    if(!/^[a-f0-9]{96}$/i.test(link))return '';
    const token=link.toLowerCase();
    if(read()?.token!==token)this.remember(false);
    sessionStorage.removeItem('village-pending-command');confirmTab();
    sessionStorage.setItem('village-student-token',token);
    return token;
   }
   if(new URLSearchParams(location.search).has('entry'))return '';
   const token=sessionStorage.getItem('village-student-token');
   if(!token)return '';
   // Browsers may copy sessionStorage into a newly opened tab. A copied login still needs a choice.
   if(!sameTab()&&(read()?.token===token||window.opener)){sessionStorage.removeItem('village-student-token');sessionStorage.removeItem('village-pending-command');return ''}
   return token
  }
 };
})();
