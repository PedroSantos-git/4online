const { verifyGoogleCredential, isAdminEmail, signSession, sessionCookie } = require('../../lib/auth');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'method not allowed' });
        return;
    }

    const { credential } = req.body || {};
    if (!credential) {
        res.status(400).json({ error: 'missing credential' });
        return;
    }

    let payload;
    try {
        payload = await verifyGoogleCredential(credential);
    } catch {
        res.status(401).json({ error: 'invalid credential' });
        return;
    }

    if (!payload.email_verified || !isAdminEmail(payload.email)) {
        res.status(403).json({ error: 'not authorized' });
        return;
    }

    const token = signSession(payload.email, payload.name);
    res.setHeader('Set-Cookie', sessionCookie(token));
    res.status(200).json({ isAdmin: true, email: payload.email, name: payload.name });
};
