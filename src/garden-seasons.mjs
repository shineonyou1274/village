const fail=(m,status=409)=>{throw Object.assign(Error(m),{status})};
export const seasonSchema=[
`CREATE TABLE IF NOT EXISTS garden_seasons(room TEXT PRIMARY KEY,number INTEGER NOT NULL DEFAULT 1,automatic INTEGER NOT NULL DEFAULT 0,started INTEGER NOT NULL DEFAULT 0)`,
`CREATE TABLE IF NOT EXISTS garden_participants(room TEXT NOT NULL,season INTEGER NOT NULL,actor TEXT NOT NULL,PRIMARY KEY(room,season,actor))`,
`CREATE TABLE IF NOT EXISTS garden_archive(room TEXT NOT NULL,season INTEGER NOT NULL,completed INTEGER NOT NULL,participants INTEGER NOT NULL,PRIMARY KEY(room,season))`,
`CREATE INDEX IF NOT EXISTS command_garden_history ON commands(kind,room,created)`,
`INSERT OR IGNORE INTO garden_participants(room,season,actor) SELECT DISTINCT room,1,actor FROM commands WHERE kind IN ('crop_donate','garden_role') AND NOT EXISTS(SELECT 1 FROM garden_seasons s WHERE s.room=commands.room)`,
`INSERT OR IGNORE INTO garden_seasons(room) SELECT DISTINCT room FROM garden_participants`,
`CREATE TRIGGER IF NOT EXISTS garden_season_guard BEFORE INSERT ON commands WHEN NEW.kind IN ('crop_donate','garden_role') BEGIN
INSERT OR IGNORE INTO garden_seasons(room) VALUES(NEW.room);
SELECT CASE WHEN coalesce(json_extract(NEW.offer_data,'$.season'),1)<>(SELECT number FROM garden_seasons WHERE room=NEW.room) THEN RAISE(ABORT,'GARDEN_SEASON_CHANGED') END;
SELECT CASE WHEN NEW.kind='crop_donate' AND (SELECT count(*) FROM garden_roles WHERE room=NEW.room)=3 THEN RAISE(ABORT,'GARDEN_FINISHED') END;
INSERT OR IGNORE INTO garden_participants(room,season,actor) SELECT NEW.room,number,NEW.actor FROM garden_seasons WHERE room=NEW.room;
END`,
`CREATE TRIGGER IF NOT EXISTS garden_next_guard BEFORE UPDATE OF number ON garden_seasons WHEN NEW.number<>OLD.number BEGIN
SELECT CASE WHEN NEW.number<>OLD.number+1 OR (SELECT count(*) FROM garden_roles WHERE room=OLD.room)<>3 THEN RAISE(ABORT,'GARDEN_NOT_FINISHED') END;
INSERT OR IGNORE INTO growth_badges(actor,id,earned,reason) SELECT actor,'shared-lunch',NEW.started,'재료 기부 또는 역할을 맡아 공동 도시락 완성' FROM garden_participants WHERE room=OLD.room AND season=OLD.number;
INSERT INTO garden_archive(room,season,completed,participants) VALUES(OLD.room,OLD.number,NEW.started,(SELECT count(*) FROM garden_participants WHERE room=OLD.room AND season=OLD.number));
UPDATE garden_totals SET qty=qty-30 WHERE room=OLD.room;
DELETE FROM garden_roles WHERE room=OLD.room;
UPDATE rooms SET version=version+1 WHERE id=OLD.room;
END`,
`CREATE TRIGGER IF NOT EXISTS garden_auto_next AFTER INSERT ON garden_roles WHEN NEW.step=2 BEGIN
UPDATE garden_seasons SET number=number+1,started=NEW.created WHERE room=NEW.room AND automatic=1;
END`
];
export async function seasonAction(db,a,path,b){if(!a.teacher)fail('교사만 시즌을 운영할 수 있어요.',403);await db.prepare('INSERT OR IGNORE INTO garden_seasons(room) VALUES(?)').bind(a.room.id).run();if(path==='/api/growth/season-settings'){if(typeof b.automatic!=='boolean')fail('자동 시작 설정을 확인해 주세요.',400);await db.batch([db.prepare('UPDATE garden_seasons SET automatic=? WHERE room=?').bind(b.automatic?1:0,a.room.id),db.prepare('UPDATE garden_seasons SET number=number+1,started=? WHERE room=? AND automatic=1 AND (SELECT count(*) FROM garden_roles WHERE room=?)=3').bind(Date.now(),a.room.id,a.room.id)]);return}if(!Number.isInteger(b.season)||b.season<1)fail('시즌을 새로 확인해 주세요.');await db.prepare('UPDATE garden_seasons SET number=number+1,started=? WHERE room=? AND number=?').bind(Date.now(),a.room.id,b.season).run()}
