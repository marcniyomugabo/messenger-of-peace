const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, authorizePermission } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Permission names of a role, for the audit log's before/after.
const permissionNames = async (roleId) => {
  const [rows] = await pool.query(
    'SELECT p.name FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = ? ORDER BY p.name',
    [roleId]
  );
  return rows.map(r => r.name);
};

// Roles created by the seed. The code and the menus check these by name, so they can't be
// renamed or deleted (their description and permissions can still be changed).
const BUILT_IN_ROLES = ['super_admin', 'chief', 'deputy_chief', 'secretary', 'treasurer',
  'discipline_officer', 'unit_leader', 'media', 'member', 'applicant'];

router.get('/', authenticate, authorizePermission('users.manage'), async (req, res) => {
  try {
    const [roles] = await pool.query(`SELECT * FROM roles ORDER BY id ASC`);
    const result = [];
    for (let i = 0; i < roles.length; i++) {
      const [perms] = await pool.query(`SELECT COUNT(*) as count FROM role_permissions WHERE role_id = ?`, [roles[i].id]);
      result.push({ ...roles[i], permission_count: perms[0] ? perms[0].count : 0 });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('List roles error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/permissions/all', authenticate, authorizePermission('users.manage'), async (req, res) => {
  try {
    const [permissions] = await pool.query(`SELECT * FROM permissions ORDER BY module, name`);
    const grouped = {};
    permissions.forEach(p => {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    });
    res.json({ success: true, data: grouped });
  } catch (error) {
    console.error('List permissions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id', authenticate, authorizePermission('users.manage'), async (req, res) => {
  try {
    const [roles] = await pool.query(`SELECT * FROM roles WHERE id = ?`, [req.params.id]);
    if (!roles[0]) return res.status(404).json({ success: false, message: 'Role not found' });

    const [permissions] = await pool.query(
      `SELECT p.* FROM permissions p INNER JOIN role_permissions rp ON p.id = rp.permission_id WHERE rp.role_id = ?`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...roles[0], permissions } });
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', authenticate, authorizePermission('users.manage'), async (req, res) => {
  try {
    const { name, description, permission_ids } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Role name is required' });

    const [result] = await pool.query(`INSERT INTO roles (name, description) VALUES (?, ?)`, [name, description || null]);
    const roleId = result.insertId;

    if (permission_ids && permission_ids.length > 0) {
      for (const permId of permission_ids) {
        await pool.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`, [roleId, permId]);
      }
    }

    const [role] = await pool.query(`SELECT * FROM roles WHERE id = ?`, [roleId]);
    await logAction(req, 'role.created', 'roles', roleId, { new: { ...role[0], permissions: await permissionNames(roleId) } });
    res.status(201).json({ success: true, message: 'Role created', data: role[0] });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id', authenticate, authorizePermission('users.manage'), async (req, res) => {
  try {
    const [existing] = await pool.query(`SELECT * FROM roles WHERE id = ?`, [req.params.id]);
    if (!existing[0]) return res.status(404).json({ success: false, message: 'Role not found' });
    if (existing[0].name === 'super_admin') return res.status(400).json({ success: false, message: 'Cannot modify super_admin role' });

    const { name, description, permission_ids } = req.body;
    if (name !== undefined && name !== existing[0].name && BUILT_IN_ROLES.includes(existing[0].name)) {
      return res.status(400).json({ success: false, message: 'Built-in roles cannot be renamed' });
    }
    const before = { ...existing[0], permissions: await permissionNames(req.params.id) };
    if (name !== undefined || description !== undefined) {
      await pool.query(
        `UPDATE roles SET name = ?, description = ? WHERE id = ?`,
        [name || existing[0].name, description !== undefined ? description : existing[0].description, req.params.id]
      );
    }

    if (Array.isArray(permission_ids)) {
      await pool.query(`DELETE FROM role_permissions WHERE role_id = ?`, [req.params.id]);
      for (const permId of permission_ids) {
        await pool.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`, [req.params.id, permId]);
      }
    }

    const [role] = await pool.query(`SELECT * FROM roles WHERE id = ?`, [req.params.id]);
    await logAction(req, 'role.updated', 'roles', Number(req.params.id), {
      old: before, new: { ...role[0], permissions: await permissionNames(req.params.id) },
    });
    res.json({ success: true, message: 'Role updated', data: role[0] });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', authenticate, authorizePermission('users.manage'), async (req, res) => {
  try {
    const [existing] = await pool.query(`SELECT * FROM roles WHERE id = ?`, [req.params.id]);
    if (!existing[0]) return res.status(404).json({ success: false, message: 'Role not found' });
    if (BUILT_IN_ROLES.includes(existing[0].name)) return res.status(400).json({ success: false, message: 'Built-in roles cannot be deleted' });

    const [usersWithRole] = await pool.query(`SELECT COUNT(*) as count FROM users WHERE role_id = ?`, [req.params.id]);
    if (usersWithRole[0] && usersWithRole[0].count > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete role assigned to users' });
    }

    const before = { ...existing[0], permissions: await permissionNames(req.params.id) };
    await pool.query(`DELETE FROM role_permissions WHERE role_id = ?`, [req.params.id]);
    await pool.query(`DELETE FROM roles WHERE id = ?`, [req.params.id]);
    await logAction(req, 'role.deleted', 'roles', Number(req.params.id), { old: before });
    res.json({ success: true, message: 'Role deleted' });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
