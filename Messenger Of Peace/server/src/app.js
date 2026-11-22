const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const { isProduction, uploadDir, corsOrigins, trustProxy, clientDist } = require('./config/env');

const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');
const unitRoutes = require('./routes/units');
const leadershipRoutes = require('./routes/leadership');
const attendanceRoutes = require('./routes/attendance');
const eventRoutes = require('./routes/events');
const contributionRoutes = require('./routes/contributions');
const financeRoutes = require('./routes/finance');
const portfolioRoutes = require('./routes/portfolio');
const postRoutes = require('./routes/posts');
const mediaRoutes = require('./routes/media');
const reportRoutes = require('./routes/reports');
const settingRoutes = require('./routes/settings');
const dashboardRoutes = require('./routes/dashboard');
const contactMessageRoutes = require('./routes/contact-messages');
const announcementRoutes = require('./routes/announcements');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');
const roleRoutes = require('./routes/roles');
const auditLogRoutes = require('./routes/audit-logs');
const notificationRoutes = require('./routes/notifications');
const memberApplicationRoutes = require('./routes/member-applications');
const activityRoutes = require('./routes/activities');
const galleryRoutes = require('./routes/gallery');
const libraryRoutes = require('./routes/library');
const homepageRoutes = require('./routes/homepage');
const aboutRoutes = require('./routes/about');
const navigationRoutes = require('./routes/navigation');
const seoRoutes = require('./routes/seo');
const informationRoutes = require('./routes/information');
const concernRoutes = require('./routes/concerns');

const app = express();

// Behind a host's proxy, use the visitor's real address (login limits count per visitor).
app.set('trust proxy', trustProxy);

app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      // Admins may use pictures, videos and links from other https sites (slides, media).
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      'media-src': ["'self'", 'blob:', 'https:'],
    },
  },
}));
// Which other sites may call the API from a browser. The site itself (one server for the website
// and the API) needs no entry. Locally every origin is allowed, for the Vite dev server.
app.use(cors({
  origin: (origin, done) => done(null, !isProduction || !origin || corsOrigins.includes(origin)),
  credentials: true,
}));
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));

app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/leadership', leadershipRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/contact-messages', contactMessageRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/member-applications', memberApplicationRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/homepage', homepageRoutes);
app.use('/api/about', aboutRoutes);
app.use('/api/navigation', navigationRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/information', informationRoutes);
app.use('/api/concerns', concernRoutes);

// An unknown API address answers in JSON like every other API answer.
app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use('/uploads', (req, res) => res.status(404).json({ success: false, message: 'File not found' }));

// Online, this server also serves the built website (client/dist, made by "npm run build").
// Any other address (/about, /dashboard/members, ...) gets the app, which shows the right page.
if (isProduction && fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist, { index: false, maxAge: '7d' }));
  app.get('*', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  // Upload problems (file too large, unexpected field) are the client's fault, not a server error.
  const status = err.status || err.statusCode || (err.name === 'MulterError' ? 400 : 500);
  // Online, a server error never shows its details (they may describe the database).
  const message = err.type === 'entity.parse.failed' ? 'The request is not valid JSON'
    : status >= 500 && isProduction ? 'Server error' : (err.message || 'Server error');
  res.status(status).json({ success: false, message });
});

module.exports = app;
