const fail=(message,status=409)=>{throw Object.assign(new Error(message),{status})};
export const missionSchema=[
`CREATE TABLE IF NOT EXISTS missions(room TEXT PRIMARY KEY REFERENCES rooms(id),target INTEGER NOT NULL,goal INTEGER NOT NULL,food TEXT NOT NULL DEFAULT '[0,0,0,0]',started INTEGER NOT NULL,completed INTEGER NOT NULL DEFAULT 0)`,
`CREATE TABLE IF NOT EXISTS mission_contributions(room TEXT NOT NULL,actor TEXT NOT NULL,kind INTEGER NOT NULL,amount INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(room,actor,kind))`,
`CREATE TRIGGER IF NOT EXISTS mission_guard BEFORE INSERT ON commands WHEN NEW.kind IN ('mission_task','mission_donate') BEGIN
SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM missions WHERE room=NEW.room AND completed=0) THEN RAISE(ABORT,'MISSION_NOT_ACTIVE') END;
SELECT CASE WHEN NEW.kind='mission_task' AND EXISTS(SELECT 1 FROM mission_contributions WHERE room=NEW.room AND actor=NEW.actor AND kind=NEW.item) THEN RAISE(ABORT,'MISSION_ALREADY_DONE') END;
SELECT CASE WHEN (NEW.kind='mission_donate' OR (NEW.kind='mission_task' AND NEW.item>=2)) AND EXISTS(SELECT 1 FROM missions m WHERE m.room=NEW.room AND ((SELECT count(*) FROM mission_contributions WHERE room=m.room AND kind=0)<m.target OR (SELECT count(*) FROM mission_contributions WHERE room=m.room AND kind=1)<m.target)) THEN RAISE(ABORT,'MISSION_LOCKED') END;
SELECT CASE WHEN NEW.kind='mission_task' AND NEW.item>=2 AND EXISTS(SELECT 1 FROM missions m WHERE m.room=NEW.room AND (json_extract(food,'$[0]')<goal OR json_extract(food,'$[1]')<goal OR json_extract(food,'$[2]')<goal OR json_extract(food,'$[3]')<goal)) THEN RAISE(ABORT,'MISSION_LOCKED') END;
SELECT CASE WHEN NEW.kind='mission_task' AND NEW.item=3 AND EXISTS(SELECT 1 FROM missions m WHERE m.room=NEW.room AND (SELECT count(*) FROM mission_contributions WHERE room=m.room AND kind=2)<m.target) THEN RAISE(ABORT,'MISSION_LOCKED') END;
SELECT CASE WHEN NEW.kind='mission_donate' AND EXISTS(SELECT 1 FROM missions WHERE room=NEW.room AND json_extract(food,'$['||NEW.item||']')+NEW.qty>goal) THEN RAISE(ABORT,'MISSION_FULL') END;
END`,
`CREATE TRIGGER IF NOT EXISTS mission_apply AFTER INSERT ON commands WHEN NEW.kind IN ('mission_task','mission_donate') BEGIN
INSERT INTO mission_contributions(room,actor,kind,amount) VALUES(NEW.room,NEW.actor,CASE WHEN NEW.kind='mission_task' THEN NEW.item ELSE NEW.item+4 END,CASE WHEN NEW.kind='mission_task' THEN 1 ELSE NEW.qty END) ON CONFLICT(room,actor,kind) DO UPDATE SET amount=amount+excluded.amount;
UPDATE missions SET food=json_set(food,'$['||NEW.item||']',json_extract(food,'$['||NEW.item||']')+NEW.qty) WHERE room=NEW.room AND NEW.kind='mission_donate';
UPDATE rooms SET market=1,version=version+1 WHERE id=NEW.room AND market=0 AND NEW.kind='mission_task' AND NEW.item=0 AND EXISTS(SELECT 1 FROM missions m WHERE m.room=NEW.room AND (SELECT count(*) FROM mission_contributions WHERE room=m.room AND kind=0)>=m.target);
UPDATE rooms SET weather=4,version=version+1 WHERE id=NEW.room AND weather=3 AND EXISTS(SELECT 1 FROM missions m WHERE m.room=NEW.room AND (SELECT count(*) FROM mission_contributions WHERE room=m.room AND kind=0)>=m.target AND (SELECT count(*) FROM mission_contributions WHERE room=m.room AND kind=1)>=m.target);
UPDATE missions SET completed=NEW.created WHERE room=NEW.room AND completed=0 AND NEW.kind='mission_task' AND NEW.item=3 AND (SELECT count(*) FROM mission_contributions WHERE room=NEW.room AND kind=3)>=target;
END`
];
export async function missionSnapshot(db,room){const m=await db.prepare(`SELECT m.*,(SELECT json_group_array(json_object('actor',actor,'work',json(work))) FROM (SELECT actor,json_group_object(kind,amount) work FROM mission_contributions WHERE room=m.room GROUP BY actor)) helpers FROM missions m WHERE room=?`).bind(room).first();if(!m)return null;const helpers=JSON.parse(m.helpers||'[]'),counts=[0,1,2,3].map(i=>helpers.reduce((n,h)=>n+(h.work[i]?1:0),0));return {revision:helpers.reduce((n,h)=>n+Object.values(h.work).reduce((a,b)=>a+Number(b),0),0),target:m.target,goal:m.goal,food:JSON.parse(m.food),started:m.started,completed:m.completed,counts,helpers}}
export async function startMission(db,a,input){if(!a.teacher)fail('교사만 이야기를 시작할 수 있어요.',403);const prior=await missionSnapshot(db,a.room.id);if(prior)return;const enrolled=await db.prepare('SELECT count(*) n FROM players WHERE room=?').bind(a.room.id).first();const n=Number(input.participants??enrolled.n);if(!Number.isInteger(n)||n<1||n>enrolled.n)fail('참여 인원은 학급 인원 안에서 골라 주세요.',400);await db.batch([db.prepare('INSERT OR IGNORE INTO missions(room,target,goal,started) VALUES(?,?,?,?)').bind(a.room.id,Math.max(1,Math.ceil(n/8)),Math.max(1,Math.ceil(n/4)),Date.now()),db.prepare("UPDATE rooms SET phase='협력',weather=3,market=0,version=version+1 WHERE id=? AND EXISTS(SELECT 1 FROM missions WHERE room=? AND NOT EXISTS(SELECT 1 FROM mission_contributions WHERE room=?))").bind(a.room.id,a.room.id,a.room.id)])}
export async function reduceMissionGoals(db,a,input){
 if(!a.teacher)fail('교사만 목표를 조정할 수 있어요.',403);
 const mission=await missionSnapshot(db,a.room.id);
 if(!mission||mission.completed)fail('진행 중인 이야기가 없어요.');
 const enrolled=await db.prepare('SELECT count(*) n FROM players WHERE room=?').bind(a.room.id).first();
 const participants=Number(input.participants);
 if(!Number.isInteger(participants)||participants<1||participants>enrolled.n)fail('참여 인원은 학급 인원 안에서 골라 주세요.',400);
 const target=Math.min(mission.target,Math.ceil(participants/8));
 const goal=Math.max(...mission.food,Math.min(mission.goal,Math.ceil(participants/4)));
 await db.batch([
  db.prepare('UPDATE missions SET target=?,goal=? WHERE room=? AND completed=0').bind(target,goal,a.room.id),
  db.prepare('UPDATE rooms SET market=CASE WHEN ? >= ? THEN 1 ELSE market END,weather=CASE WHEN weather=3 AND ? >= ? AND ? >= ? THEN 4 ELSE weather END,version=version+1 WHERE id=?').bind(mission.counts[0],target,mission.counts[0],target,mission.counts[1],target,a.room.id)
 ]);
}
export async function prepareMissionAction(db,a,input,s){const m=await missionSnapshot(db,a.room.id);if(!m||m.completed)fail('진행 중인 이야기가 없거나 이미 완료됐어요.');const isTask=input.action==='mission_task',item=Number(input.item);if(!Number.isInteger(item)||item<0||item>3)fail('미션을 다시 선택해 주세요.',400);if(isTask){if(m.helpers.find(h=>h.actor===a.player.id)?.work[item])fail('이 직업 미션에는 이미 힘을 보탰어요.');if(item>=2&&(m.counts[0]<m.target||m.counts[1]<m.target||m.food.some(n=>n<m.goal)))fail('길과 전기를 복구하고 재료를 먼저 모아 주세요.');if(item===3&&m.counts[2]<m.target)fail('품질 검수를 먼저 마쳐 주세요.');if(input.answer!==[1,0,2,1][item])fail(['위험 구간을 피하고 안전한 경로를 확인하는 일을 생각해 보세요.','학생이 전기 설비를 만지는 대신 전문가에게 점검을 요청해야 해요.','수량뿐 아니라 보관 상태와 포장, 소비기한을 함께 확인해야 해요.','재료와 검수 기록을 조리·급식 담당자에게 함께 인계해야 해요.'][item],400);s.coins+=10;s.history=[['안전한 운송 경로','전력 복구','재료 품질 검수','급식 인계'][item]+' 미션에 힘을 보태고 10코인을 받았어요.',...s.history].slice(0,20);return {item,qty:1}}if(m.counts[0]<m.target||m.counts[1]<m.target)fail('길과 냉장 창고의 전기를 먼저 복구해 주세요.');const qty=Number(input.qty??1);if(!Number.isInteger(qty)||qty<1||qty>50||s.stock[item]<qty)fail('보관한 수량 안에서 재료를 골라 주세요.',400);if(m.food[item]+qty>m.goal)fail('이 재료는 이미 충분하거나 남은 목표보다 많아요.');s.stock[item]-=qty;s.history=['급식 준비에 '+['상추','우유','사과','생선'][item]+' '+qty+'개를 보탰어요.',...s.history].slice(0,20);return {item,qty}}
