// Educational exploration examples, not university admission requirements.
export const pathways=[
 ['plant','🥬','식물이 자라는 원리','빛을 받은 상추가 양분을 만드는 과정이 궁금해요.','세포와 물질대사','생명과학','광합성과 세포의 에너지 이용을 탐구해요.','원예·생명과학','작물 연구원'],
 ['robot','🤖','자동으로 물 주기','센서와 움직이는 장치를 연결해 농장을 돌보고 싶어요.','로봇과 공학세계','정보','로봇의 구성과 제어를 탐구하고, 정보에서는 문제를 해결하는 절차와 프로그램을 배워요.','로봇·기계공학','로봇 개발자'],
 ['data','📊','수확 기록에서 패턴 찾기','여러 날의 수확 자료를 정리하고 분석하고 싶어요.','데이터 과학','확률과 통계','자료를 수집·분석해 의미를 찾고, 통계적 판단의 기초도 함께 익혀요.','통계·데이터과학','데이터 분석가'],
 ['market','🛒','장터 가격의 변화','수요와 공급에 따라 가격이 변하는 이유가 궁금해요.','경제','금융과 경제생활','시장과 경제적 선택을 살피고 생활 속 금융 문제도 탐구해요.','경제·경영','유통 기획자'],
 ['power','💡','마을에 전기 보내기','전기와 자기의 관계를 더 깊이 배우고 싶어요.','전자기와 양자','물리학','물리학의 기초를 바탕으로 전자기 현상을 심화 탐구해요.','전기·전자공학','전기 기술자'],
 ['story','🎬','마을 이야기를 영상으로','문학 작품과 영상의 표현을 비교하고 싶어요.','문학과 영상','미술과 매체','이야기가 매체에 따라 표현되는 방식을 살펴보고 시각적 표현으로 넓혀요.','문예창작·영상','영상 제작자'],
 ['climate','🌦','기후에 대응하는 마을','기후변화와 생태계의 관계를 알아보고 싶어요.','기후변화와 환경생태','지구과학','환경과 생태계의 변화를 과학적으로 살펴봐요.','환경·지구과학','환경 연구원'],
 ['city','🏘','살기 좋은 동네','도시의 문제와 미래 공간을 탐구하고 싶어요.','도시의 미래 탐구','사회문제 탐구','도시의 변화를 살펴보고 지역 문제를 조사하는 활동과 연결해요.','도시·지리','도시 계획가'],
 ['debate','💬','의견을 나누는 광장','자료를 읽고 토론한 뒤 내 생각을 글로 쓰고 싶어요.','독서 토론과 글쓰기','독서와 작문','근거를 읽고 듣고 검토하며 내 생각을 표현해요.','국어국문·언론','기자'],
 ['design','🎨','마을 간판 만들기','재료와 표현 방법을 탐색하며 미술 작품을 만들고 싶어요.','미술 창작','미술과 매체','창작 과정을 경험하고 다양한 매체의 표현으로 확장해요.','미술·디자인','시각 디자이너'],
 ['health','🏃','건강한 마을 생활','운동과 건강의 관계를 알아보고 실천하고 싶어요.','운동과 건강','보건','건강한 신체활동과 생활 속 건강 관리에 관심을 넓혀요.','체육·보건','건강 교육자'],
 ['teach','📚','함께 배우는 도서관','교육의 의미와 가르치고 배우는 일을 탐구하고 싶어요.','교육의 이해','인간과 심리','교육의 역할을 탐색하고 사람의 생각과 행동에 대한 관심도 연결해요.','교육·심리','교육 프로그램 기획자']
].map(([id,icon,title,situation,course,related,explanation,major,job])=>({id,icon,title,situation,course,related,explanation,major,job}));
export const careerQuestions=pathways.flatMap((p,i)=>[
 {id:p.id+'-course',path:p.id,kind:'교과',prompt:p.situation+' 이 학습 내용을 직접 다루는 과목은?',choices:[p.course,pathways[(i+4)%12].course,pathways[(i+8)%12].course],correct:0,explanation:p.explanation+' 다른 과목도 관심 활동에 함께 도움이 될 수 있어요.'},
 {id:p.id+'-work',path:p.id,kind:'학과·직업',prompt:p.title+' 활동을 더 탐색할 때 연결해 볼 학과 분야와 직업의 예는?',choices:[pathways[(i+5)%12].major+' · '+pathways[(i+5)%12].job,p.major+' · '+p.job,pathways[(i+9)%12].major+' · '+pathways[(i+9)%12].job],correct:1,explanation:p.major+' 분야와 '+p.job+'의 일을 살펴볼 수 있어요. 한 학과가 한 직업으로만 이어지는 것은 아니에요.'}
]);
export function careerAction(s,b){const fail=m=>{throw Object.assign(Error(m),{status:400})};s.career??={cart:{},solved:[]};const c=s.career;
 if(b.action==='career_answer'){const q=careerQuestions.find(q=>q.id===b.question);if(!q||b.answer!==q.correct)fail('다시 생각해 보세요. 과목 설명에서 단서를 찾을 수 있어요.');if(!c.solved.includes(q.id))c.solved.push(q.id)}
 else if(b.action==='career_save'){if(!pathways.some(p=>p.course===b.course||p.related===b.course))fail('과목을 확인해 주세요.');if(b.remove===true)delete c.cart[b.course];else{if(typeof b.reason!=='string'||b.reason.trim().length<2||b.reason.length>200)fail('선택 이유를 2~200자로 적어 주세요.');c.cart[b.course]=b.reason.trim()}}
 else if(b.action==='tutorial_hide')c.tutorialHidden=b.hidden===true;
}
export function careerSnapshot(s){return {pathways,questions:careerQuestions.map(({correct,...q})=>q),cart:s?.career?.cart||{},solved:s?.career?.solved||[],tutorialHidden:!!s?.career?.tutorialHidden};}
