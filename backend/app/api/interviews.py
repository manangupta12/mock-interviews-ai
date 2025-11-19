from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional, Dict
from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.question import Question
from app.models.session import InterviewSession, InterviewTranscript
from app.services.gemini_service import GeminiInterviewer
from app.services.judge0_service import Judge0Service
from datetime import datetime

router = APIRouter(prefix="/api/interviews", tags=["interviews"])

gemini_interviewer = GeminiInterviewer()
judge0_service = Judge0Service()


class StartInterviewRequest(BaseModel):
    difficulty: str  # Easy, Medium, Hard
    company: Optional[str] = None  # Optional company tag (e.g., "Google", "Amazon", "Meta", etc.)


class StartInterviewResponse(BaseModel):
    session_id: int
    question: dict


class ChatRequest(BaseModel):
    message: str
    session_id: int


class ChatResponse(BaseModel):
    message: str
    next_stage: str


class SubmitCodeRequest(BaseModel):
    session_id: int
    code: str
    language: str


class ExecuteCodeRequest(BaseModel):
    session_id: int
    code: str
    language: str

class SaveStatisticsRequest(BaseModel):
    session_id: int
    stage_times: Dict[str, int]  # Stage name -> time in seconds


@router.post("/start", response_model=StartInterviewResponse)
def start_interview(
    request: StartInterviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Build query filter
    query = db.query(Question).filter(Question.difficulty == request.difficulty)
    
    # Filter by company if provided
    if request.company and request.company != "General" and request.company != "All":
        query = query.filter(Question.company == request.company)
    
    # Get random question
    question = query.order_by(func.random()).first()
    
    if not question:
        error_msg = f"No {request.difficulty} questions available"
        if request.company and request.company != "General" and request.company != "All":
            error_msg += f" for {request.company}"
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_msg
        )
    
    # Create interview session
    session = InterviewSession(
        user_id=current_user.id,
        question_id=question.id,
        status="in_progress",
        current_stage="explanation"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # Return question details
    question_data = {
        "id": question.id,
        "title": question.title,
        "description": question.description,
        "difficulty": question.difficulty,
        "company": question.company,
        "examples": question.examples or [],
        "constraints": question.constraints,
        "test_cases": question.test_cases or []
    }
    
    return {
        "session_id": session.id,
        "question": question_data
    }


@router.post("/chat", response_model=ChatResponse)
def chat_with_interviewer(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get session
    session = db.query(InterviewSession).filter(
        InterviewSession.id == request.session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found"
        )
    
    # Get question
    question = db.query(Question).filter(Question.id == session.question_id).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    # Save user message to transcript
    user_transcript = InterviewTranscript(
        session_id=session.id,
        speaker="user",
        message=request.message
    )
    db.add(user_transcript)
    db.flush()  # Flush to get the transcript ID
    
    # Get conversation history
    transcripts = db.query(InterviewTranscript).filter(
        InterviewTranscript.session_id == session.id
    ).order_by(InterviewTranscript.timestamp).all()
    
    conversation_history = [
        {"speaker": t.speaker, "message": t.message}
        for t in transcripts
    ]
    
    # Get AI response
    ai_response = gemini_interviewer.get_interviewer_response(
        user_message=request.message,
        question_title=question.title,
        question_description=question.description,
        difficulty=question.difficulty,
        current_stage=session.current_stage,
        conversation_history=conversation_history,
        code_solution=session.code_solution
    )
    
    # Save AI response to transcript
    ai_transcript = InterviewTranscript(
        session_id=session.id,
        speaker="interviewer",
        message=ai_response["message"]
    )
    db.add(ai_transcript)
    
    # Update session stage
    session.current_stage = ai_response["next_stage"]
    
    # Mark as completed if stage is complete
    if ai_response["next_stage"] == "complete":
        session.status = "completed"
        session.completed_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": ai_response["message"],
        "next_stage": ai_response["next_stage"]
    }


@router.post("/submit-code")
def submit_code(
    request: SubmitCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get session
    session = db.query(InterviewSession).filter(
        InterviewSession.id == request.session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found"
        )
    
    # Update session with code
    session.code_solution = request.code
    session.language = request.language
    db.commit()  # Commit the code to database before returning
    
    print(f"Code submitted for session {session.id}, language: {session.language}, code length: {len(request.code)}")
    
    return {"message": "Code submitted successfully"}


@router.post("/execute-code")
def execute_code(
    request: ExecuteCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get session
    session = db.query(InterviewSession).filter(
        InterviewSession.id == request.session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found"
        )
    
    # Get question with test cases
    question = db.query(Question).filter(Question.id == session.question_id).first()
    
    # Execute code with test cases
    execution_result = judge0_service.execute_test_cases(
        source_code=request.code,
        language=request.language,
        test_cases=question.test_cases or []
    )
    
    # Store test results in session
    session.test_results = {
        "passed": execution_result.get("passed_tests", 0),
        "failed": execution_result.get("total_tests", 0) - execution_result.get("passed_tests", 0),
        "total": execution_result.get("total_tests", 0)
    }
    db.commit()
    
    return execution_result


@router.post("/save-statistics")
def save_statistics(
    request: SaveStatisticsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save interview statistics (time spent in each stage)"""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == request.session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found"
        )
    
    # Merge with existing statistics if any (in case of multiple saves)
    existing_stats = session.stage_statistics or {}
    merged_stats = {}
    
    # Merge stage times - add new times to existing ones
    for stage, time in request.stage_times.items():
        merged_stats[stage] = existing_stats.get(stage, 0) + time
    
    # Keep any existing stages not in the new request
    for stage, time in existing_stats.items():
        if stage not in merged_stats:
            merged_stats[stage] = time
    
    print(f"Saving statistics for session {session.id}: {merged_stats}")
    
    # Update stage statistics
    session.stage_statistics = merged_stats
    db.commit()
    
    return {"message": "Statistics saved successfully", "stage_statistics": merged_stats}




@router.get("/sessions")
def get_user_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all interview sessions for the current user"""
    sessions = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id
    ).order_by(InterviewSession.started_at.desc()).all()
    
    result = []
    for session in sessions:
        question = db.query(Question).filter(Question.id == session.question_id).first()
        
        # Calculate total time from stage statistics
        total_time = 0
        if session.stage_statistics:
            total_time = sum(session.stage_statistics.values())
        elif session.completed_at and session.started_at:
            # Fallback: calculate from start to completion time
            time_diff = session.completed_at - session.started_at
            total_time = int(time_diff.total_seconds())
        
        result.append({
            "id": session.id,
            "question_title": question.title if question else "Unknown Question",
            "difficulty": question.difficulty if question else "Unknown",
            "status": session.status,
            "current_stage": session.current_stage,
            "started_at": session.started_at.isoformat() if session.started_at else None,
            "completed_at": session.completed_at.isoformat() if session.completed_at else None,
            "total_time_seconds": total_time,
            "stage_statistics": session.stage_statistics or {},
            "language": session.language,
            "feedback": session.feedback,  # Include feedback if available
            "test_results": session.test_results or {},  # Include test results
        })
    
    return {"sessions": result}


@router.get("/session/{session_id}")
def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found"
        )
    
    question = db.query(Question).filter(Question.id == session.question_id).first()
    transcripts = db.query(InterviewTranscript).filter(
        InterviewTranscript.session_id == session.id
    ).order_by(InterviewTranscript.timestamp).all()
    
    # Calculate total time
    total_time = 0
    if session.stage_statistics:
        total_time = sum(session.stage_statistics.values())
    elif session.completed_at and session.started_at:
        time_diff = session.completed_at - session.started_at
        total_time = int(time_diff.total_seconds())
    
    return {
        "session": {
            "id": session.id,
            "status": session.status,
            "current_stage": session.current_stage,
            "started_at": session.started_at,
            "completed_at": session.completed_at,
            "code_solution": session.code_solution,
            "language": session.language,
            "stage_statistics": session.stage_statistics,
            "total_time_seconds": total_time,
            "feedback": session.feedback,  # Include feedback if available
            "test_results": session.test_results or {},  # Include test results
        },
        "question": {
            "id": question.id,
            "title": question.title,
            "description": question.description,
            "difficulty": question.difficulty,
            "examples": question.examples,
            "constraints": question.constraints
        },
        "transcripts": [
            {
                "speaker": t.speaker,
                "message": t.message,
                "timestamp": t.timestamp
            }
            for t in transcripts
        ]
    }


@router.get("/session/{session_id}/feedback")
def get_interview_feedback(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate comprehensive interview feedback based on all statistics"""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found"
        )
    
    question = db.query(Question).filter(Question.id == session.question_id).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    transcripts = db.query(InterviewTranscript).filter(
        InterviewTranscript.session_id == session.id
    ).order_by(InterviewTranscript.timestamp).all()
    
    # Calculate total time
    total_time = 0
    if session.stage_statistics:
        total_time = sum(session.stage_statistics.values())
    elif session.completed_at and session.started_at:
        time_diff = session.completed_at - session.started_at
        total_time = int(time_diff.total_seconds())
    
    # Prepare data for feedback generation
    conversation_history = [
        {"speaker": t.speaker, "message": t.message}
        for t in transcripts
    ]
    
    # Check if feedback already exists
    if session.feedback:
        return {
            "feedback": session.feedback,
            "session_id": session_id,
            "cached": True
        }
    
    # Generate feedback
    feedback = gemini_interviewer.generate_interview_feedback(
        question_title=question.title,
        question_description=question.description,
        difficulty=question.difficulty,
        stage_statistics=session.stage_statistics or {},
        transcripts=conversation_history,
        code_solution=session.code_solution,
        language=session.language,
        total_time_seconds=total_time
    )
    
    # Save feedback to database
    session.feedback = feedback
    db.commit()
    
    return {
        "feedback": feedback,
        "session_id": session_id,
        "cached": False
    }

