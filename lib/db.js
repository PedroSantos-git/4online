const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

let ready;
function ensureSchema() {
    ready ??= sql`
        CREATE TABLE IF NOT EXISTS projects (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `;
    return ready;
}

module.exports = { sql, ensureSchema };
