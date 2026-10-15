import {qrcode} from './vendor/qrcode.mjs';

const button=document.querySelector('#showStudentEntryLinks');
const download=document.querySelector('#downloadEntryLinks');
const cards=document.querySelector('#entryLinkCards');
const status=document.querySelector('#entryLinkStatus');
const selection=document.querySelector('#managedClass');
let students=[],roomCode='',roomId='';
const bulk=document.createElement('button');bulk.type='button';bulk.textContent='학생별 입장 링크 일괄 복사';bulk.hidden=true;download.after(bulk);
const shared=document.createElement('section');shared.innerHTML='<h3>반 전체 입장 링크 · 웨일북 전송용</h3><p>이 링크는 학급 코드만 채웁니다. 각 학생은 자기 입장 코드로 확인합니다.</p><input aria-label="반 전체 입장 링크" readonly style="width:100%"><img alt="반 전체 입장 QR" width="176" height="176"><button type="button">반 전체 입장 링크 복사</button>';
shared.hidden=true;cards.before(shared);
const sharedURL=()=>`${location.origin}/?entry=1&class=${encodeURIComponent(roomCode)}#farm`;
shared.querySelector('button').onclick=async()=>{try{await navigator.clipboard.writeText(sharedURL());status.textContent='반 전체 입장 링크를 복사했어요. 웨일북 수업관리에서 전송하세요.'}catch{status.textContent='아래 반 전체 입장 링크를 선택해서 복사해 주세요.'}};
bulk.onclick=async()=>{const text=[`학급 ${roomCode} 학생별 입장 링크`,...students.map((s,i)=>`${String(i+1).padStart(3,'0')} · ${s.name} ${urlFor(s)}`)].join('\n');try{await navigator.clipboard.writeText(text);status.textContent='번호와 학생별 링크를 복사했어요. 교사만 보는 게시물 또는 학생별 비공개 전달에 사용하세요.'}catch{status.textContent='클립보드 접근이 막혔어요. 전체 링크 CSV를 저장해 주세요.'}};

const urlFor=student=>`${location.origin}/?entry=1#join=${student.token}`;

function clearCards(){students=[];roomCode='';roomId='';cards.replaceChildren();download.hidden=true;bulk.hidden=true;shared.hidden=true;status.textContent=''}
function qrFor(url){const qr=qrcode(0,'M');qr.addData(url);qr.make();return qr.createDataURL(4,12)}
function render(){
 cards.replaceChildren();
 const fragment=document.createDocumentFragment();
 for(const student of students){
  const card=document.createElement('article');card.className='student-entry-card';
  const name=document.createElement('b');name.textContent=student.name;
  const qr=document.createElement('img');qr.src=qrFor(urlFor(student));qr.alt=`${student.name} 입장 QR`;qr.width=176;qr.height=176;
  const copy=document.createElement('button');copy.type='button';copy.textContent='입장 링크 복사';
  copy.onclick=async()=>{try{await navigator.clipboard.writeText(urlFor(student));status.textContent=`${student.name}의 입장 링크를 복사했어요. 해당 학생에게만 전달해 주세요.`}catch{status.textContent='복사하지 못했어요. 전체 링크 CSV를 저장해서 해당 학생에게 전달해 주세요.'}};
  card.append(name,qr,copy);fragment.append(card);
 }
 cards.append(fragment);
}
button.addEventListener('click',async()=>{
 button.disabled=true;status.textContent='학생별 입장 링크를 만드는 중이에요.';
 try{
  const result=await window.request('/api/teacher/entry-links');
  students=result.students;roomCode=result.roomCode;roomId=selection.value;
  render();download.hidden=false;bulk.hidden=false;shared.hidden=false;shared.querySelector('input').value=sharedURL();shared.querySelector('img').src=qrFor(sharedURL());
  status.textContent=`${roomCode} 학급 ${students.length}명의 링크와 QR을 만들었어요. 각 학생에게 자기 것만 전달하세요.`;
 }catch(error){clearCards();status.textContent=error.message||'링크를 만들지 못했어요. 다시 시도해 주세요.'}
 finally{button.disabled=false}
});
download.addEventListener('click',()=>{if(!students.length)return;window.csv(`학급-${roomCode}-학생별-입장링크.csv`,[['학급 코드','학생','전용 입장 링크'],...students.map(s=>[roomCode,s.name,urlFor(s)])])});
selection.addEventListener('change',()=>{if(selection.value!==roomId)clearCards()});
document.querySelector('#teacherLogout').addEventListener('click',clearCards);
