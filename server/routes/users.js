const express = require('express');
const { db } = require('../database/init');
const { verifyToken } = require('./auth');

const router = express.Router();

// Get all athletes (for trainers)
router.get('/athletes', verifyToken, (req, res) => {
  if (req.user.role !== 'trainer') {
    return res.status(403).json({ error: 'Access denied. Trainers only.' });
  }

  db.all(
    'SELECT id, email, firstName, lastName, sport, position, createdAt FROM users WHERE role = ?',
    ['athlete'],
    (err, athletes) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(athletes);
    }
  );
});

// Get all trainers (for admin purposes)
router.get('/trainers', verifyToken, (req, res) => {
  db.all(
    'SELECT id, email, firstName, lastName, sport, createdAt FROM users WHERE role = ?',
    ['trainer'],
    (err, trainers) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(trainers);
    }
  );
});

// Get user by ID
router.get('/:id', verifyToken, (req, res) => {
  const userId = req.params.id;
  
  // Athletes can only view their own profile, trainers can view any profile
  if (req.user.role === 'athlete' && req.user.userId !== parseInt(userId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  db.get(
    'SELECT id, email, firstName, lastName, role, sport, position, createdAt FROM users WHERE id = ?',
    [userId],
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

// Update user profile
router.put('/:id', verifyToken, (req, res) => {
  const userId = req.params.id;
  const { firstName, lastName, sport, position } = req.body;

  // Users can only update their own profile
  if (req.user.userId !== parseInt(userId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  db.run(
    'UPDATE users SET firstName = ?, lastName = ?, sport = ?, position = ? WHERE id = ?',
    [firstName, lastName, sport, position, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ message: 'Profile updated successfully' });
    }
  );
});

// Get athlete's assigned exercises and progress
router.get('/:id/assignments', verifyToken, (req, res) => {
  const athleteId = req.params.id;

  // Athletes can only view their own assignments, trainers can view any athlete's assignments
  if (req.user.role === 'athlete' && req.user.userId !== parseInt(athleteId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const query = `
    SELECT 
      a.id as assignmentId,
      a.frequency,
      a.startDate,
      a.endDate,
      a.notes,
      a.status,
      e.id as exerciseId,
      e.name as exerciseName,
      e.description,
      e.instructions,
      e.videoUrl,
      e.bodyPart,
      e.category,
      e.duration,
      e.sets,
      e.reps,
      t.firstName as trainerFirstName,
      t.lastName as trainerLastName
    FROM assignments a
    JOIN exercises e ON a.exerciseId = e.id
    JOIN users t ON a.trainerId = t.id
    WHERE a.athleteId = ? AND a.status = 'active'
    ORDER BY a.startDate DESC
  `;

  db.all(query, [athleteId], (err, assignments) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get progress for each assignment
    const assignmentsWithProgress = assignments.map(assignment => {
      return new Promise((resolve) => {
        db.all(
          'SELECT * FROM progress WHERE assignmentId = ? ORDER BY completedDate DESC',
          [assignment.assignmentId],
          (err, progress) => {
            if (err) {
              resolve({ ...assignment, progress: [] });
            } else {
              resolve({ ...assignment, progress });
            }
          }
        );
      });
    });

    Promise.all(assignmentsWithProgress).then(results => {
      res.json(results);
    });
  });
});

module.exports = router;
