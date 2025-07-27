const sqlite3 = require('sqlite3').verbose();

class Database {
    constructor() {
        this.db = new sqlite3.Database('./killboard.db');
        this.init();
    }

    init() {
        this.db.serialize(() => {
            // Kill events table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS kill_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_id TEXT UNIQUE,
                    killer_name TEXT,
                    killer_id TEXT,
                    victim_name TEXT,
                    victim_id TEXT,
                    fame INTEGER,
                    timestamp DATETIME,
                    guild_member_involved TEXT,
                    is_kill BOOLEAN,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Guild members cache
            this.db.run(`
                CREATE TABLE IF NOT EXISTS guild_members (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    guild_id TEXT,
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Server settings
            this.db.run(`
                CREATE TABLE IF NOT EXISTS server_settings (
                    guild_id TEXT PRIMARY KEY,
                    killboard_channel TEXT,
                    language TEXT DEFAULT 'en',
                    builder_role TEXT,
                    status_channel TEXT
                )
            `);

            // Tracked entities (players/guilds to monitor)
            this.db.run(`
                CREATE TABLE IF NOT EXISTS tracked_entities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT,
                    entity_id TEXT,
                    entity_name TEXT,
                    entity_type TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Custom builds
            this.db.run(`
                CREATE TABLE IF NOT EXISTS builds (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT,
                    build_name TEXT,
                    creator_id TEXT,
                    weapon TEXT,
                    helmet TEXT,
                    armor TEXT,
                    shoes TEXT,
                    cape TEXT,
                    off_hand TEXT,
                    bag TEXT,
                    mount TEXT,
                    food TEXT,
                    potion TEXT,
                    spells TEXT,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
        });
    }

    // Server settings methods
    updateServerSettings(guildId, settings) {
        return new Promise((resolve, reject) => {
            const keys = Object.keys(settings);
            const values = keys.map(key => settings[key]);
            
            this.db.run(`
                INSERT OR REPLACE INTO server_settings (guild_id, ${keys.join(', ')})
                VALUES (?, ${keys.map(() => '?').join(', ')})
            `, [guildId, ...values], function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            });
        });
    }

    getServerSettings(guildId) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT * FROM server_settings WHERE guild_id = ?
            `, [guildId], (err, row) => {
                if (err) reject(err);
                else resolve(row || {});
            });
        });
    }

    // Tracking methods
    addTrackedEntity(guildId, entityId, entityName, entityType) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT OR IGNORE INTO tracked_entities (guild_id, entity_id, entity_name, entity_type)
                VALUES (?, ?, ?, ?)
            `, [guildId, entityId, entityName, entityType], function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            });
        });
    }

    removeTrackedEntity(guildId, entityId) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                DELETE FROM tracked_entities WHERE guild_id = ? AND entity_id = ?
            `, [guildId, entityId], function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            });
        });
    }

    getTrackedEntities(guildId) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM tracked_entities WHERE guild_id = ?
            `, [guildId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Build methods
    saveBuild(guildId, creatorId, buildData) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO builds (guild_id, build_name, creator_id, weapon, helmet, armor, shoes, cape, off_hand, bag, mount, food, potion, spells, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([
                guildId, buildData.name, creatorId, buildData.weapon, buildData.helmet,
                buildData.armor, buildData.shoes, buildData.cape, buildData.offHand,
                buildData.bag, buildData.mount, buildData.food, buildData.potion,
                JSON.stringify(buildData.spells), buildData.description
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
            stmt.finalize();
        });
    }

    getBuild(guildId, buildName) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT * FROM builds WHERE guild_id = ? AND build_name = ?
            `, [guildId, buildName], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    removeBuild(guildId, buildName, creatorId) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                DELETE FROM builds WHERE guild_id = ? AND build_name = ? AND creator_id = ?
            `, [guildId, buildName, creatorId], function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            });
        });
    }

    getAllBuilds(guildId) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT build_name, creator_id, created_at FROM builds WHERE guild_id = ?
                ORDER BY created_at DESC
            `, [guildId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Kill event methods
    saveKillEvent(event, guildMemberName, isKill) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR IGNORE INTO kill_events 
                (event_id, killer_name, killer_id, victim_name, victim_id, fame, timestamp, guild_member_involved, is_kill)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([
                event.EventId, event.Killer?.Name, event.Killer?.Id, event.Victim?.Name,
                event.Victim?.Id, event.TotalVictimKillFame, event.TimeStamp,
                guildMemberName, isKill
            ], function(err) {
                stmt.finalize();
                if (err) reject(err);
                else resolve(this.changes > 0);
            });
        });
    }

    getRecentKills(memberName, limit = 10) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM kill_events 
                WHERE guild_member_involved = ? 
                ORDER BY timestamp DESC 
                LIMIT ?
            `, [memberName, limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    updateGuildMembers(members) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO guild_members (id, name, guild_id, last_updated)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `);
        
        members.forEach(member => {
            stmt.run([member.Id, member.Name, member.GuildId]);
        });
        stmt.finalize();
    }

    close() {
        this.db.close();
    }
}

module.exports = Database;