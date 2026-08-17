const { getSession, isAdminEmail } = require('../../lib/auth');

module.exports = (req, res) => {
    const session = getSession(req);
    if (!session || !isAdminEmail(session.email)) {
        res.status(200).json({ isAdmin: false });
        return;
    }

    res.status(200).json({ isAdmin: true, email: session.email, name: session.name });
};
