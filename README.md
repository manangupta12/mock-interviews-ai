# Mock Interview AI - MVP

An AI-powered mock interview platform for Software Development Engineer (SDE1) positions, focusing on Data Structures and Algorithms (DSA) problems.

## Features

- **User Authentication**: JWT-based authentication system
- **DSA Questions**: Pre-populated database of coding problems (Easy/Medium/Hard)
- **AI Interviewer**: Google Gemini 2.5 powered mock interviewer
- **Voice Transcription**: Real-time speech-to-text using Web Speech API
- **Code Editor**: Ace Editor with syntax highlighting and multiple language support
- **Code Execution**: Judge0 API integration for code compilation and testing
- **Interview Flow**: Complete interview workflow from explanation to optimization

## Tech Stack

### Backend
- **FastAPI**: Python web framework
- **PostgreSQL**: Database
- **SQLAlchemy**: ORM
- **Alembic**: Database migrations
- **Google Gemini 2.5**: AI interviewer
- **Judge0**: Code execution service

### Frontend
- **React**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Ace Editor**: Code editor
- **Web Speech API**: Voice transcription
- **React Router**: Routing

## Setup Instructions

### Prerequisites

- Python 3.9+
- Node.js 18+
- PostgreSQL 12+
- Google Gemini API key
- Judge0 API access (optional, can use free tier)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the backend directory:
```env
DATABASE_URL=postgresql://user:password@localhost/mock_interview_db
SECRET_KEY=your-secret-key-change-in-production
GEMINI_API_KEY=your-gemini-api-key
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your-judge0-api-key-if-required
```

5. Create PostgreSQL database:
```sql
CREATE DATABASE mock_interview_db;
```

6. Run database migrations:
```bash
alembic upgrade head
```

7. Seed the database with questions:
```bash
python database/seed_questions.py
```

8. Start the backend server:
```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the frontend directory (optional):
```env
VITE_API_URL=http://localhost:8000
```

4. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Usage

1. **Register/Login**: Create an account or login with existing credentials
2. **Select Difficulty**: Choose Easy, Medium, or Hard difficulty level
3. **Start Interview**: Click "Start Interview" to begin
4. **Grant Permissions**: Allow camera and microphone access
5. **Explain Solution**: Use voice or text to explain your approach
6. **Code Solution**: Write code in the editor once approved
7. **Run & Test**: Execute code and see test results
8. **Complete**: Finish the interview and receive feedback

## Project Structure

```
mock-interview-ai/
├── backend/
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── core/         # Configuration and database
│   │   ├── models/       # Database models
│   │   ├── services/     # Business logic (Gemini, Judge0)
│   │   └── main.py       # FastAPI app
│   ├── database/         # Seed scripts
│   ├── alembic/          # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── services/     # API and utility services
│   │   └── App.tsx
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Interviews
- `POST /api/interviews/start` - Start new interview session
- `POST /api/interviews/chat` - Send message to AI interviewer
- `POST /api/interviews/submit-code` - Submit code solution
- `POST /api/interviews/execute-code` - Execute code with test cases
- `GET /api/interviews/session/{session_id}` - Get session details

## Environment Variables

### Backend
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT secret key
- `GEMINI_API_KEY`: Google Gemini API key
- `JUDGE0_API_URL`: Judge0 API endpoint
- `JUDGE0_API_KEY`: Judge0 API key (if required)

### Frontend
- `VITE_API_URL`: Backend API URL (default: http://localhost:8000)

## Development

### Running Tests
```bash
# Backend tests (when implemented)
cd backend
pytest

# Frontend tests (when implemented)
cd frontend
npm test
```

### Database Migrations
```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

## Notes

- The MVP uses Web Speech API for voice transcription, which requires a modern browser with speech recognition support
- Judge0 free tier may have rate limits
- Google Gemini API requires an API key from Google AI Studio
- For production, ensure proper security measures (HTTPS, secure secrets, etc.)

## License

MIT

