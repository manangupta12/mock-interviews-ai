#!/bin/bash

# Start backend server in background
cd backend && PYTHONPATH=. uvicorn app.main:app --host localhost --port 8000 --reload &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend server
cd frontend && npm run dev

# If frontend exits, kill backend
kill $BACKEND_PID 2>/dev/null
