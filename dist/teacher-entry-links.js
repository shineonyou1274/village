import {qrcode} from './vendor/qrcode.mjs';

const button=document.querySelector('#showStudentEntryLinks');
const download=document.querySelector('#downloadEntryLinks');
const cards=document.querySelector('#entryLinkCards');
const status=document.querySelector('#entryLinkStatus');
const selection=document.querySelector('#managedClass');
let students=[],roomCode='',roomId='';
const urlFor=student=>`${location.origin}/?entry=1#join=${student.token}`;

function clearCards(){students=[];roomCode='';roomId='';cards.replaceChildren();download.hidden=true;status.textContent=''}
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
  render();download.hidden=false;
  status.textContent=`${roomCode} 학급 ${students.length}명의 링크와 QR을 만들었어요. 각 학생에게 자기 것만 전달하세요.`;
 }catch(error){clearCards();status.textContent=error.message||'링크를 만들지 못했어요. 다시 시도해 주세요.'}
 finally{button.disabled=false}
});
download.addEventListener('click',()=>{if(!students.length)return;window.csv(`학급-${roomCode}-학생별-입장링크.csv`,[['학급 코드','학생','전용 입장 링크'],...students.map(s=>[roomCode,s.name,urlFor(s)])])});
selection.addEventListener('change',()=>{if(selection.value!==roomId)clearCards()});
document.querySelector('#teacherLogout').addEventListener('click',clearCards);
