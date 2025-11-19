#!/bin/bash

# Setup script for backend

echo "Setting up backend..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "Please update .env with your configuration"
fi

# Initialize Alembic if not already done
if [ ! -d "alembic/versions" ]; then
    echo "Initializing Alembic..."
    alembic init alembic
fi

# Create initial migration
echo "Creating initial migration..."
alembic revision --autogenerate -m "Initial migration"

# Apply migrations
echo "Applying migrations..."
alembic upgrade head

# Seed database
echo "Seeding database with questions..."
python database/seed_questions.py

echo "Backend setup complete!"
echo "Remember to:"
echo "1. Update .env with your API keys"
echo "2. Create PostgreSQL database: CREATE DATABASE mock_interview_db;"
echo "3. Update DATABASE_URL in .env"
echo "4. Run: uvicorn app.main:app --reload --port 8000"

