/* Presentation only: move existing controls without replacing their API handlers. */
(()=>{
 const q=s=>document.querySelector(s), dashboard=q('#teacherDashboard');
 const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n};
 document.body.classList.add('teacher-workspace');
 const bar=make('div','teacher-livebar');bar.hidden=true;
 const identity=make('b'),day=make('span','teacher-pill'),status=make('span','teacher-pill');
 bar.append(identity,day,status,q('#teacherRefresh'),q('#teacherLogout'));document.body.prepend(bar);
 const tabs=make('nav','teacher-tabs');tabs.setAttribute('aria-label','교사 운영실 메뉴');tabs.setAttribute('role','tablist');
 const panels=['수업 중','수업 준비','기록·설정'].map((name,i)=>{
  const panel=make('section','teacher-tab-panel');panel.id='teacherTabPanel'+i;panel.hidden=i!==0;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','teacherTab'+i);
  const button=make('button','',`${i+1} ${name}`);button.id='teacherTab'+i;button.type='button';button.setAttribute('role','tab');button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-selected',String(i===0));button.tabIndex=i? -1:0;
  button.onclick=()=>select(i);button.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;select(next);tabs.children[next].focus()}};
  tabs.append(button);return panel;
 });
 function select(index){panels.forEach((p,i)=>{p.hidden=i!==index;tabs.children[i].setAttribute('aria-selected',String(i===index));tabs.children[i].tabIndex=i===index?0:-1})}
 dashboard.prepend(tabs);dashboard.append(...panels);
 const cardOf=id=>q(id)?.closest('.teacher-card');
 const short=(card,text)=>{const p=card?.querySelector(':scope > p:not([id])');if(!p)return;const old=p.textContent;p.textContent=text;const h=card.querySelector('h2,h3');if(h){const help=make('details','teacher-help'),summary=make('summary','','ⓘ'),body=make('p','',old);summary.setAttribute('aria-label',h.textContent+' 설명');help.append(summary,body);h.after(help)}};
 const wrap=(node,title)=>{const details=make('details','teacher-fold'),summary=make('summary','',title);details.append(summary,node);return details};
 const overview=cardOf('#roomTitle');overview.hidden=true;
 const remote=cardOf('#roomDay');remote.id='teacherRemote';remote.querySelector('h2').textContent='수업 리모컨';short(remote,'변경한 뒤 학급 전체에 적용하세요.');
 panels[0].append(remote);
 const fields=['roomPaused','roomMarket','roomPhase','roomWeather'];
 fields.forEach(id=>{
  const input=q('#'+id),label=input.closest('label'),group=make('div','remote-options '+(id==='roomPaused'?'remote-big':''));group.setAttribute('role','group');group.setAttribute('aria-label',id==='roomPaused'?'수업 상태':id==='roomWeather'?'날씨·경제 상황':id==='roomMarket'?'장터':'시즌');
  [...input.options].forEach(option=>{const b=make('button','',id==='roomPaused'?(option.value==='0'?'▶ 진행':'⏸ 일시정지'):option.textContent);b.type='button';b.dataset.control=id;b.dataset.value=option.value;b.onclick=()=>{input.value=option.value;input.dispatchEvent(new Event('change',{bubbles:true}));syncControls()};group.append(b)});
  input.hidden=true;label.append(group);
 });
 const grid=remote.querySelector('.teacher-grid');['roomPaused','roomMarket','roomPhase','roomWeather','roomDay'].forEach(id=>{const label=q('#'+id).closest('label');label.dataset.field=id;grid.append(label)});grid.append(q('#saveRoom'));
 const dayInput=q('#roomDay'),dayLabel=dayInput.closest('label');const prev=make('button','','◀'),next=make('button','','▶');prev.type=next.type='button';prev.setAttribute('aria-label','이전 날짜');next.setAttribute('aria-label','다음 날짜');
 const dayrow=make('div','remote-day');dayrow.append(prev,dayInput,next);dayLabel.append(dayrow);
 const changeDay=delta=>{dayInput.value=Math.max(1,Math.min(365,Number(dayInput.value)+delta));dayInput.dispatchEvent(new Event('change',{bubbles:true}));syncControls()};prev.onclick=()=>changeDay(-1);next.onclick=()=>changeDay(1);
 const apply=q('#saveRoom');const hint=make('span','remote-dirty');hint.setAttribute('role','status');apply.after(hint);
 function syncControls(){remote.querySelectorAll('[data-control]').forEach(b=>b.setAttribute('aria-pressed',String(q('#'+b.dataset.control).value===b.dataset.value)));const r=data?.room;const dirty=!!r&&(lessonIntent!==null||Number(dayInput.value)!==r.day||Number(q('#roomWeather').value)!==r.weather||q('#roomPhase').value!==r.phase||(q('#roomMarket').value==='1')!==!!r.market||(q('#roomPaused').value==='1')!==!!r.paused);apply.classList.toggle('has-changes',dirty);apply.classList.toggle('primary',dirty);hint.textContent=dirty?'아직 적용하지 않은 변경이 있어요.':'';prev.disabled=Number(dayInput.value)<=1;next.disabled=Number(dayInput.value)>=365}
 remote.addEventListener('change',syncControls);remote.addEventListener('input',syncControls);
 const tableCard=make('section','teacher-card');tableCard.id='teacherMeal';tableCard.append(make('h2','','공동 식탁'));const food=make('div','meal-progress');tableCard.append(food);
 const story=q('#teacherStory');tableCard.append(story);story.classList.remove('teacher-card');
 const exportButton=q('[data-result-export]'),exportCard=cardOf('[data-result-export]');exportButton.textContent='팀보드용 이미지 저장';tableCard.append(exportButton);exportCard.remove();
 const goalsJump=make('button','','목표 인원 조정');goalsJump.type='button';goalsJump.onclick=()=>{select(1);q('#teacherGoals').scrollIntoView({block:'center'});q('#teacherGoals input')?.focus()};tableCard.append(goalsJump);
 panels[0].append(tableCard);
 const growth=cardOf('#growthMode'),award=q('#awardNeighbor'),awardCard=make('section','teacher-card');awardCard.append(make('h2','','고마운 이웃 도장'),make('p','','관찰한 도움과 협력에 도장을 찍어요.'),award);award.querySelector('h3').remove();const growthStatus=q('#growthTeacherStatus');tabs.after(growthStatus);panels[0].append(awardCard);
 panels[0].append(cardOf('#teacherRoster'));cardOf('#teacherRoster').classList.add('teacher-wide');
 const goals=make('section','teacher-card');goals.id='teacherGoals';goals.append(make('h2','','공동 식탁 목표 인원'),make('p','','이번 수업 참여 인원에 맞춰 조정해요.'));const goalContent=make('div');goals.append(goalContent);
 panels[1].append(q('#teacherEntryLinks'),q('#teacherRolePolicy'),goals);
 short(q('#teacherEntryLinks'),'학생에게는 자기 링크만 주세요.');short(q('#teacherRolePolicy'),'아직 시작 안 한 학생에게만 적용돼요.');
 const seats=cardOf('#teacherSeats');short(seats,'15분 넘게 끊기면 자리가 자동 반환돼요.');
 const study=q('#studyRoster').closest('details');seats.append(study);
 panels[2].append(wrap(seats,'별빛도서관 좌석·공부 기록'));
 short(growth,'출석 기준과 공동 식탁 시즌을 관리해요.');growth.querySelector('h2').textContent='여권 출석 기준 · 공동 식탁 시즌';growth.querySelector('h3').textContent='공동 식탁 시즌 보관';
 panels[2].append(wrap(growth,'여권 출석 기준·공동 식탁 시즌'));
 const campus=q('#teacherCampus');campus.querySelector('h2').textContent='여러 반 연결';panels[2].append(wrap(campus,'여러 반 연결·학교 운영'));
 short(q('#teacherCreateClass'),'현재 학급을 유지하고 새 반을 만들어요.');panels[2].append(wrap(q('#teacherCreateClass'),'새 학급 만들기'));
 const backupCard=make('section','teacher-card');backupCard.append(make('h2','','기록 백업·CSV'),make('p','','현재 학급 기록을 파일로 보관하세요.'));
 // Keep the original backup control: its checkpoint still gates reset exactly as before.
 backupCard.append(q('#downloadResetBackup'));const csvCopy=make('button','','활동 현황 CSV 저장');csvCopy.type='button';csvCopy.onclick=()=>q('#exportProgress').click();backupCard.append(csvCopy);panels[2].prepend(backupCard);
 const danger=wrap(cardOf('#resetClassActivity'),'위험 구역 · 학급 활동 초기화');danger.classList.add('teacher-danger');panels[2].append(danger);
 const resetStatus=q('#resetClassStatus');tabs.after(resetStatus); // one visible status region shared by backup and reset
 dashboard.querySelectorAll(':scope > .teacher-card').forEach(card=>{if(card.querySelector('h2')?.textContent==='수업 전 확인')card.remove()});
 function storyLayout(d){
  // showTeacherStory rebuilds this subtree. Move only the fresh goal controls after each update.
  goalContent.replaceChildren();const adjust=story.querySelector('.teacher-story-goals');
  if(adjust){short(adjust,'이미 한 활동과 보관 기록은 남아요.');goalContent.append(adjust)}
  else if(!d.mission){const controls=story.querySelector('.teacher-grid');if(controls)goalContent.append(controls);const message=story.querySelector('#storyTeacherMessage');if(message)goalContent.append(message)}
  else goalContent.append(make('p','','이번 공동 식탁은 완료했어요.'));
  const title=story.querySelector('h2');if(title)title.textContent=d.mission?'길·전기·검수·인계':'협력 미션 시작하기';
  story.querySelectorAll(':scope > p:not([id])').forEach((p,i)=>{if(!d.mission){if(i===0)p.textContent='시작하면 폭우가 내리고 장터가 닫혀요.';else {const detail=make('details','teacher-fold');detail.append(make('summary','','진행 방법 자세히'));p.before(detail);detail.append(p)}}else if(i===0)p.hidden=true;else p.textContent=d.mission.completed?'모두의 일이 한 끼로 연결됐어요.':'길·전기 복구 → 재료 → 검수 → 인계'});
  const m=d.mission,counts=m?.food||d.room.coop,target=m?.goal||d.room.goal;
  food.replaceChildren(...['상추','우유','사과','생선'].map((name,i)=>{const row=make('label','',`${name} ${counts[i]} / ${target}`),progress=make('progress');progress.max=Math.max(1,target);progress.value=counts[i];row.append(progress);return row}));
 }
 let layoutRoom='';const previousShow=show;show=function(d,force=false){if(layoutRoom!==d.room.id){goalContent.replaceChildren();layoutRoom=d.room.id}previousShow(d,force);bar.hidden=false;document.body.classList.add('teacher-signed-in');identity.textContent=`학급 ${d.room.code} · 학생 ${d.players.length}명`;day.textContent=`${d.room.day}일차 · ${q('#roomWeather').options[d.room.weather]?.textContent||''}`;status.textContent=`${d.room.paused?'⏸ 일시정지':'● 진행 중'} · 접속 ${d.players.filter(p=>p.online).length}/${d.players.length}`;status.classList.toggle('is-paused',!!d.room.paused);storyLayout(d);syncControls()};
 // Moving the start button means the legacy render guard cannot find it; move it back before a refresh.
 const previousStory=showTeacherStory;showTeacherStory=function(d){const start=goalContent.querySelector('#startClassStory');if(start){const grid=start.closest('.teacher-grid');story.append(grid);const msg=goalContent.querySelector('#storyTeacherMessage');if(msg)story.append(msg)}previousStory(d)};
 if(data)show(data);
})();
