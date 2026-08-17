const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const gClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleCredential(idToken) {
    const ticket = await gClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
}

function isAdminEmail(email) {
    return email === process.env.ADMIN_EMAIL;
}

function signSession(email, name) {
    return jwt.sign({ email, name }, process.env.SESSION_SECRET, { expiresIn: '7d' });
}

function verifySession(token) {
    try {
        return jwt.verify(token, process.env.SESSION_SECRET);
    } catch {
        return null;
    }
}

function sessionCookie(token) {
    return `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`;
}

function clearSessionCookie() {
    return 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
}

function getSession(req) {
    const token = req.cookies?.session;
    return token ? verifySession(token) : null;
}

function requireAdmin(req, res) {
    const session = getSession(req);
    if (!session || !isAdminEmail(session.email)) {
        res.status(403).json({ error: 'forbidden' });
        return null;
    }
    return session;
}

module.exports = {
    verifyGoogleCredential,
    isAdminEmail,
    signSession,
    sessionCookie,
    clearSessionCookie,
    getSession,
    requireAdmin,
};
