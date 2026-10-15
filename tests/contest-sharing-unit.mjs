import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {qrcode} from '../dist/vendor/qrcode.mjs';
const source=readFileSync('dist/result-export.js','utf8');
let drawn=[],downloaded='',revoked=false;
const room={code:'ABC123',day:1,coop:[1,2,3,4],goal:5};
const canvas={getContext:()=>({fillRect(){},fillText(t){drawn.push(t)}}),toBlob(cb){cb(new Blob(['png'],{type:'image/png'}))}};
const context={window:{classroomData:{room}},document:{fonts:{ready:Promise.resolve()},querySelector:()=>null,createElement(tag){if(tag==='canvas')return canvas;if(tag==='a')return {click(){downloaded=this.download}};throw Error(tag)}},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){revoked=true}},setTimeout(fn){fn()},Blob,Date,alert(m){throw Error(m)}};
vm.createContext(context);vm.runInContext(source,context);await context.window.VillageResultExport.save();
assert.match(downloaded,/ABC123.*\.png$/);assert.ok(drawn.some(t=>t.includes('상추   1 / 5개')));assert.ok(revoked);
context.window.classroomData.mission={food:[2,3,4,5],counts:[1,2,3,4],target:4,goal:8,completed:true};
// The student script obtains the current story from currentMission().
context.currentMission=()=>context.window.classroomData.mission;drawn=[];await context.window.VillageResultExport.save();assert.ok(drawn.some(t=>t.includes('급식 준비 완료')));assert.ok(drawn.some(t=>t.includes('급식 인계   4 / 4명')));
const teacher=readFileSync('dist/teacher-entry-links.js','utf8');assert.match(teacher,/students\.map/);assert.match(teacher,/class=\$\{encodeURIComponent\(roomCode\)\}/);assert.match(readFileSync('dist/school.js','utf8'),/roomCode'\)\.value=sharedClass\.toUpperCase/);
const qr=qrcode(0,'M');qr.addData('https://example.org/?entry=1&class=ABC123#farm');qr.make();assert.match(qr.createDataURL(4,12),/^data:image\/gif;base64,/);
assert.ok(!source.includes('teacherKey')&&!source.includes('accountName'));
console.log('PASS: class/stories export PNG, private identifiers excluded, common-link prefill and QR generation');

function element(){return {hidden:false,value:'room-1',textContent:'',events:{},children:[],query:{},append(...xs){this.children.push(...xs)},before(x){this.beforeNode=x},after(x){this.afterNode=x},replaceChildren(){this.children=[]},querySelector(s){return this.query[s]??=element()},addEventListener(k,f){this.events[k]=f}}}
const nodes=Object.fromEntries(['showStudentEntryLinks','downloadEntryLinks','entryLinkCards','entryLinkStatus','managedClass','teacherLogout'].map(id=>['#'+id,element()]));
let clip='';const doc={querySelector:s=>nodes[s],createElement:()=>element(),createDocumentFragment:()=>element()};
const sample={roomCode:'ABC123',students:Array.from({length:4},(_,i)=>({name:'학생 '+String(i+1).padStart(3,'0'),token:String(i).repeat(96)}))};
const ctx={document:doc,location:{origin:'https://example.org'},window:{request:async()=>sample},navigator:{clipboard:{writeText:async s=>{clip=s}}},qrcode,encodeURIComponent};vm.createContext(ctx);vm.runInContext(teacher.replace(/^import .*?;\s*/,''),ctx);
await nodes['#showStudentEntryLinks'].events.click();const bulk=nodes['#downloadEntryLinks'].afterNode;assert.equal(bulk.hidden,false);await bulk.onclick();assert.equal(clip.split('\n').length,5);assert.match(clip,/001 · 학생 001 https:/);assert.match(clip,/#join=/);
const shared=nodes['#entryLinkCards'].beforeNode;assert.equal(shared.hidden,false);await shared.querySelector('button').onclick();assert.equal(clip,'https://example.org/?entry=1&class=ABC123#farm');assert.match(shared.querySelector('img').src,/^data:image\/gif/);
nodes['#managedClass'].value='room-2';nodes['#managedClass'].events.change();assert.equal(shared.hidden,true);assert.equal(bulk.hidden,true);
console.log('PASS: 4-entry clipboard list, class-only common link, QR and stale class links cleared');
