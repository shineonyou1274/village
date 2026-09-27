import {growthSchema} from './growth.mjs';
import {campusSchema} from './campus.mjs';
import {missionSchema} from './mission.mjs';
export const schema=[
`CREATE TABLE IF NOT EXISTS market_visitors(player TEXT PRIMARY KEY REFERENCES players(id),room TEXT NOT NULL,seen INTEGER NOT NULL,spot INTEGER NOT NULL DEFAULT 0,greeting TEXT NOT NULL DEFAULT '',greeted INTEGER NOT NULL DEFAULT 0)`,
`CREATE INDEX IF NOT EXISTS market_visitors_room_seen ON market_visitors(room,seen)`,
`CREATE TABLE IF NOT EXISTS rooms(id TEXT PRIMARY KEY,code TEXT NOT NULL UNIQUE,teacher_hash TEXT NOT NULL,day INTEGER NOT NULL DEFAULT 1,weather INTEGER NOT NULL DEFAULT 0,market INTEGER NOT NULL DEFAULT 0,paused INTEGER NOT NULL DEFAULT 0,phase TEXT NOT NULL DEFAULT '개인 성장',coop TEXT NOT NULL DEFAULT '[0,0,0,0]',goal INTEGER NOT NULL DEFAULT 10,version INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL)`,
`CREATE TABLE IF NOT EXISTS players(id TEXT PRIMARY KEY,room TEXT NOT NULL REFERENCES rooms(id),name TEXT NOT NULL,token_hash TEXT NOT NULL UNIQUE,state TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0,last_seen INTEGER NOT NULL DEFAULT 0,CHECK(json_extract(state,'$.coins')>=0),CHECK(json_extract(state,'$.stock[0]')>=0),CHECK(json_extract(state,'$.stock[1]')>=0),CHECK(json_extract(state,'$.stock[2]')>=0),CHECK(json_extract(state,'$.stock[3]')>=0))`,
`CREATE INDEX IF NOT EXISTS players_room ON players(room)`,
`CREATE TABLE IF NOT EXISTS offers(id TEXT PRIMARY KEY,room TEXT NOT NULL,seller TEXT NOT NULL,buyer TEXT,give_item INTEGER NOT NULL,give_qty INTEGER NOT NULL,want_item INTEGER NOT NULL,want_qty INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'open',created INTEGER NOT NULL)`,
`CREATE INDEX IF NOT EXISTS offers_room_status ON offers(room,status)`,
`CREATE TABLE IF NOT EXISTS commands(id TEXT PRIMARY KEY,actor TEXT NOT NULL,room TEXT NOT NULL,kind TEXT NOT NULL,version1 INTEGER NOT NULL,version2 INTEGER,partner TEXT,state1 TEXT NOT NULL,state2 TEXT,room_version INTEGER NOT NULL,offer TEXT,offer_data TEXT,item INTEGER,qty INTEGER,created INTEGER NOT NULL)`,
`CREATE INDEX IF NOT EXISTS commands_actor ON commands(actor,created)`,
`CREATE TABLE IF NOT EXISTS attempts(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL)`,
`CREATE TRIGGER IF NOT EXISTS command_guard BEFORE INSERT ON commands BEGIN
SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM rooms WHERE id=NEW.room AND version=NEW.room_version AND (paused=0 OR NEW.kind='cancel')) THEN RAISE(ABORT,'ROOM_CHANGED') END;
SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM players WHERE id=NEW.actor AND room=NEW.room AND version=NEW.version1) THEN RAISE(ABORT,'STATE_CHANGED') END;
SELECT CASE WHEN NEW.partner IS NOT NULL AND NOT EXISTS(SELECT 1 FROM players WHERE id=NEW.partner AND room=NEW.room AND version=NEW.version2) THEN RAISE(ABORT,'STATE_CHANGED') END;
SELECT CASE WHEN NEW.kind IN ('offer','accept') AND NOT EXISTS(SELECT 1 FROM rooms WHERE id=NEW.room AND market=1) THEN RAISE(ABORT,'MARKET_CLOSED') END;
SELECT CASE WHEN NEW.kind IN ('accept','cancel') AND NOT EXISTS(SELECT 1 FROM offers WHERE id=NEW.offer AND room=NEW.room AND status='open') THEN RAISE(ABORT,'OFFER_CLOSED') END;
END`,
`CREATE TRIGGER IF NOT EXISTS command_apply AFTER INSERT ON commands BEGIN
UPDATE players SET state=NEW.state1,version=version+1,last_seen=NEW.created WHERE id=NEW.actor;
UPDATE players SET state=NEW.state2,version=version+1 WHERE id=NEW.partner;
INSERT INTO offers(id,room,seller,give_item,give_qty,want_item,want_qty,created) SELECT NEW.offer,NEW.room,NEW.actor,json_extract(NEW.offer_data,'$.giveItem'),json_extract(NEW.offer_data,'$.giveQty'),json_extract(NEW.offer_data,'$.wantItem'),json_extract(NEW.offer_data,'$.wantQty'),NEW.created WHERE NEW.kind='offer';
UPDATE offers SET status='accepted',buyer=NEW.actor WHERE id=NEW.offer AND NEW.kind='accept';
UPDATE offers SET status='cancelled' WHERE id=NEW.offer AND NEW.kind='cancel';
UPDATE rooms SET coop=json_set(coop,'$['||NEW.item||']',json_extract(coop,'$['||NEW.item||']')+NEW.qty) WHERE id=NEW.room AND NEW.kind='donate';
END`,
...missionSchema,...campusSchema,...growthSchema
];
