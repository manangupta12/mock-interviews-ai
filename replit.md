# Mock Interview AI - Replit Setup

## Project Overview

An AI-powered mock interview platform for Software Development Engineer (SDE1) positions, focusing on Data Structures and Algorithms (DSA) problems. Built with FastAPI (Python) backend and React (TypeScript) frontend.

## Recent Changes (November 19, 2024)

- Configured for Replit environment
- Set up PostgreSQL database with migrations
- Configured CORS for Replit domains
- Configured Vite frontend to run on port 5000 with proper host settings
- Added backend on localhost:8000
- Installed all dependencies and seeded database with interview questions
- Configured deployment settings

## Architecture

### Backend (FastAPI)
- **Location**: `backend/`
- **Port**: 8000 (localhost)
- **Database**: PostgreSQL (Replit managed)
- **Key Features**:
  - JWT authentication
  - Google Gemini 2.5 Flash AI interviewer
  - Judge0 API integration for code execution
  - RESTful API endpoints
  - Real-time interview session management

### Frontend (React + Vite + TypeScript)
- **Location**: `frontend/`
- **Port**: 5000 (exposed to internet)
- **Key Features**:
  - Modern React with TypeScript
  - Vite for fast development
  - Ace Editor for code editing
  - Web Speech API for voice transcription
  - Interview flow management

### Database Schema
- **Users**: Authentication and user profiles
- **Questions**: DSA problems (Easy/Medium/Hard)
- **Interview Sessions**: Track interview progress
- **Interview Transcripts**: Store conversation history

## Project Structure

```
/
├── backend/
│   ├── app/
│   │   ├── api/           # API endpoints (auth, interviews)
│   │   ├── core/          # Configuration and database setup
│   │   ├── models/        # SQLAlchemy models
│   │   ├── services/      # Business logic (Gemini, Judge0)
│   │   └── main.py        # FastAPI application
│   ├── alembic/           # Database migrations
│   ├── database/          # Seed scripts
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts (Auth, Interview)
│   │   └── services/      # API client services
│   ├── package.json
│   └── vite.config.ts     # Vite configuration (port 5000)
└── start.sh               # Startup script for both servers
```

## Environment Configuration

### Required Environment Variables
- `GEMINI_API_KEY`: Google Gemini API key (configured in Replit Secrets)
- `DATABASE_URL`: PostgreSQL connection (auto-configured by Replit)
- `SECRET_KEY`: JWT secret key (configured in backend/.env)
- `JUDGE0_API_URL`: Judge0 API endpoint (optional)
- `JUDGE0_API_KEY`: Judge0 API key (optional)

### Auto-configured by Replit
- `REPLIT_DOMAINS`: Automatically added to CORS allowed origins
- `REPLIT_DEV_DOMAIN`: Development domain for preview

## Running the Application

The application starts automatically via the workflow. Both servers run concurrently:
1. Backend server starts on localhost:8000
2. Frontend server starts on 0.0.0.0:5000

To manually restart:
- Use the Replit "Run" button or restart the workflow

## Database Management

### Migrations
```bash
cd backend
alembic upgrade head        # Apply migrations
alembic revision --autogenerate -m "description"  # Create new migration
```

### Seeding
```bash
cd backend
PYTHONPATH=. python database/seed_questions.py
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Interviews
- `POST /api/interviews/start` - Start interview session
- `POST /api/interviews/chat` - Send message to AI interviewer
- `POST /api/interviews/submit-code` - Submit code solution
- `POST /api/interviews/execute-code` - Execute code with test cases
- `GET /api/interviews/session/{session_id}` - Get session details
- `GET /api/interviews/past` - Get past interviews
- `GET /api/interviews/{session_id}/stats` - Get interview statistics

## User Preferences

### Development
- Frontend runs on port 5000 (required for Replit)
- Backend runs on localhost:8000
- Uses PostgreSQL database (Replit managed)
- CORS configured for Replit domains

### Deployment
- Configured for Replit Autoscale deployment
- Both servers start via start.sh script
- Environment variables managed via Replit Secrets

## Features

1. **User Authentication**: Secure JWT-based authentication
2. **DSA Questions**: Pre-populated database with coding problems
3. **AI Interviewer**: Powered by Google Gemini 2.5
4. **Voice Input**: Real-time speech-to-text using Web Speech API
5. **Code Editor**: Syntax highlighting with Ace Editor
6. **Code Execution**: Judge0 integration for testing solutions
7. **Interview Statistics**: Track performance across sessions
8. **Past Interviews**: Review previous interview sessions

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, Alembic, Google Gemini AI
- **Frontend**: React, TypeScript, Vite, Ace Editor
- **Database**: PostgreSQL (Replit managed)
- **Deployment**: Replit Autoscale

## Notes

- The application uses Web Speech API which requires a modern browser with speech recognition support
- Judge0 free tier may have rate limits
- Camera and microphone permissions are required for the interview feature
- All API calls from frontend are proxied through Vite to avoid CORS issues
