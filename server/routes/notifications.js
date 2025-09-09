const express = require('express');
const { db } = require('../database/init');
const { verifyToken } = require('./auth');

const router = express.Router();

// Get notifications for a user
router.get('/:userId', verifyToken, (req, res) => {
  const userId = req.params.userId;

  // Users can only view their own notifications
  if (req.user.userId !== parseInt(userId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  db.all(
    'SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50',
    [userId],
    (err, notifications) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(notifications);
    }
  );
});

// Mark notification as read
router.put('/:notificationId/read', verifyToken, (req, res) => {
  const notificationId = req.params.notificationId;

  // Check if notification exists and belongs to the user
  db.get(
    'SELECT * FROM notifications WHERE id = ? AND userId = ?',
    [notificationId, req.user.userId],
    (err, notification) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found or access denied' });
      }

      db.run(
        'UPDATE notifications SET isRead = TRUE WHERE id = ?',
        [notificationId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to update notification' });
          }
          res.json({ message: 'Notification marked as read' });
        }
      );
    }
  );
});

// Mark all notifications as read for a user
router.put('/:userId/read-all', verifyToken, (req, res) => {
  const userId = req.params.userId;

  // Users can only mark their own notifications as read
  if (req.user.userId !== parseInt(userId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  db.run(
    'UPDATE notifications SET isRead = TRUE WHERE userId = ?',
    [userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update notifications' });
      }
      res.json({ message: 'All notifications marked as read' });
    }
  );
});

// Create notification (internal use)
const createNotification = (userId, title, message, type) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO notifications (userId, title, message, type) VALUES (?, ?, ?, ?)',
      [userId, title, message, type],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
};

module.exports = { router, createNotification };
