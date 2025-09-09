const express = require('express');
const { db } = require('../database/init');
const { verifyToken } = require('./auth');

const router = express.Router();

// Get all assignments for a trainer
router.get('/trainer/:trainerId', verifyToken, (req, res) => {
  const trainerId = req.params.trainerId;

  // Only trainers can view their own assignments
  if (req.user.role !== 'trainer' || req.user.userId !== parseInt(trainerId)) {
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
      a.createdAt,
      e.id as exerciseId,
      e.name as exerciseName,
      e.description,
      e.bodyPart,
      e.category,
      e.duration,
      e.sets,
      e.reps,
      ath.firstName as athleteFirstName,
      ath.lastName as athleteLastName,
      ath.email as athleteEmail,
      ath.sport as athleteSport
    FROM assignments a
    JOIN exercises e ON a.exerciseId = e.id
    JOIN users ath ON a.athleteId = ath.id
    WHERE a.trainerId = ?
    ORDER BY a.createdAt DESC
  `;

  db.all(query, [trainerId], (err, assignments) => {
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

// Create new assignment (trainers only)
router.post('/', verifyToken, (req, res) => {
  if (req.user.role !== 'trainer') {
    return res.status(403).json({ error: 'Access denied. Trainers only.' });
  }

  const {
    athleteId,
    exerciseId,
    frequency,
    startDate,
    endDate,
    notes
  } = req.body;

  if (!athleteId || !exerciseId || !frequency || !startDate) {
    return res.status(400).json({ error: 'Athlete ID, exercise ID, frequency, and start date are required' });
  }

  // Validate frequency
  const validFrequencies = ['daily', 'weekly', 'twice_weekly', 'three_times_weekly'];
  if (!validFrequencies.includes(frequency)) {
    return res.status(400).json({ error: 'Invalid frequency. Must be daily, weekly, twice_weekly, or three_times_weekly' });
  }

  // Check if athlete exists
  db.get(
    'SELECT id FROM users WHERE id = ? AND role = ?',
    [athleteId, 'athlete'],
    (err, athlete) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!athlete) {
        return res.status(404).json({ error: 'Athlete not found' });
      }

      // Check if exercise exists
      db.get(
        'SELECT id FROM exercises WHERE id = ?',
        [exerciseId],
        (err, exercise) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          if (!exercise) {
            return res.status(404).json({ error: 'Exercise not found' });
          }

          // Create assignment
          db.run(
            `INSERT INTO assignments (athleteId, exerciseId, trainerId, frequency, startDate, endDate, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [athleteId, exerciseId, req.user.userId, frequency, startDate, endDate || null, notes || null],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to create assignment' });
              }

              // Create notification for athlete
              db.run(
                `INSERT INTO notifications (userId, title, message, type)
                 VALUES (?, ?, ?, ?)`,
                [
                  athleteId,
                  'New Exercise Assignment',
                  `You have been assigned a new exercise. Check your dashboard for details.`,
                  'assignment'
                ]
              );

              res.status(201).json({
                message: 'Assignment created successfully',
                assignmentId: this.lastID
              });
            }
          );
        }
      );
    }
  );
});

// Update assignment (trainers only)
router.put('/:id', verifyToken, (req, res) => {
  if (req.user.role !== 'trainer') {
    return res.status(403).json({ error: 'Access denied. Trainers only.' });
  }

  const assignmentId = req.params.id;
  const { frequency, startDate, endDate, notes, status } = req.body;

  // Check if assignment exists and belongs to this trainer
  db.get(
    'SELECT * FROM assignments WHERE id = ? AND trainerId = ?',
    [assignmentId, req.user.userId],
    (err, assignment) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found or access denied' });
      }

      db.run(
        `UPDATE assignments 
         SET frequency = ?, startDate = ?, endDate = ?, notes = ?, status = ?
         WHERE id = ?`,
        [frequency, startDate, endDate, notes, status, assignmentId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to update assignment' });
          }
          res.json({ message: 'Assignment updated successfully' });
        }
      );
    }
  );
});

// Delete assignment (trainers only)
router.delete('/:id', verifyToken, (req, res) => {
  if (req.user.role !== 'trainer') {
    return res.status(403).json({ error: 'Access denied. Trainers only.' });
  }

  const assignmentId = req.params.id;

  // Check if assignment exists and belongs to this trainer
  db.get(
    'SELECT * FROM assignments WHERE id = ? AND trainerId = ?',
    [assignmentId, req.user.userId],
    (err, assignment) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found or access denied' });
      }

      db.run('DELETE FROM assignments WHERE id = ?', [assignmentId], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to delete assignment' });
        }
        res.json({ message: 'Assignment deleted successfully' });
      });
    }
  );
});

// Get assignment statistics for trainer dashboard
router.get('/stats/:trainerId', verifyToken, (req, res) => {
  const trainerId = req.params.trainerId;

  if (req.user.role !== 'trainer' || req.user.userId !== parseInt(trainerId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const stats = {};

  // Total assignments
  db.get(
    'SELECT COUNT(*) as total FROM assignments WHERE trainerId = ?',
    [trainerId],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      stats.totalAssignments = result.total;

      // Active assignments
      db.get(
        'SELECT COUNT(*) as active FROM assignments WHERE trainerId = ? AND status = ?',
        [trainerId, 'active'],
        (err, result) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          stats.activeAssignments = result.active;

          // Completed assignments this week
          db.get(
            `SELECT COUNT(DISTINCT p.assignmentId) as completed
             FROM progress p
             JOIN assignments a ON p.assignmentId = a.id
             WHERE a.trainerId = ? AND p.completedDate >= date('now', '-7 days')`,
            [trainerId],
            (err, result) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }
              stats.completedThisWeek = result.completed;

              res.json(stats);
            }
          );
        }
      );
    }
  );
});

module.exports = router;
