const { clearSessionCookie } = require('../../lib/auth');

module.exports = (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'method not allowed' });
        return;
    }

    res.setHeader('Set-Cookie', clearSessionCookie());
    res.status(200).json({ ok: true });
};
