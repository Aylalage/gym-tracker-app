const COOKIE_NAME = 'userId';
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header
      .split(';')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf('=');
        return [c.slice(0, idx), decodeURIComponent(c.slice(idx + 1))];
      })
  );
}

function getUserId(req) {
  const cookies = parseCookies(req);
  return cookies[COOKIE_NAME] || null;
}

function setUserCookie(res, userId) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(userId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}`
  );
}

function clearUserCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

// Verifies the logged-in user is an admin. Returns the userId on success;
// on failure it sends the response itself and returns null, so callers can
// just `if (!userId) return;`.
async function requireAdmin(req, res) {
  const prisma = require('./prisma');
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'not logged in' });
    return null;
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'admin access required' });
    return null;
  }
  return userId;
}

module.exports = { getUserId, setUserCookie, clearUserCookie, requireAdmin };
