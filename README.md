# NJIT Athlete Rehabilitation Management System

A comprehensive web application designed to help NJIT athletic trainers and athletes manage rehabilitation programs effectively.

## Features

### For Athletes
- View assigned rehabilitation exercises
- Track daily progress and compliance
- Access exercise videos and instructions
- Log pain levels and difficulty ratings
- Monitor overall progress and completion rates

### For Trainers
- Create and manage exercise library
- Assign exercises to athletes
- Monitor athlete compliance and progress
- Track rehabilitation statistics
- Manage multiple athletes simultaneously

## Technology Stack

- **Frontend**: React with TypeScript, Material-UI
- **Backend**: Node.js with Express
- **Database**: SQLite
- **Authentication**: JWT tokens
- **File Upload**: Multer for video uploads

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run install-all
   ```

3. Initialize the database:
   ```bash
   node server/init-db.js
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

This will start both the backend server (port 5000) and frontend development server (port 3000).

### Default Accounts

A default trainer account is created during database initialization:
- **Email**: trainer@njit.edu
- **Password**: trainer123

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts (Auth)
│   │   └── types/          # TypeScript type definitions
├── server/                 # Node.js backend
│   ├── routes/             # API routes
│   ├── database/           # Database initialization
│   └── index.js            # Server entry point
├── uploads/                # File uploads directory
└── package.json            # Root package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/athletes` - Get all athletes (trainers only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile

### Exercises
- `GET /api/exercises` - Get all exercises
- `POST /api/exercises` - Create exercise (trainers only)
- `PUT /api/exercises/:id` - Update exercise (trainers only)
- `DELETE /api/exercises/:id` - Delete exercise (trainers only)

### Assignments
- `GET /api/assignments/trainer/:trainerId` - Get trainer's assignments
- `POST /api/assignments` - Create assignment (trainers only)
- `PUT /api/assignments/:id` - Update assignment (trainers only)
- `DELETE /api/assignments/:id` - Delete assignment (trainers only)

### Progress
- `POST /api/progress` - Log exercise completion
- `GET /api/progress/assignment/:assignmentId` - Get assignment progress
- `GET /api/progress/athlete/:athleteId` - Get athlete's progress
- `GET /api/progress/compliance/:athleteId` - Get compliance statistics

## Usage

1. **Trainers** can:
   - Create exercise library with videos and instructions
   - Assign exercises to athletes with specific frequencies
   - Monitor athlete compliance and progress
   - View comprehensive statistics

2. **Athletes** can:
   - View their assigned exercises
   - Log daily progress with notes and ratings
   - Track their rehabilitation journey
   - Access exercise demonstrations

## Development

To run in development mode:
```bash
npm run dev
```

To build for production:
```bash
npm run build
```

## Contributing

This project is designed for NJIT's athletic rehabilitation needs. For modifications or enhancements, please follow the existing code structure and patterns.

## License

MIT License - See LICENSE file for details.
