# Messengers of Peace Scout Group

Website and admin dashboard for the Messengers of Peace scout group.

- **Public site:** home, about, units, activities, library, information, board members, members, gallery, contact and an online "Join Us" form.
- **Admin dashboard** (`/dashboard`, login required): members, join requests, attendance, contributions, finance, activities, library, information, board members, gallery, units, home page, about page, menu, settings, users and roles.

Almost everything on the public site is edited from the dashboard (Home Content, About Page, Units, Navigation, Settings, ...).

## Stack

| Part | Technology | Folder |
|---|---|---|
| Front end | React 19, Vite, React Router, Bootstrap 5 / react-bootstrap, react-icons, Chart.js | `Messenger Of Peace/client` |
| Back end | Node.js, Express 4, JWT auth, multer uploads, nodemailer | `Messenger Of Peace/server` |
| Database | MySQL 8 or MariaDB 10.4+ (XAMPP works) | created by `npm run migrate` |

The website calls the API at `/api` on its own address (`client/src/services/api.js`). Locally the Vite dev server forwards `/api` and `/uploads` to the server on port 3001; online one server serves both.

## Run it locally

### 1. Requirements
- Node.js 20 or newer
- MySQL or MariaDB on port 3306. With XAMPP, start **MySQL** in the XAMPP Control Panel.

### 2. Server
```bash
cd "Messenger Of Peace/server"
npm install
cp .env.example .env      # the defaults work locally with XAMPP
npm run migrate           # creates the database, tables and columns (safe to run again)
npm run seed              # roles, permissions, units, settings and the first admin
npm run seed:content      # the site's content: board members, documents, About page, units, menu, home slides
npm run dev               # API on http://localhost:3001
```

### 3. Website (in a second terminal)
```bash
cd "Messenger Of Peace/client"
npm install
npm run dev               # site on http://localhost:3000
```
If port 3000 is taken, run `npx vite --port 3002` instead. The API port must stay 3001.

### 4. Log in
Open `/login`. Locally the seed creates `admin@mop.rw` with the password `Admin@123`
(or the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in `server/.env`).
This password is public: never use it on the live site (see Deploy).

## Deploy (live site)

The simplest setup is **one Node server** that serves the API, the uploaded files and the website from one address (for example `https://mopscouts.rw`). Any host that runs Node.js 20 and can reach a MySQL/MariaDB database works (a VPS, Render, Railway, cPanel with Node, ...).

### 1. Database
Create an empty MySQL/MariaDB database and a user with a password. Note the host, port, name, user and password.

### 2. Settings (`server/.env` on the server, or the host's "environment variables")
Start from `server/.env.example` and set at least:

| Setting | Value on the live site |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | the port your host gives you (often set by the host itself) |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | two **different** long random strings: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | your database |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | the first admin: a real email and a strong password (12+ characters, letters and numbers) |
| `TRUST_PROXY` | `1` if the host puts a proxy in front of your app (Render, Railway, Nginx, Cloudflare, ...) |
| `UPLOAD_DIR` | a folder on a **permanent disk**, if your host wipes the app folder on each deploy |
| `TZ`, `DB_TIMEZONE` | keep `Africa/Kigali` and `+02:00` |
| `SITE_URL` | the live address, e.g. `https://mopscouts.rw` (required: used in "forgot password" emails) |
| `SMTP_*` | an email account for sending, e.g. Gmail with an app password. Without it, "forgot password" emails cannot be sent (members then ask a leader to reset their password) |

In production the server **refuses to start** if the login secrets are missing, still the example values or too short, or if `DB_PASSWORD` is empty. `npm run seed` refuses a missing or weak `ADMIN_PASSWORD`.

### 3. Build and start
```bash
# website
cd "Messenger Of Peace/client"
npm ci
npm run build             # makes client/dist

# server
cd "../server"
npm ci --omit=dev
npm run migrate
npm run seed
npm run seed:content
npm start                 # serves the API, /uploads and the website (client/dist)
```
Keep the server running with your host's process manager (or `pm2 start src/server.js --name mop`).
Use HTTPS (most hosts do this for you).

### 4. Check
- Open the site, reload on a deep page such as `/about` or `/dashboard`: it must show the page, not an error.
- Log in with your admin, then change its password in the dashboard.
- Upload a picture in the dashboard and restart the server: the picture must still be there (otherwise set `UPLOAD_DIR` to a permanent disk).

### 5. Backups
Back up two things regularly: the **database** (for example `mysqldump`) and the **uploads folder** (`UPLOAD_DIR`). Everything else is in git.

### Website and API on different addresses (optional)
If the website is hosted separately (a static host) from the API:
- build the website with `VITE_API_URL=https://api.example.org/api npm run build`;
- set `CORS_ORIGIN=https://www.example.org` on the server;
- make the static host forward `/uploads/*` to the API server (uploaded files are linked as `/uploads/...`), and send every unknown address to `index.html`.

## Project structure

```
Messenger Of Peace/
├── client/
│   ├── public/          images, videos and documents served as-is (/images/..., /videos/...)
│   └── src/
│       ├── App.jsx      all routes (public site + /dashboard)
│       ├── components/  Navbar, Footer, Sidebar
│       ├── config/      role groups (who sees which dashboard page), About page blocks
│       ├── context/     AuthContext (login state, token in localStorage)
│       ├── layouts/     PublicLayout, DashboardLayout
│       ├── pages/       one folder per feature (public/, members/, gallery/, ...)
│       ├── services/    api.js (axios instance with the auth token)
│       ├── utils/       shared helpers (dates, site settings, units, activities, About format)
│       └── index.css    theme colours (--mop-* variables) and all custom styles
├── server/
│   └── src/
│       ├── app.js       Express app: security headers, CORS, routes (/api/...), website in production
│       ├── server.js    starts the server (production safety checks first)
│       ├── config/      env.js (all .env settings), db.js (MySQL pool)
│       ├── middleware/  auth (authenticate, authorize by role/permission), upload
│       ├── routes/      one file per resource (members, activities, gallery, ...)
│       ├── uploads/     files uploaded from the dashboard (default UPLOAD_DIR, not in git)
│       └── utils/       migrate.js (schema), seed.js (roles, admin), seed-content.js (site content), audit, email
└── media-originals/     original photos kept as source material (not used by the website)
```

## Useful commands (server folder)

| Command | What it does |
|---|---|
| `npm run dev` | Start the server with auto-restart on changes |
| `npm start` | Start the server (use this on the live site) |
| `npm run migrate` | Create missing tables and columns. Never deletes data. |
| `npm run seed` | Insert roles, permissions, units, settings and the first admin (if missing) |
| `npm run seed:content` | Import the site's starting content. Skips anything already imported. |
