const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'rehab.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table (trainers and athletes)
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          firstName TEXT NOT NULL,
          lastName TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('trainer', 'athlete')),
          sport TEXT,
          position TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Exercises table
      db.run(`
        CREATE TABLE IF NOT EXISTS exercises (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          instructions TEXT,
          videoUrl TEXT,
          bodyPart TEXT NOT NULL,
          category TEXT NOT NULL,
          duration INTEGER,
          sets INTEGER,
          reps INTEGER,
          createdBy INTEGER NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (createdBy) REFERENCES users (id)
        )
      `);

      // Assignments table
      db.run(`
        CREATE TABLE IF NOT EXISTS assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          athleteId INTEGER NOT NULL,
          exerciseId INTEGER NOT NULL,
          trainerId INTEGER NOT NULL,
          frequency TEXT NOT NULL,
          startDate DATE NOT NULL,
          endDate DATE,
          notes TEXT,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'paused')),
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (athleteId) REFERENCES users (id),
          FOREIGN KEY (exerciseId) REFERENCES exercises (id),
          FOREIGN KEY (trainerId) REFERENCES users (id)
        )
      `);

      // Progress tracking table
      db.run(`
        CREATE TABLE IF NOT EXISTS progress (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          assignmentId INTEGER NOT NULL,
          completedDate DATE NOT NULL,
          notes TEXT,
          painLevel INTEGER CHECK(painLevel >= 1 AND painLevel <= 10),
          difficulty INTEGER CHECK(difficulty >= 1 AND difficulty <= 5),
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (assignmentId) REFERENCES assignments (id)
        )
      `);

      // Notifications table
      db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL,
          isRead BOOLEAN DEFAULT FALSE,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users (id)
        )
      `);

      // Create default trainer account
      const defaultPassword = bcrypt.hashSync('trainer123', 10);
      db.run(`
        INSERT OR IGNORE INTO users (email, password, firstName, lastName, role, sport)
        VALUES ('trainer@njit.edu', ?, 'John', 'Smith', 'trainer', 'General')
      `, [defaultPassword], (err) => {
        if (err) {
          console.error('Error creating default trainer:', err);
        } else {
          console.log('Default trainer account created: trainer@njit.edu / trainer123');
        }
      });

      // Create sample exercises
      const sampleExercises = [
        {
          name: 'Ankle Circles',
          description: 'Gentle ankle mobility exercise',
          instructions: 'Sit comfortably and slowly rotate your ankle in circles, both clockwise and counterclockwise',
          bodyPart: 'ankle',
          category: 'mobility',
          duration: 60,
          sets: 3,
          reps: 10
        },
        {
          name: 'Wall Push-ups',
          description: 'Modified push-up for shoulder rehabilitation',
          instructions: 'Stand facing a wall, place hands on wall at shoulder height, perform push-up motion',
          bodyPart: 'shoulder',
          category: 'strength',
          duration: 120,
          sets: 3,
          reps: 15
        },
        {
          name: 'Quad Stretch',
          description: 'Static stretch for quadriceps',
          instructions: 'Stand on one leg, pull other foot to glutes, hold stretch for 30 seconds',
          bodyPart: 'quadriceps',
          category: 'flexibility',
          duration: 30,
          sets: 2,
          reps: 1
        }
      ];

      sampleExercises.forEach((exercise, index) => {
        db.run(`
          INSERT OR IGNORE INTO exercises (name, description, instructions, bodyPart, category, duration, sets, reps, createdBy)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [exercise.name, exercise.description, exercise.instructions, exercise.bodyPart, exercise.category, exercise.duration, exercise.sets, exercise.reps]);
      });

      console.log('Database initialized successfully');
      resolve();
    });
  });
};

module.exports = { db, initDatabase };
