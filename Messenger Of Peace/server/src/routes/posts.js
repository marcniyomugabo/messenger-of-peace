// News (table "posts"). Written in the dashboard (News) by the super admin, chief and media;
// only Published stories are public. A story's web address (slug) never changes after it is
// created, so links shared on WhatsApp keep working even if the title is edited.
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const EDITORS = ['super_admin', 'chief', 'media'];
const CATEGORIES = ['Group News', 'Activities & Camps', 'Youth Stories', 'Community Service', 'Achievements', 'Announcements'];
const STATUSES = ['Draft', 'Published', 'Archived'];

// A picture is an uploaded file (/uploads/...), a picture of the site (/images/...) or an https address.
const isSafePicture = v => /^\/(uploads|images)\/[^\s"'()<>\\]+$/.test(v) || /^https:\/\/[^\s"'()<>\\]+$/i.test(v);

const toSlug = (title) => String(title).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'story';

async function uniqueSlug(title) {
  const base = toSlug(title);
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const [rows] = await pool.query('SELECT id FROM posts WHERE slug = ?', [slug]);
    if (rows.length === 0) return slug;
  }
}

const storyRules = (creating) => [
  (creating ? body('title') : body('title').optional()).trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3 to 200 characters'),
  (creating ? body('content') : body('content').optional()).trim().isLength({ min: 20, max: 50000 }).withMessage('The story text must be at least 20 characters'),
  body('category').optional().isIn(CATEGORIES).withMessage('Unknown category'),
  body('status').optional().isIn(STATUSES).withMessage('Unknown status'),
  body('excerpt').optional({ values: 'falsy' }).trim().isLength({ max: 300 }).withMessage('The summary must be 300 characters or less'),
  body('featured_image').optional({ values: 'falsy' }).trim().custom(isSafePicture).withMessage('The picture must be uploaded, or an https:// address'),
  body('published_at').optional({ values: 'falsy' }).isISO8601().withMessage('Publish date must be a date'),
];

const LIST_FIELDS = 'p.id, p.title, p.slug, p.excerpt, p.category, p.featured_image, p.published_at';

// GET /api/posts - published stories, newest first (?category=&search=&page=&limit=)
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
], async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 9, 50);
    const where = ["p.status = 'Published'", 'p.published_at <= NOW()'];
    const params = [];
    if (req.query.category) { where.push('p.category = ?'); params.push(String(req.query.category)); }
    if (req.query.search) {
      const s = `%${String(req.query.search).slice(0, 100)}%`;
      where.push('(p.title LIKE ? OR p.excerpt LIKE ? OR p.content LIKE ?)');
      params.push(s, s, s);
    }
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM posts p WHERE ${where.join(' AND ')}`, params);
    const [rows] = await pool.query(
      `SELECT ${LIST_FIELDS} FROM posts p WHERE ${where.join(' AND ')}
       ORDER BY p.published_at DESC, p.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );
    res.json({ success: true, data: rows, total, page, categories: CATEGORIES });
  } catch (error) {
    console.error('News list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/posts/admin - every story, for the dashboard
router.get('/admin', authenticate, authorize(...EDITORS), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, u.email AS author_email FROM posts p LEFT JOIN users u ON u.id = p.created_by
       ORDER BY (p.status = 'Archived'), COALESCE(p.published_at, p.created_at) DESC`
    );
    res.json({ success: true, data: rows, categories: CATEGORIES });
  } catch (error) {
    console.error('News admin list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/posts/:slug - one published story
router.get('/:slug', async (req, res) => {
  try {
    const [[post]] = await pool.query(
      `SELECT p.id, p.title, p.slug, p.content, p.excerpt, p.category, p.featured_image, p.published_at
       FROM posts p WHERE p.slug = ? AND p.status = 'Published' AND p.published_at <= NOW()`,
      [req.params.slug]
    );
    if (!post) return res.status(404).json({ success: false, message: 'Story not found' });
    res.json({ success: true, data: post });
  } catch (error) {
    console.error('News story error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/posts - new story
router.post('/', authenticate, authorize(...EDITORS), storyRules(true), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
    const b = req.body;
    const status = b.status || 'Draft';
    const slug = await uniqueSlug(b.title);
    // A published story gets today's date unless an earlier date is given (e.g. last month's camp).
    const publishedAt = b.published_at ? new Date(b.published_at) : (status === 'Published' ? new Date() : null);
    const [result] = await pool.query(
      `INSERT INTO posts (title, slug, content, excerpt, category, featured_image, status, published_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.title, slug, b.content, b.excerpt || null, b.category || CATEGORIES[0], b.featured_image || null, status, publishedAt, req.user.id]
    );
    const [[post]] = await pool.query('SELECT * FROM posts WHERE id = ?', [result.insertId]);
    await logAction(req, 'news.created', 'news', post.id, { new: { title: post.title, status: post.status } });
    res.status(201).json({ success: true, message: 'Story saved', data: post });
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/posts/:id - edit a story (its web address stays the same)
router.put('/:id', authenticate, authorize(...EDITORS), [param('id').isInt(), ...storyRules(false)], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
    const [[before]] = await pool.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!before) return res.status(404).json({ success: false, message: 'Story not found' });

    const b = req.body;
    const fields = [];
    const params = [];
    for (const f of ['title', 'content', 'excerpt', 'category', 'featured_image', 'status']) {
      if (b[f] !== undefined) { fields.push(`${f} = ?`); params.push(b[f] === '' && ['excerpt', 'featured_image'].includes(f) ? null : b[f]); }
    }
    if (b.published_at) { fields.push('published_at = ?'); params.push(new Date(b.published_at)); }
    else if (b.status === 'Published' && !before.published_at) fields.push('published_at = NOW()');
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'Nothing to save' });

    await pool.query(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`, [...params, req.params.id]);
    const [[post]] = await pool.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    await logAction(req, 'news.updated', 'news', post.id, { old: { title: before.title, status: before.status }, new: { title: post.title, status: post.status } });
    res.json({ success: true, message: 'Story saved', data: post });
  } catch (error) {
    console.error('Update story error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/posts/:id - archive (hidden from the site, kept in the dashboard)
router.delete('/:id', authenticate, authorize('super_admin', 'chief'), [param('id').isInt()], async (req, res) => {
  try {
    const [result] = await pool.query("UPDATE posts SET status = 'Archived' WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Story not found' });
    await logAction(req, 'news.archived', 'news', Number(req.params.id));
    res.json({ success: true, message: 'Story archived' });
  } catch (error) {
    console.error('Archive story error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
