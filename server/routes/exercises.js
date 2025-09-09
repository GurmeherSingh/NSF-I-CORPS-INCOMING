const express = require('express');
const multer = require('multer');
const path = require('path');
const { db } = require('../database/init');
const { verifyToken } = require('./auth');

const router = express.Router();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/videos/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'exercise-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'), false);
    }
  }
});

// Get all exercises
router.get('/', verifyToken, (req, res) => {
  const { bodyPart, category, createdBy } = req.query;
  let query = `
    SELECT e.*, u.firstName as trainerFirstName, u.lastName as trainerLastName
    FROM exercises e
    JOIN users u ON e.createdBy = u.id
    WHERE 1=1
  `;
  const params = [];

  if (bodyPart) {
    query += ' AND e.bodyPart = ?';
    params.push(bodyPart);
  }

  if (category) {
    query += ' AND e.category = ?';
    params.push(category);
  }

  if (createdBy) {
    query += ' AND e.createdBy = ?';
    params.push(createdBy);
  }

  query += ' ORDER BY e.createdAt DESC';

  db.all(query, params, (err, exercises) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(exercises);
  });
});

// Get exercise by ID
router.get('/:id', verifyToken, (req, res) => {
  const exerciseId = req.params.id;

  db.get(
    `SELECT e.*, u.firstName as trainerFirstName, u.lastName as trainerLastName
     FROM exercises e
     JOIN users u ON e.createdBy = u.id
     WHERE e.id = ?`,
    [exerciseId],
    (err, exercise) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found' });
      }
      res.json(exercise);
    }
  );
});

// Create new exercise (trainers only)
router.post('/', verifyToken, upload.single('video'), (req, res) => {
  if (req.user.role !== 'trainer') {
    return res.status(403).json({ error: 'Access denied. Trainers only.' });
  }

  const {
    name,
    description,
    instructions,
    bodyPart,
    category,
    duration,
    sets,
    reps
  } = req.body;

  if (!name || !bodyPart || !category) {
    return res.status(400).json({ error: 'Name, body part, and category are required' });
  }

  const videoUrl = req.file ? `/uploads/videos/${req.file.filename}` : null;

  db.run(
    `INSERT INTO exercises (name, description, instructions, videoUrl, bodyPart, category, duration, sets, reps, createdBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, description, instructions, videoUrl, bodyPart, category, duration, sets, reps, req.user.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create exercise' });
      }

      // Get the created exercise with trainer info
      db.get(
        `SELECT e.*, u.firstName as trainerFirstName, u.lastName as trainerLastName
         FROM exercises e
         JOIN users u ON e.createdBy = u.id
         WHERE e.id = ?`,
        [this.lastID],
        (err, exercise) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.status(201).json(exercise);
        }
      );
    }
  );
});

// Update exercise (trainers only)
router.put('/:id', verifyToken, upload.single('video'), (req, res) => {
  if (req.user.role !== 'trainer') {
    return res.status(403).json({ error: 'Access denied. Trainers only.' });
  }

  const exerciseId = req.params.id;
  const {
    name,
    description,
    instructions,
    bodyPart,
    category,
    duration,
    sets,
    reps
  } = req.body;

  // Check if exercise exists and was created by this trainer
  db.get(
    'SELECT * FROM exercises WHERE id = ? AND createdBy = ?',
    [exerciseId, req.user.userId],
    (err, exercise) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found or access denied' });
      }

      const videoUrl = req.file ? `/uploads/videos/${req.file.filename}` : exercise.videoUrl;

      db.run(
        `UPDATE exercises 
         SET name = ?, description = ?, instructions = ?, videoUrl = ?, bodyPart = ?, category = ?, duration = ?, sets = ?, reps = ?
         WHERE id = ?`,
        [name, description, instructions, videoUrl, bodyPart, category, duration, sets, reps, exerciseId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to update exercise' });
          }
          res.json({ message: 'Exercise updated successfully' });
        }
      );
    }
  );
});

// Delete exercise (trainers only)
router.delete('/:id', verifyToken, (req, res) => {
  if (req.user.role !== 'trainer') {
    return res.status(403).json({ error: 'Access denied. Trainers only.' });
  }

  const exerciseId = req.params.id;

  // Check if exercise exists and was created by this trainer
  db.get(
    'SELECT * FROM exercises WHERE id = ? AND createdBy = ?',
    [exerciseId, req.user.userId],
    (err, exercise) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found or access denied' });
      }

      db.run('DELETE FROM exercises WHERE id = ?', [exerciseId], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to delete exercise' });
        }
        res.json({ message: 'Exercise deleted successfully' });
      });
    }
  );
});

// Get exercise categories and body parts for filtering
router.get('/meta/categories', verifyToken, (req, res) => {
  db.all(
    'SELECT DISTINCT category FROM exercises ORDER BY category',
    (err, categories) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(categories.map(c => c.category));
    }
  );
});

router.get('/meta/body-parts', verifyToken, (req, res) => {
  db.all(
    'SELECT DISTINCT bodyPart FROM exercises ORDER BY bodyPart',
    (err, bodyParts) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(bodyParts.map(b => b.bodyPart));
    }
  );
});

module.exports = router;
