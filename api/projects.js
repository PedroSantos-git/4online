const { sql, ensureSchema } = require('../lib/db');
const { requireAdmin } = require('../lib/auth');

function isValidUrl(value) {
    return typeof value === 'string' && /^https?:\/\//i.test(value);
}

module.exports = async (req, res) => {
    await ensureSchema();

    if (req.method === 'GET') {
        const projects = await sql`SELECT id, name, url FROM projects ORDER BY created_at DESC`;
        res.status(200).json(projects);
        return;
    }

    if (req.method === 'POST') {
        if (!requireAdmin(req, res)) return;

        const { name, url } = req.body || {};
        if (typeof name !== 'string' || !name.trim() || !isValidUrl(url)) {
            res.status(400).json({ error: 'invalid name or url' });
            return;
        }

        const [project] = await sql`
            INSERT INTO projects (name, url) VALUES (${name.trim()}, ${url})
            RETURNING id, name, url
        `;
        res.status(201).json(project);
        return;
    }

    if (req.method === 'DELETE') {
        if (!requireAdmin(req, res)) return;

        const id = Number(req.query.id);
        if (!Number.isInteger(id)) {
            res.status(400).json({ error: 'invalid id' });
            return;
        }

        await sql`DELETE FROM projects WHERE id = ${id}`;
        res.status(200).json({ ok: true });
        return;
    }

    res.status(405).json({ error: 'method not allowed' });
};
