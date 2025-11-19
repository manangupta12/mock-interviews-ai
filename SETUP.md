# Quick Setup Guide

## Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 12+
- Google Gemini API key
- Judge0 API access (optional)

## Quick Start

### 1. Database Setup
```bash
# Create PostgreSQL database
createdb mock_interview_db

# Or using psql
psql -U postgres
CREATE DATABASE mock_interview_db;
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your configuration

# Run migrations
alembic upgrade head

# Seed questions
python database/seed_questions.py

# Start server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Create .env file (optional)
echo "VITE_API_URL=http://localhost:8000" > .env

# Start dev server
npm run dev
```

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@localhost/mock_interview_db
SECRET_KEY=your-secret-key-change-in-production
GEMINI_API_KEY=your-gemini-api-key
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your-judge0-api-key-if-required
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
```

## First Run

1. Start backend: `cd backend && uvicorn app.main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Open browser: `http://localhost:5173`
4. Register a new account
5. Select difficulty and start interview!

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify database exists: `psql -l | grep mock_interview_db`

### API Key Issues
- Get Gemini API key from: https://makersuite.google.com/app/apikey
- Judge0 free tier: https://rapidapi.com/judge0-official/api/judge0-ce

### Port Conflicts
- Backend default: 8000
- Frontend default: 5173
- Change in vite.config.ts if needed

