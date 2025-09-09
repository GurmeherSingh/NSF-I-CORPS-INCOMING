const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/init');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, sport, position } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Validate role
    if (!['trainer', 'athlete'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be trainer or athlete' });
    }

    // Check if user already exists
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('Database error during user check:', err);
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }
      if (user) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new user
      db.run(
        'INSERT INTO users (email, password, firstName, lastName, role, sport, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [email, hashedPassword, firstName, lastName, role, sport || null, position || null],
        function(err) {
          if (err) {
            console.error('Database error during user creation:', err);
            return res.status(500).json({ error: 'Failed to create user: ' + err.message });
          }

          // Generate JWT token
          const token = jwt.sign(
            { userId: this.lastID, email, role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
          );

          res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
              id: this.lastID,
              email,
              firstName,
              lastName,
              role,
              sport,
              position
            }
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login user
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    db.get(
      'SELECT * FROM users WHERE email = ?',
      [email],
      async (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
          { userId: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '7d' }
        );

        res.json({
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            sport: user.sport,
            position: user.position
          }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

// Get current user
router.get('/me', verifyToken, (req, res) => {
  db.get(
    'SELECT id, email, firstName, lastName, role, sport, position, createdAt FROM users WHERE id = ?',
    [req.user.userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    }
  );
});

module.exports = { router, verifyToken };
