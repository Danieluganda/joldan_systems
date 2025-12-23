/**
 * User Model
 * 
 * Represents system users with roles and permissions
 */

const db = require('../index');

class User {
  static async create(data) {
    const result = await db.query(
      `INSERT INTO users (email, password, first_name, last_name, phone, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [data.email, data.password, data.firstName, data.lastName, data.phone, data.role || 'VIEWER', 'active']
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  static async update(id, data) {
    const result = await db.query(
      `UPDATE users SET first_name = $1, last_name = $2, phone = $3, role = $4, updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [data.firstName, data.lastName, data.phone, data.role, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    return true;
  }

  static async getAll() {
    const result = await db.query('SELECT * FROM users ORDER BY created_at DESC');
    return result.rows;
  }

  static async getByRole(role) {
    const result = await db.query('SELECT * FROM users WHERE role = $1', [role]);
    return result.rows;
  }
}

module.exports = User;
