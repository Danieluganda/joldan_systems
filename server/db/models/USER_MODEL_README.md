# User Model - Updated Features

The User model has been significantly enhanced with the following improvements:

## 🔒 Security Features
- **Password Hashing**: All passwords are now hashed using bcrypt with salt rounds of 12
- **Input Validation**: Email format validation and password strength requirements
- **Safe Queries**: Passwords are excluded from most query results to prevent accidental exposure

## ✅ Validation
- **Email Validation**: Proper email format checking
- **Password Requirements**: 8+ characters with uppercase, lowercase, number, and special character
- **Name Validation**: Proper name format validation
- **Role Validation**: Only valid roles are accepted (ADMIN, MANAGER, USER, VIEWER)

## 🚀 Enhanced Functionality
- **Soft Delete**: Users are marked as inactive instead of hard deletion
- **Password Verification**: Secure password comparison for authentication  
- **Dynamic Updates**: Only provided fields are updated in the database
- **Pagination**: Support for paginated user listings
- **Search**: Full-text search across name and email fields
- **Statistics**: User count and role distribution stats

## 📊 New Methods

### Authentication
- `verifyPassword(email, password)` - Verify user credentials
- `updatePassword(id, newPassword)` - Update user password securely

### Enhanced Queries  
- `findByEmailSafe(email)` - Find user without password field
- `getAll(options)` - Get users with pagination, search, and filtering
- `getStats()` - Get user statistics and role distribution

### User Management
- `hardDelete(id)` - Permanent user removal (use with caution)
- Enhanced `update()` with validation and dynamic field updates

## 🛡️ Error Handling
All methods now include proper try-catch blocks with descriptive error messages for easier debugging and user feedback.

## 📝 Usage Examples

```javascript
// Create user with validation
const newUser = await User.create({
  email: 'user@example.com',
  password: 'SecurePass123!',
  firstName: 'John',
  lastName: 'Doe',
  role: 'USER'
});

// Get paginated users with search
const result = await User.getAll({
  page: 1,
  limit: 20,
  search: 'john',
  role: 'USER',
  status: 'active'
});

// Verify password for authentication
const user = await User.verifyPassword('user@example.com', 'SecurePass123!');

// Update user safely
const updatedUser = await User.update(userId, {
  firstName: 'Jane',
  phone: '+1-555-0123'
});
```

## 🔧 Dependencies Added
- `bcrypt` - For secure password hashing
- `validators.js` utility - For input validation functions

The model now follows security best practices and provides a robust foundation for user management in the procurement discipline application.