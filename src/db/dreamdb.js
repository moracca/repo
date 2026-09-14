import * as SQLite from "expo-sqlite";
import { Directory, File, Paths } from 'expo-file-system';

import { migrate } from "./migrations";

let dbPromise = null;

// Ensure that the sqlite-vec extension is loaded for the given db connection.
async function ensureVectorSupport(db) {
    // sqlite-vec is only available in dev clients that have been built with
    // the `withSQLiteVecExtension` option enabled in app.json. If the extension
    // is not bundled, we cannot use vector functions. On web, the extension is 
    // not available at all, so we skip loading it.
    const extension = SQLite.bundledExtensions?.["sqlite-vec"];
    if (!extension) {
        console.warn(
        "sqlite-vec was not bundled into this build. Rebuild the dev client after enabling withSQLiteVecExtension."
        );
        return null;
    }

    try {
        // `withSQLiteVecExtension` in app.json only compiles sqlite-vec into the
        // native binary; each connection still has to load it explicitly before
        // vec_* functions resolve.
        await db.loadExtensionAsync(extension.libPath, extension.entryPoint);
        const row = await db.getFirstAsync("SELECT vec_version() AS version");
        console.log("sqlite-vec extension loaded, version:", row?.version ?? "unknown");
        return row?.version ?? null;
    } catch (error) {
        console.warn("Could not load the sqlite-vec extension:", error?.message ?? error);
        return null;
    }
}

export function getDatabase() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("dreamweaver.db")
        .then(async (db) => {
            // Use WAL mode for better concurrency and performance.
            await db.execAsync("PRAGMA journal_mode = WAL;");
            // SQLite defaults foreign keys OFF, per connection. Without this the
            // ON DELETE CASCADE on dream_tags never fires and deleting a dream
            // leaves its tag links behind. Must be set outside a transaction.
            await db.execAsync("PRAGMA foreign_keys = ON;");
            // Load the extension before migrating: a `vec0` virtual table cannot
            // be created until sqlite-vec has registered the module.
            await ensureVectorSupport(db);
            // run migrations to bring the database up to the latest schema version.
            await migrate(db);
            return db;
        })
        .catch((error) => {
            // Don't cache a rejected promise, or every later call fails too.
            dbPromise = null;
            throw error;
        });
  }

  return dbPromise;
}

 const DEFAULTS = {
      autoTagEnabled: 'true',
      startRecordingOnOpen: 'false',
      persistAudio: 'true',
  };

export async function getSettings() {
    const db = await getDatabase();
    const rows = await db.getAllAsync("SELECT key, value FROM settings");
    const stored = Object.fromEntries(rows.map(r => [r.key, r.value]));
    return { ...DEFAULTS, ...stored };
}
export async function setSetting(key, value) {
    const db = await getDatabase();
    await db.runAsync(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
        key, String(value), String(value)
    );
}

export async function insertDream({ transcript, captureMethod, audioUri = null, tags }) {
    const db = await getDatabase();
    const result = await db.runAsync(
        `INSERT INTO dreams (created_at, transcript, capture_method, audio_uri)
        VALUES (?, ?, ?, ?)`,
        new Date().toISOString(),
        transcript,
        captureMethod,
        audioUri
    );
    // An explicit tag list wins; fall back to the keyword heuristic only when
    // the caller didn't choose any.
    const chosen = tags?.length ? tags : await suggestTags(transcript);
    if (chosen.length > 0) {
        await setDreamTags(result.lastInsertRowId, chosen);
    }
    return result.lastInsertRowId;
}

export async function suggestTags(transcript) {
    const db = await getDatabase();
    // get every tag with its canonical name resolved.  join tags to itself and
    // coalesce the values to prefer the canonical tag over the alias 
    const rows = await db.getAllAsync(`
        SELECT
            t.tag AS match_text,
            COALESCE(c.tag, t.tag) AS canonical
        FROM tags t
        LEFT JOIN tags c ON t.canonical_id = c.id
    `);

    return matchTags(rows, transcript);
}

export function matchTags(rows, transcript) {
    const lower = transcript.toLowerCase();
    const seen = new Set();
    // we will search against the match text, which could be the canonical tag or
    // alias, and then map only the canonical name
    return rows
        .filter(row => lower.includes(row.match_text.toLowerCase()))
        .map(row => row.canonical)
        // exclude duplicates
        .filter(canonical => {
            const key = canonical.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

// export async function suggestTagsByVector(transcript) {
//     const db = await getDatabase();
//     // Use a vector search to find the most relevant tags for the given transcript.
//     // The vec0 virtual table is created by the sqlite-vec extension, and it uses
//     // the vec_search() function to find the closest matches in the tags table.
//     const rows = await db.getAllAsync(`
//         SELECT t.tag
//         FROM tags t, vec0('tags', 'tag', ?) AS v
//         WHERE t.id = v.rowid
//         ORDER BY v.score DESC
//         LIMIT 5
//     `, transcript);
//     return rows.map(row => row.tag);
// }

export async function listDreams() {
    const db = await getDatabase();
    return db.getAllAsync("SELECT * FROM dreams ORDER BY created_at DESC");
}

export async function listDreamsWithTags() {
    const db = await getDatabase();
    // The subquery aggregates each dream's tags into a JSON array of objects,
    // which gives us '[]' rather than NULL when a dream has no tags.
    const rows = await db.getAllAsync(`
        SELECT d.*,
               (SELECT json_group_array(json_object('id', t.id, 'tag', t.tag))
                  FROM dream_tags dt
                  JOIN tags t ON t.id = dt.tag_id
                WHERE dt.dream_id = d.id) AS tags
        FROM dreams d
        ORDER BY d.created_at DESC
    `);

    return rows.map((row) => ({
        ...row,
        tags: JSON.parse(row.tags ?? "[]")
    }));
}

export async function getDreamById(id) {
    const db = await getDatabase();
    const row = await db.getFirstAsync(`
        SELECT d.*,
               (SELECT json_group_array(json_object('id', t.id, 'tag', t.tag))
                  FROM dream_tags dt
                  JOIN tags t ON t.id = dt.tag_id
                 WHERE dt.dream_id = d.id) AS tags
        FROM dreams d
        WHERE d.id = ?
    `, id);

    if (!row) {
        return null;
    }
    return { ...row, tags: JSON.parse(row.tags ?? "[]") };
}

export function deduplicateTagNames(tagNames) {
    // De-duplicate case-insensitively so "Lucid" and "lucid" don't both stick.
    const seen = new Set();
    const names = [];
    for (const raw of tagNames) {
        const name = String(raw).trim();
        const key = name.toLowerCase();
        if (name && !seen.has(key)) {
            seen.add(key);
            names.push(name);
        }
    }
    return names;
}

// Replaces a dream's tags with exactly `tagNames`, creating any tag rows that
// don't exist yet.
export async function setDreamTags(dreamId, tagNames) {
    const db = await getDatabase();

    const names = deduplicateTagNames(tagNames);

    // Use a transaction so a dream is never left half-tagged.
    await db.withTransactionAsync(async () => {
        await db.runAsync("DELETE FROM dream_tags WHERE dream_id = ?", dreamId);

        for (const name of names) {
            const existing = await db.getFirstAsync(
                "SELECT id FROM tags WHERE tag = ? COLLATE NOCASE",
                name
            );
            const tagId = existing
                ? existing.id
                : (await db.runAsync("INSERT INTO tags (tag) VALUES (?)", name)).lastInsertRowId;

            await db.runAsync(
                "INSERT OR IGNORE INTO dream_tags (dream_id, tag_id) VALUES (?, ?)",
                dreamId,
                tagId
            );
        }
    });
}

export async function getTagCounts() {
    const db = await getDatabase();
    return db.getAllAsync(`
        SELECT t.tag, COUNT(dt.dream_id) AS count
            FROM tags t
            JOIN dream_tags dt ON dt.tag_id = t.id
            WHERE t.canonical_id IS NULL
            GROUP BY t.id
            ORDER BY count DESC`);
}

export async function getTagSetCounts() {
    const db = await getDatabase();
    const rows = await db.getAllAsync(`
        SELECT dt.dream_id, t.tag
        FROM dream_tags dt
        JOIN tags t ON t.id = dt.tag_id AND t.canonical_id IS NULL
        ORDER BY dt.dream_id, t.tag
    `);

    const groups = new Map();
    let currentDream = null;
    let currentTags = [];

    for (const row of rows) {
        if (row.dream_id !== currentDream) {
            if (currentTags.length > 1) {
                const key = currentTags.join('\0');
                groups.set(key, (groups.get(key) ?? 0) + 1);
            }
            currentDream = row.dream_id;
            currentTags = [];
        }
        currentTags.push(row.tag);
    }
    if (currentTags.length > 1) {
        const key = currentTags.join('\0');
        groups.set(key, (groups.get(key) ?? 0) + 1);
    }

    return [...groups.entries()]
        .map(([key, count]) => ({ tags: key.split('\0'), count }))
        .sort((a, b) => b.count - a.count);
}

export async function updateDreamTranscript(id, { transcript }) {
    const db = await getDatabase();
    await db.runAsync("UPDATE dreams SET transcript = ? WHERE id = ?", transcript, id);
}

export async function deleteDream(id) {
    const db = await getDatabase();
    // delete the audio file, but don't blow up if it doesn't exist
    const dream = await db.getFirstAsync("SELECT audio_uri FROM dreams WHERE id = ?", id);
    if (dream?.audio_uri) {
        const file = new File(dream.audio_uri);
        if (file.exists) {
            file.delete();
        }
    }


    await db.runAsync("DELETE FROM dreams WHERE id = ?", id);
}

export async function resetDatabase() {
    if (dbPromise) {
        const db = await dbPromise;
        await db.closeAsync();
        dbPromise = null;
    }
    // note: this might fail if the database is open in another connection, 
    // like if the app was hot reloaded and left the database open. In that case,
    // the user will have to close the app and restart it to reset the database.
    await SQLite.deleteDatabaseAsync("dreamweaver.db");

    const cacheDir = new Directory(Paths.cache);
    for (const entry of cacheDir.list()) {
        if (entry instanceof File && entry.name.startsWith('recording_') && entry.name.endsWith('.wav')) {
            entry.delete();
        }
    }
}

export async function countDreams() {
    const db = await getDatabase();
    const row = await db.getFirstAsync("SELECT COUNT(*) AS count FROM dreams");
    return row?.count ?? 0;
}

export async function listAllTags() {
    const db = await getDatabase();
    return db.getAllAsync("SELECT * FROM tags ORDER BY tag");
}

export async function listAllCanonicalTags() {
    const db = await getDatabase();
    // query for only the canonical tags, but include its aliases as an array.
    const rows = await db.getAllAsync(`
        SELECT c.id, c.tag,
                (SELECT json_group_array(a.tag)
                FROM tags a
                WHERE a.canonical_id = c.id) AS aliases
        FROM tags c
        WHERE c.canonical_id IS NULL
        ORDER BY c.tag
    `);
    return rows.map(row => ({
        ...row,
        // merge the aliases array into the row object
        aliases: JSON.parse(row.aliases ?? '[]'),
    }));
}

export async function deleteTag(tagId) {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM tags WHERE canonical_id = ?", tagId);
    await db.runAsync("DELETE FROM tags WHERE id = ?", tagId);
}

export async function deleteAlias(aliasName, canonicalId) {
    const db = await getDatabase();
    await db.runAsync(
        "DELETE FROM tags WHERE tag = ? COLLATE NOCASE AND canonical_id = ?",
        aliasName, canonicalId
    );
}

export async function addAlias(aliasName, canonicalId) {
    const db = await getDatabase();
    await db.runAsync(
        "INSERT INTO tags (tag, canonical_id) VALUES (?, ?)",
        aliasName.trim(), canonicalId
    );
}

export async function createTag(tagName) {
    const db = await getDatabase();
    const result = await db.runAsync("INSERT INTO tags (tag) VALUES (?)", tagName.trim());
    return result.lastInsertRowId;
}

export async function seedDreams() {
    const db = await getDatabase();
    const dreams = {
        "I was flying over a vast purple ocean at sunset. The water below shimmered with bioluminescent creatures. I could feel the wind but had no wings — just willpower keeping me aloft.": ['flying', 'vivid', 'water'],
        "Back in my old high school taking a final exam for a class I never attended. The questions were in a language I couldn't read. The clock was melting off the wall like a Dali painting.": ['school', 'recurring'],
        "My dog Max was talking to me in full sentences, explaining quantum physics. We were sitting in a café that kept shifting between Paris and Tokyo. He ordered an espresso.": ['pets', 'lucid'],
        "Teeth crumbling out of my mouth like chalk. I kept trying to push them back in but they turned to sand. Everyone around me acted like nothing was wrong.": ['teeth', 'nightmare'],
        "Swimming through an underwater city with glass buildings. Fish were commuting to work in tiny briefcases. I could breathe normally. A whale passed overhead like a bus.": ['water', 'vivid', 'travel'],
        "Being chased through a labyrinth made of bookshelves by a shadow with no source. Every book I pulled out had my name as the author but I'd never written any of them.": ['chase', 'nightmare'],
        "Family reunion at a house that was somehow every house I've ever lived in at once. Grandma was there even though she passed years ago. She made her cornbread and it tasted exactly right.": ['family', 'supernatural'],
        "Playing basketball with coworkers but the court was on a rooftop and the ball was a globe. Every shot that went in changed something about the skyline below.": ['work', 'sports', 'friends'],
        "Falling endlessly through clouds. Not scary — peaceful. Each cloud layer was a different color. I passed other people falling upward and we waved to each other.": ['falling', 'vivid'],
        "I realized I was dreaming and took control. Walked through walls, changed the sky from day to night. Tried to fly but could only hover a few feet up. The lucidity lasted maybe two minutes before the dream dissolved.": ['lucid', 'flying'],
        "Traveling through a train that never stopped. Each car was a different country. I ate street food in one car and it was snowing in the next. My friends were scattered across different cars.": ['travel', 'friends', 'vivid'],
        "A giant wave was approaching the shore. Instead of running I stood still and it parted around me. Underneath the wave was a whole civilization living in air pockets.": ['water', 'supernatural'],
        "Death showed up but looked like a tired accountant. Said there'd been a clerical error and I wasn't due for decades. We had coffee and talked about their job. They seemed lonely.": ['death', 'supernatural'],
        "The recurring hallway dream again. Same endless corridor, same flickering lights, same door at the end I can never reach. This time I noticed the wallpaper had tiny faces in the pattern.": ['recurring', 'nightmare'],
        "Supernatural creatures were real and integrated into society. A vampire was my Uber driver. A ghost worked at the DMV, which honestly explained a lot. Werewolf neighbors having a BBQ.": ['supernatural', 'vivid'],
        "Vivid romantic dream about someone I've never met. We were dancing in an empty ballroom that was slowly filling with water. Neither of us wanted to stop.": ['romance', 'vivid', 'water'],
        "I was a cat. Not a person who looked like a cat — I was fully a cat. Knocked a glass off a table and felt zero remorse. Napped in a sunbeam. Best dream I've had in months.": ['pets', 'lucid'],
        "Work deadline but the office was a spaceship and the deadline was literally a line in space we were approaching at light speed. My manager was an AI hologram who kept saying everything was fine.": ['work', 'nightmare'],
        "Flying again but this time with my family. We held hands in a chain across the sky. My sister kept doing loop-de-loops. Dad was nervous but laughing. Mom pointed out constellations.": ['flying', 'family', 'vivid'],
        "Lucid dream where I visited a library that contained every dream I've ever had, filed by date. I tried to read one from childhood but the pages were watercolors that shifted when I looked at them.": ['lucid', 'recurring', 'vivid'],
    };

    for (const [transcript, tags] of Object.entries(dreams)) {
        // don't create duplicates if this is run multiple times
        const existing = await db.getFirstAsync(
            "SELECT id FROM dreams WHERE transcript = ?", transcript
        );
        if (existing) continue;

        // Randomize the date within the past 90 days.
        const now = Date.now();
        const day = new Date(now - Math.random() * 90 * 24 * 60 * 60 * 1000);
        // Random hour between 9pm–10am (i.e. sleeping hours).
        const hour = Math.random() < 0.25
            ? 21 + Math.floor(Math.random() * 3)   // 21, 22, 23
            : Math.floor(Math.random() * 11);       // 0–10
        day.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

        const method = Math.random() < 0.8 ? 'voice' : 'keyboard';

        const result = await db.runAsync(
            `INSERT INTO dreams (created_at, transcript, capture_method) VALUES (?, ?, ?)`,
            day.toISOString(), transcript, method
        );

        if (tags.length > 0) {
            await setDreamTags(result.lastInsertRowId, tags);
        }
    }
}