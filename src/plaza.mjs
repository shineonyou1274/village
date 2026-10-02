// Transient presence is separate from inventory, rewards and student progress.
export const plazaSchema=[
`CREATE TABLE IF NOT EXISTS plaza_visitors(player TEXT PRIMARY KEY REFERENCES players(id),room TEXT NOT NULL,x REAL NOT NULL,z REAL NOT NULL,tx REAL NOT NULL,tz REAL NOT NULL,moved INTEGER NOT NULL,seen INTEGER NOT NULL,greeted INTEGER NOT NULL DEFAULT 0)`,
`CREATE INDEX IF NOT EXISTS plaza_room_seen ON plaza_visitors(room,seen)`];
export function position(p,now){const dx=p.tx-p.x,dz=p.tz-p.z,d=Math.hypot(dx,dz),f=d?Math.min(1,Math.max(0,now-p.moved)/1000*3/d):1;return {x:p.x+dx*f,z:p.z+dz*f};}
export async function plazaApi(req,db,a,b,{json,err,limiter}){
 if(!a.player)err('학생으로 입장해 주세요.',403);
 const now=Date.now(),id=a.player.id;
 if(req.method==='POST'){
  // Keep a short-lived last position so classmates can distinguish a brief absence.
  if(b.action==='leave')await db.prepare('UPDATE plaza_visitors SET seen=? WHERE player=?').bind(now-16000,id).run();
  else{
   if(a.room.paused)err('교사가 수업을 일시정지했어요.',423);
   if(!['visit','move','wave'].includes(b.action))err('광장 행동을 확인해 주세요.');
   await limiter(db,'plaza:'+id,now,100);
   const old=await db.prepare('SELECT * FROM plaza_visitors WHERE player=?').bind(id).first();
   const live=old&&old.seen>now-15000,resume=old&&old.seen>now-120000;
   const slot=resume?0:(await db.prepare('SELECT count(*) n FROM players WHERE room=? AND id<?').bind(a.room.id,id).first()).n;
   // Keep the first arrivals far enough apart for both avatars and nameplates.
   const at=resume?position(old,now):{x:(slot%5-2)*2.2,z:-11.5-(Math.floor(slot/5)%6)};
   let tx=live?old.tx:at.x,tz=live?old.tz:at.z,greeted=live?old.greeted:0;
   if(b.action==='move'){if(typeof b.x!=='number'||typeof b.z!=='number'||!Number.isFinite(b.x)||!Number.isFinite(b.z)||b.x<-4.8||b.x>4.8||b.z<-17||b.z>-10.8)err('광장 안의 길을 선택해 주세요.');tx=b.x;tz=b.z;}
   if(b.action==='wave'){if(greeted>now-5000)err('인사는 5초 뒤에 다시 보낼 수 있어요.',429);greeted=now;}
   await db.prepare('INSERT INTO plaza_visitors(player,room,x,z,tx,tz,moved,seen,greeted) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(player) DO UPDATE SET x=excluded.x,z=excluded.z,tx=excluded.tx,tz=excluded.tz,moved=excluded.moved,seen=excluded.seen,greeted=excluded.greeted').bind(id,a.room.id,at.x,at.z,tx,tz,now,now,greeted).run();
  }
 }else if(req.method!=='GET')err('지원하지 않는 요청입니다.',405);
 const rows=await db.prepare("SELECT v.*,COALESCE(json_extract(p.state,'$.name'),p.name) name FROM plaza_visitors v JOIN players p ON p.id=v.player WHERE v.room=? AND v.seen>? ORDER BY v.player LIMIT 120").bind(a.room.id,now-105000).all();
 const market=await db.prepare('SELECT player FROM market_visitors WHERE room=? AND seen>?').bind(a.room.id,now-15000).all(),atMarket=new Set(market.results.map(v=>v.player));
 return json({serverTime:now,paused:!!a.room.paused,visitors:rows.results.map(p=>({id:p.player,name:p.name,...position(p,now),tx:p.tx,tz:p.tz,wave:now-p.greeted<4000,away:p.seen<=now-15000,atMarket:atMarket.has(p.player)}))});
}
