const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

let ready;
function ensureSchema() {
    ready ??= (async () => {
        await sql`
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                url TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        `;
        // Manual ordering (admin drag-and-drop). Rows without a position are
        // backfilled in the previous display order (newest first).
        await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS position INTEGER`;
        await sql`
            UPDATE projects p SET position = o.rn
            FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn FROM projects) o
            WHERE p.id = o.id AND NOT EXISTS (SELECT 1 FROM projects WHERE position IS NOT NULL)
        `;
    })().catch((err) => { ready = undefined; throw err; });
    return ready;
}

module.exports = { sql, ensureSchema };
