const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Initialize database first
const { initDatabase } = require('./database/init');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const exerciseRoutes = require('./routes/exercises');
const assignmentRoutes = require('./routes/assignments');
const progressRoutes = require('./routes/progress');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// Routes
app.use('/api/auth', authRoutes.router);
app.use('/api/users', userRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/notifications', notificationRoutes.router);

// Serve React app in production
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Initialize database and start server
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Database initialized successfully');
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
