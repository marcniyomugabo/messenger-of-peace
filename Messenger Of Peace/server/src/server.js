const fs = require('fs');
const path = require('path');
const { isProduction, productionProblems, clientDist, uploadDir } = require('./config/env');
const app = require('./app');
const pool = require('./config/db');
const { startNotificationCleanup } = require('./utils/notify');
const { cleanupExpiredSessions } = require('./utils/sessions');

const PORT = process.env.PORT || 3001;

// The live site must not start with unsafe settings (anyone could forge a login with the
// example secret). Locally these checks are skipped.
if (isProduction) {
  const problems = productionProblems();
  if (problems.length) {
    console.error('Cannot start in production. Fix these settings in server/.env (see .env.example):');
    for (const p of problems) console.error('  - ' + p);
    process.exit(1);
  }
  if (!fs.existsSync(path.join(clientDist, 'index.html'))) {
    console.warn(`[Website] No built website in ${clientDist}: only the API is served. Run "npm run build" in client/ to serve the site too.`);
  }
}

// Only start accepting requests once the database is reachable.
pool.checkConnection()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`MOP Server running on port ${PORT}${isProduction ? ' (production)' : ''}`);
      console.log(`[Uploads] Files uploaded from the dashboard are kept in ${uploadDir}`);
      startNotificationCleanup();
      // Expired device sign-ins: removed at start and once a day.
      cleanupExpiredSessions();
      setInterval(cleanupExpiredSessions, 24 * 60 * 60 * 1000).unref();
    });
  })
  .catch(() => {
    process.exit(1);
  });
