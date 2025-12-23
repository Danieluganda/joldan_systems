/**
 * User Model
 * 
 * Represents system users with roles and permissions
 */

const db = require('../index');
const bcrypt = require('bcrypt');
const { validateEmail, validatePassword } = require('../../utils/validators');

class User {
  /**
   * Create a new user with password hashing and validation
   * @param {Object} data - User data
   * @param {string} data.email - User email
   * @param {string} data.password - Plain text password
   * @param {string} data.firstName - User's first name
   * @param {string} data.lastName - User's last name
   * @param {string} [data.phone] - User's phone number
   * @param {string} [data.role='VIEWER'] - User role
   * @returns {Promise<Object>} Created user (without password)
   */
  static async create(data) {
    try {
      // Validate required fields
      if (!data.email || !data.password || !data.firstName || !data.lastName) {
        throw new Error('Email, password, first name, and last name are required');
      }

      // Validate email format
      if (!validateEmail(data.email)) {
        throw new Error('Invalid email format');
      }

      // Validate password strength
      if (!validatePassword(data.password)) {
        throw new Error('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
      }

      // Check if email already exists
      const existingUser = await this.findByEmail(data.email);
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);

      const result = await db.query(
        `INSERT INTO users (email, password, first_name, last_name, phone, role, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, first_name, last_name, phone, role, status, created_at, updated_at`,
        [data.email, hashedPassword, data.firstName, data.lastName, data.phone, data.role || 'VIEWER', 'active']
      );
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Find user by ID (without password)
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User object or null
   */
  static async findById(id) {
    try {
      const result = await db.query(
        'SELECT id, email, first_name, last_name, phone, role, status, created_at, updated_at FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to find user by ID: ${error.message}`);
    }
  }

  /**
   * Find user by email (includes password for authentication)
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null
   */
  static async findByEmail(email) {
    try {
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error.message}`);
    }
  }

  /**
   * Find user by email (without password for general use)
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null
   */
  static async findByEmailSafe(email) {
    try {
      const result = await db.query(
        'SELECT id, email, first_name, last_name, phone, role, status, created_at, updated_at FROM users WHERE email = $1',
        [email]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error.message}`);
    }
  }

  /**
   * Update user information
   * @param {number} id - User ID
   * @param {Object} data - Updated user data
   * @returns {Promise<Object>} Updated user (without password)
   */
  static async update(id, data) {
    try {
      // Validate user exists
      const existingUser = await this.findById(id);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // If email is being updated, validate it
      if (data.email && data.email !== existingUser.email) {
        if (!validateEmail(data.email)) {
          throw new Error('Invalid email format');
        }
        
        // Check if new email already exists
        const emailExists = await this.findByEmailSafe(data.email);
        if (emailExists) {
          throw new Error('Email already exists');
        }
      }

      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (data.email) {
        updateFields.push(`email = $${paramCount++}`);
        values.push(data.email);
      }
      if (data.firstName) {
        updateFields.push(`first_name = $${paramCount++}`);
        values.push(data.firstName);
      }
      if (data.lastName) {
        updateFields.push(`last_name = $${paramCount++}`);
        values.push(data.lastName);
      }
      if (data.phone !== undefined) {
        updateFields.push(`phone = $${paramCount++}`);
        values.push(data.phone);
      }
      if (data.role) {
        updateFields.push(`role = $${paramCount++}`);
        values.push(data.role);
      }
      if (data.status) {
        updateFields.push(`status = $${paramCount++}`);
        values.push(data.status);
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(id);

      const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount} 
                     RETURNING id, email, first_name, last_name, phone, role, status, created_at, updated_at`;
      
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  /**
   * Soft delete user (set status to inactive)
   * @param {number} id - User ID
   * @returns {Promise<boolean>}
   */
  static async delete(id) {
    try {
      const existingUser = await this.findById(id);
      if (!existingUser) {
        throw new Error('User not found');
      }

      await db.query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2', ['inactive', id]);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Hard delete user (permanent removal)
   * @param {number} id - User ID
   * @returns {Promise<boolean>}
   */
  static async hardDelete(id) {
    try {
      const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Failed to hard delete user: ${error.message}`);
    }
  }

  /**
   * Get all users with pagination and filtering
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=20] - Items per page
   * @param {string} [options.search] - Search term
   * @param {string} [options.role] - Filter by role
   * @param {string} [options.status] - Filter by status
   * @returns {Promise<Object>} Users with pagination info
   */
  static async getAll(options = {}) {
    try {
      const { page = 1, limit = 20, search, role, status } = options;
      const offset = (page - 1) * limit;

      let whereConditions = [];
      let values = [];
      let paramCount = 1;

      if (search) {
        whereConditions.push(`(first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`);
        values.push(`%${search}%`);
        paramCount++;
      }

      if (role) {
        whereConditions.push(`role = $${paramCount}`);
        values.push(role);
        paramCount++;
      }

      if (status) {
        whereConditions.push(`status = $${paramCount}`);
        values.push(status);
        paramCount++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
      const countResult = await db.query(countQuery, values);
      const totalCount = parseInt(countResult.rows[0].count);

      // Get users
      const usersQuery = `
        SELECT id, email, first_name, last_name, phone, role, status, created_at, updated_at
        FROM users ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;
      
      const result = await db.query(usersQuery, [...values, limit, offset]);

      return {
        users: result.rows,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get users: ${error.message}`);
    }
  }

  /**
   * Get users by role
   * @param {string} role - User role
   * @returns {Promise<Array>} Array of users
   */
  static async getByRole(role) {
    try {
      const result = await db.query(
        'SELECT id, email, first_name, last_name, phone, role, status, created_at, updated_at FROM users WHERE role = $1 AND status = $2',
        [role, 'active']
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get users by role: ${error.message}`);
    }
  }

  /**
   * Verify user password
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @returns {Promise<Object|null>} User object (without password) if valid, null if invalid
   */
  static async verifyPassword(email, password) {
    try {
      const user = await this.findByEmail(email);
      if (!user) {
        return null;
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return null;
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      throw new Error(`Failed to verify password: ${error.message}`);
    }
  }

  /**
   * Update user password
   * @param {number} id - User ID
   * @param {string} newPassword - New plain text password
   * @returns {Promise<boolean>}
   */
  static async updatePassword(id, newPassword) {
    try {
      // Validate password strength
      if (!validatePassword(newPassword)) {
        throw new Error('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      const result = await db.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
        [hashedPassword, id]
      );

      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>} User statistics
   */
  static async getStats() {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
          COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_users,
          COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as admin_users,
          COUNT(CASE WHEN role = 'MANAGER' THEN 1 END) as manager_users,
          COUNT(CASE WHEN role = 'USER' THEN 1 END) as regular_users,
          COUNT(CASE WHEN role = 'VIEWER' THEN 1 END) as viewer_users
        FROM users
      `);
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to get user statistics: ${error.message}`);
    }
  }
}

module.exports = User;
