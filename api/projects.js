const { sql, ensureSchema } = require('../lib/db');
const { requireAdmin } = require('../lib/auth');

function isValidUrl(value) {
    return typeof value === 'string' && /^https?:\/\//i.test(value);
}

module.exports = async (req, res) => {
    await ensureSchema();

    if (req.method === 'GET') {
        const projects = await sql`SELECT id, name, url FROM projects ORDER BY position ASC NULLS FIRST, created_at DESC`;
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
            INSERT INTO projects (name, url, position)
            VALUES (${name.trim()}, ${url}, (SELECT COALESCE(MIN(position), 1) - 1 FROM projects))
            RETURNING id, name, url
        `;
        res.status(201).json(project);
        return;
    }

    if (req.method === 'PATCH') {
        if (!requireAdmin(req, res)) return;

        const id = Number(req.query.id);
        const { name, url } = req.body || {};
        if (!Number.isInteger(id) || typeof name !== 'string' || !name.trim() || !isValidUrl(url)) {
            res.status(400).json({ error: 'invalid id, name or url' });
            return;
        }

        const [project] = await sql`
            UPDATE projects SET name = ${name.trim()}, url = ${url}
            WHERE id = ${id}
            RETURNING id, name, url
        `;
        if (!project) {
            res.status(404).json({ error: 'not found' });
            return;
        }
        res.status(200).json(project);
        return;
    }

    // PUT { order: [id, id, ...] } — full new display order.
    if (req.method === 'PUT') {
        if (!requireAdmin(req, res)) return;

        const order = (req.body || {}).order;
        if (!Array.isArray(order) || !order.every(Number.isInteger) || new Set(order).size !== order.length) {
            res.status(400).json({ error: 'invalid order' });
            return;
        }

        await sql`
            UPDATE projects p SET position = o.pos
            FROM unnest(${order}::int[]) WITH ORDINALITY AS o(id, pos)
            WHERE p.id = o.id
        `;
        res.status(200).json({ ok: true });
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
