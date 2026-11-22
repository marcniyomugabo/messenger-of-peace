// All settings that change between a developer's computer and the live site, read once from
// server/.env (see .env.example). Locally the defaults just work; online, NODE_ENV=production
// turns on the checks in productionProblems().
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

// Where files uploaded from the dashboard are kept. Online this should be a permanent disk
// (many hosts wipe the app folder on every deploy).
const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '../uploads');

// Sites allowed to call the API from a browser, e.g. "https://mopscouts.rw,https://www.mopscouts.rw".
// Not needed when one server serves both the website and the API (the same site is always allowed).
const corsOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);

// Behind a host's proxy (Render, Railway, Nginx, ...) the visitor's real address is in a header.
// TRUST_PROXY=1 means "one proxy in front of the server"; without it every visitor looks the
// same and the login limit would block everybody at once.
const trustProxy = (() => {
  const v = (process.env.TRUST_PROXY || '').trim();
  if (!v || v === 'false' || v === '0') return false;
  if (v === 'true') return true;
  return /^\d+$/.test(v) ? Number(v) : v;
})();

// The database works in Kigali time, so NOW() / CURDATE() match the rest of the app even when
// the database server runs on UTC. Rwanda has no daylight saving time.
const dbTimezone = /^[+-]\d{2}:\d{2}$/.test(process.env.DB_TIMEZONE || '') ? process.env.DB_TIMEZONE : '+02:00';

// The built website (npm run build in client/). In production the API server also serves it.
const clientDist = process.env.CLIENT_DIST
  ? path.resolve(process.env.CLIENT_DIST)
  : path.join(__dirname, '../../../client/dist');

// The website's address, used in links sent by email (e.g. "forgot password").
// It comes from the settings, never from the request, so nobody can make an email point elsewhere.
const siteUrl = (process.env.SITE_URL || 'http://localhost:3000').trim().replace(/\/+$/, '');

const WEAK_SECRETS = ['change-me', 'change-me-too', 'secret', 'changeme'];

// Settings that must be right before the live site may start. Returns a list of problems.
function productionProblems() {
  const problems = [];
  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    const value = process.env[key] || '';
    if (!value) problems.push(`${key} is not set.`);
    else if (WEAK_SECRETS.includes(value.toLowerCase())) problems.push(`${key} is still the example value.`);
    else if (value.length < 32) problems.push(`${key} is too short (use at least 32 characters).`);
  }
  if (process.env.JWT_SECRET && process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    problems.push('JWT_SECRET and JWT_REFRESH_SECRET must be different.');
  }
  if (!process.env.DB_PASSWORD) problems.push('DB_PASSWORD is empty (the live database must have a password).');
  if (!/^https:\/\/[^\s/]+/i.test(process.env.SITE_URL || '')) problems.push('SITE_URL must be the live site address, starting with https:// (used in emailed links).');
  return problems;
}

module.exports = { isProduction, uploadDir, corsOrigins, trustProxy, dbTimezone, clientDist, siteUrl, productionProblems };
