const DATABASE_VERSION = 3;

// Brings the database up to DATABASE_VERSION.
// Each version gets its own block and is never edited once shipped, so a
// device on any older version will be migrated to the same schema.
export async function migrate(db) {
    // get the current schema version of the database. If it's already at or above
    // DATABASE_VERSION, we don't need to do anything.
    const { user_version: current } = await db.getFirstAsync("PRAGMA user_version");
    if (current >= DATABASE_VERSION) {
        return current;
    }

    // The whole run is wrapped in a transaction: if a step fails the version is
    // not bumped, and the next launch retries from where it left off instead of
    // from a half-applied schema.
    await db.withTransactionAsync(async () => {
        if (current === 0) {
            await db.execAsync(`
                CREATE TABLE dreams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                transcript TEXT NOT NULL,
                capture_method TEXT NOT NULL,
                mood TEXT,
                audio_uri TEXT
                );
            `);
            await db.execAsync(`
                CREATE TABLE tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tag TEXT NOT NULL
                );
            `);
            await db.execAsync(`
                CREATE TABLE dream_tags (
                dream_id INTEGER NOT NULL,
                tag_id INTEGER NOT NULL,
                PRIMARY KEY (dream_id, tag_id),
                FOREIGN KEY (dream_id) REFERENCES dreams(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
                );
            `);
            await db.execAsync(`
                INSERT INTO tags (tag) VALUES
                ('lucid'),
                ('nightmare'),
                ('recurring'),
                ('vivid'),
                ('flying'),
                ('falling'),
                ('chase'),
                ('teeth'),
                ('water'),
                ('death'),
                ('school'),
                ('work'),
                ('family'),
                ('friends'),
                ('pets'),
                ('travel'),
                ('supernatural'),
                ('romance'),
                ('sports'),
                ('public speaking'),
                ('mall');
            `);
        }

        if (current < 2) {
            await db.execAsync(`
                ALTER TABLE tags ADD COLUMN canonical_id INTEGER REFERENCES tags(id) ON DELETE SET NULL;
            `);

            // Seed common aliases for existing tags
            // (find the canonical tag id, then insert the alias pointing to it)
            const aliases = {
                'death': ['dying', 'dead', 'died'],
                'flying': ['flew', 'flight'],
                'falling': ['fell', 'fall'],
                'chase': ['chased', 'chasing', 'pursued'],
                'teeth': ['tooth'],
                'water': ['ocean', 'swimming', 'underwater', 'river', 'lake'],
                'school': ['classroom', 'exam', 'teacher'],
                'travel': ['traveling', 'travelling', 'journey'],
                'romance': ['romantic', 'love'],
                'nightmare': ['scary', 'terrifying', 'horror'],
                'public speaking': ['presentation']
            };
            for (const [canonical, variants] of Object.entries(aliases)) {
                const parent = await db.getFirstAsync(
                    "SELECT id FROM tags WHERE tag = ? COLLATE NOCASE", canonical
                );
                if (!parent) continue;
                for (const variant of variants) {
                    await db.runAsync(
                        "INSERT INTO tags (tag, canonical_id) VALUES (?, ?)",
                        variant, parent.id
                    );
                }
            }
        }

        if (current < 3) {
            await db.execAsync(`
                CREATE TABLE settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            `);
        }

        await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
    });

    return DATABASE_VERSION;
}
