const express = require('express');
const { db } = require('../database/init');
const { verifyToken } = require('./auth');

const router = express.Router();

// Log exercise completion
router.post('/', verifyToken, (req, res) => {
  const { assignmentId, notes, painLevel, difficulty } = req.body;

  if (!assignmentId) {
    return res.status(400).json({ error: 'Assignment ID is required' });
  }

  // Validate pain level and difficulty if provided
  if (painLevel && (painLevel < 1 || painLevel > 10)) {
    return res.status(400).json({ error: 'Pain level must be between 1 and 10' });
  }
  if (difficulty && (difficulty < 1 || difficulty > 5)) {
    return res.status(400).json({ error: 'Difficulty must be between 1 and 5' });
  }

  // Check if assignment exists and belongs to the user
  db.get(
    `SELECT a.*, ath.id as athleteId 
     FROM assignments a
     JOIN users ath ON a.athleteId = ath.id
     WHERE a.id = ?`,
    [assignmentId],
    (err, assignment) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      // Athletes can only log progress for their own assignments
      if (req.user.role === 'athlete' && req.user.userId !== assignment.athleteId) {
        return res.status(403).json({ error: 'Access denied.' });
      }

      // Check if already logged for today
      const today = new Date().toISOString().split('T')[0];
      db.get(
        'SELECT id FROM progress WHERE assignmentId = ? AND completedDate = ?',
        [assignmentId, today],
        (err, existingProgress) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          if (existingProgress) {
            return res.status(400).json({ error: 'Progress already logged for today' });
          }

          // Log progress
          db.run(
            `INSERT INTO progress (assignmentId, completedDate, notes, painLevel, difficulty)
             VALUES (?, ?, ?, ?, ?)`,
            [assignmentId, today, notes || null, painLevel || null, difficulty || null],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to log progress' });
              }

              // Create notification for trainer
              db.run(
                `INSERT INTO notifications (userId, title, message, type)
                 VALUES (?, ?, ?, ?)`,
                [
                  assignment.trainerId,
                  'Exercise Completed',
                  `An athlete has completed their assigned exercise.`,
                  'progress'
                ]
              );

              res.status(201).json({
                message: 'Progress logged successfully',
                progressId: this.lastID
              });
            }
          );
        }
      );
    }
  );
});

// Get progress for an assignment
router.get('/assignment/:assignmentId', verifyToken, (req, res) => {
  const assignmentId = req.params.assignmentId;

  // Check if assignment exists and user has access
  db.get(
    `SELECT a.*, ath.id as athleteId, t.id as trainerId
     FROM assignments a
     JOIN users ath ON a.athleteId = ath.id
     JOIN users t ON a.trainerId = t.id
     WHERE a.id = ?`,
    [assignmentId],
    (err, assignment) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      // Check access permissions
      const hasAccess = req.user.role === 'trainer' || 
                       (req.user.role === 'athlete' && req.user.userId === assignment.athleteId);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied.' });
      }

      // Get progress records
      db.all(
        'SELECT * FROM progress WHERE assignmentId = ? ORDER BY completedDate DESC',
        [assignmentId],
        (err, progress) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json(progress);
        }
      );
    }
  );
});

// Get athlete's progress summary
router.get('/athlete/:athleteId', verifyToken, (req, res) => {
  const athleteId = req.params.athleteId;

  // Athletes can only view their own progress, trainers can view any athlete's progress
  if (req.user.role === 'athlete' && req.user.userId !== parseInt(athleteId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const query = `
    SELECT 
      p.*,
      a.frequency,
      e.name as exerciseName,
      e.bodyPart,
      e.category
    FROM progress p
    JOIN assignments a ON p.assignmentId = a.id
    JOIN exercises e ON a.exerciseId = e.id
    WHERE a.athleteId = ?
    ORDER BY p.completedDate DESC
    LIMIT 50
  `;

  db.all(query, [athleteId], (err, progress) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(progress);
  });
});

// Get compliance statistics
router.get('/compliance/:athleteId', verifyToken, (req, res) => {
  const athleteId = req.params.athleteId;
  const { days = 30 } = req.query;

  // Athletes can only view their own compliance, trainers can view any athlete's compliance
  if (req.user.role === 'athlete' && req.user.userId !== parseInt(athleteId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));
  const startDateStr = startDate.toISOString().split('T')[0];

  // Get assignments and their expected completion based on frequency
  const query = `
    SELECT 
      a.id as assignmentId,
      a.frequency,
      a.startDate,
      e.name as exerciseName,
      COUNT(p.id) as completedCount,
      CASE 
        WHEN a.frequency = 'daily' THEN ?
        WHEN a.frequency = 'twice_weekly' THEN ? * 2
        WHEN a.frequency = 'three_times_weekly' THEN ? * 3
        WHEN a.frequency = 'weekly' THEN CEIL(? / 7.0)
        ELSE 0
      END as expectedCount
    FROM assignments a
    JOIN exercises e ON a.exerciseId = e.id
    LEFT JOIN progress p ON a.id = p.assignmentId AND p.completedDate >= ?
    WHERE a.athleteId = ? AND a.status = 'active' AND a.startDate <= ?
    GROUP BY a.id, a.frequency, a.startDate, e.name
  `;

  db.all(query, [parseInt(days), parseInt(days), parseInt(days), parseInt(days), startDateStr, athleteId, startDateStr], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const compliance = results.map(result => ({
      ...result,
      complianceRate: result.expectedCount > 0 ? (result.completedCount / result.expectedCount) * 100 : 0
    }));

    const overallCompliance = compliance.length > 0 
      ? compliance.reduce((sum, item) => sum + item.complianceRate, 0) / compliance.length 
      : 0;

    res.json({
      period: `${days} days`,
      overallCompliance: Math.round(overallCompliance),
      exerciseCompliance: compliance
    });
  });
});

// Update progress entry (for corrections)
router.put('/:progressId', verifyToken, (req, res) => {
  const progressId = req.params.progressId;
  const { notes, painLevel, difficulty } = req.body;

  // Validate pain level and difficulty if provided
  if (painLevel && (painLevel < 1 || painLevel > 10)) {
    return res.status(400).json({ error: 'Pain level must be between 1 and 10' });
  }
  if (difficulty && (difficulty < 1 || difficulty > 5)) {
    return res.status(400).json({ error: 'Difficulty must be between 1 and 5' });
  }

  // Check if progress entry exists and user has access
  db.get(
    `SELECT p.*, a.athleteId, a.trainerId
     FROM progress p
     JOIN assignments a ON p.assignmentId = a.id
     WHERE p.id = ?`,
    [progressId],
    (err, progress) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!progress) {
        return res.status(404).json({ error: 'Progress entry not found' });
      }

      // Check access permissions
      const hasAccess = req.user.role === 'trainer' || 
                       (req.user.role === 'athlete' && req.user.userId === progress.athleteId);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied.' });
      }

      // Update progress
      db.run(
        `UPDATE progress 
         SET notes = ?, painLevel = ?, difficulty = ?
         WHERE id = ?`,
        [notes, painLevel, difficulty, progressId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to update progress' });
          }
          res.json({ message: 'Progress updated successfully' });
        }
      );
    }
  );
});

module.exports = router;
