import google.generativeai as genai
from app.core.config import settings
from typing import List, Dict
from google.generativeai.types import GenerationConfig
genai.configure(api_key=settings.GEMINI_API_KEY)


class GeminiInterviewer:
    def __init__(self):
        # Try different Gemini models in order of preference
        models_to_try = [
            'gemini-2.5-flash',
            'gemini-2.0-flash-exp',
            'gemini-2.0-flash',
            'gemini-pro-latest'
        ]
        
        self.model = None
        for model_name in models_to_try:
            try:
                self.model = genai.GenerativeModel(model_name)
                print(f"Using Gemini model: {model_name}")
                break
            except Exception as e:
                print(f"Failed to load {model_name}: {e}")
                continue
        
        if self.model is None:
            raise Exception("Could not initialize any Gemini model")
        self.system_prompt = """You are a professional mock interviewer for Software Development Engineer (SDE1) positions at top tech companies like Google, Amazon, Microsoft, Meta. 
Your role is to conduct technical interviews focusing on Data Structures and Algorithms (DSA) problems.

INTERVIEW STAGES - YOUR ROLE IN EACH:

1. EXPLANATION STAGE:
   - YOUR TASK: Guide the candidate to explain their approach to solve the problem
   - ASK FOR: High-level approach, data structures they plan to use, algorithm strategy
   - VERIFY: They understand the problem, have a clear plan, considered edge cases
   - MOVE TO CODING WHEN: You understand their approach and it's sound (even if not optimal)
   - EXAMPLE QUESTIONS: "What's your approach?", "Which data structure would you use?", "Have you considered edge cases?"

2. CODING STAGE:
   - YOUR TASK: Let the candidate write code. The code editor is now enabled for them. DO NOT ask questions during this stage.
   - BEHAVIOR: The candidate is actively coding. Stay silent and wait for them to complete. They will click "Complete Coding" when done.
   - MOVE TO FOLLOWUP WHEN: They indicate they've completed coding (they'll click "Complete Coding")
   - CRITICAL: DO NOT send any messages during the coding stage. The candidate needs uninterrupted time to code.

    3. FOLLOWUP STAGE:
       - YOUR TASK: IMMEDIATELY ask a specific question about their code implementation. DO NOT just announce the stage.
       - CRITICAL: You MUST ask an actual question in your first response. Never say "Let's proceed to follow-up questions" or similar - ASK THE QUESTION DIRECTLY.
       - ASK FOR: Explanation of code choices, handling of edge cases, why they chose certain approaches, walkthrough of specific code sections
       - VERIFY: They understand their own code, can explain design decisions
       - MOVE TO COMPLEXITY WHEN: After asking 2 follow-up questions and getting answers, explicitly mention moving to complexity analysis
       - WHEN DONE WITH FOLLOWUP: Say something like "Great! Now let's analyze the time and space complexity of your solution. Can you explain both?"
       - EXAMPLE QUESTIONS: "Why did you use this data structure?", "How does your code handle edge case X?", "Can you walk through this part of your code?", "What would happen if the input was empty?", "Why did you choose this algorithm over alternative approaches?"

4. COMPLEXITY STAGE:
   - YOUR TASK: IMMEDIATELY ask the candidate to explain the time and space complexity of their solution. DO NOT just announce the stage.
   - CRITICAL: You MUST ask an actual question in your first response. Never say "Let's proceed to complexity analysis" or similar - ASK THE QUESTION DIRECTLY.
   - ASK FOR: Time complexity (Big O notation), Space complexity (Big O notation), detailed justification for their analysis
   - VERIFY: Their complexity analysis is correct or guide them if wrong
   - MOVE TO OPTIMIZATION WHEN: They've explained both time and space complexity (or directly to COMPLETE if no optimization needed)
   - EXAMPLE QUESTIONS: "Can you explain the time complexity of your solution?", "What about the space complexity?", "Walk me through why the time complexity is O(n)?" or "Why is the space complexity O(1)?"

5. OPTIMIZATION STAGE:
   - YOUR TASK: Guide them to think about optimizations if a better solution exists
   - ASK FOR: Can they optimize? What would be better? Trade-offs?
   - VERIFY: They understand optimization opportunities (if any)
   - MOVE TO COMPLETE: After discussing optimization (or skip if solution is already optimal)
   - EXAMPLE QUESTIONS: "Can you optimize this?", "Is there a better approach?", "What are the trade-offs?"

6. COMPLETE:
   - Interview is finished. Thank the candidate.

CRITICAL RESPONSE GUIDELINES:
- NEVER repeat or paraphrase what the user just said
- Keep responses SHORT (1-2 sentences maximum)
- Ask ONE focused question at a time
- Clearly state what you need from them in the current stage
- Be direct and action-oriented
- Do not summarize their words back to them

STAGE-SPECIFIC BEHAVIOR:
- In EXPLANATION: Ask for approach, verify understanding, then approve coding
- In CODING: Acknowledge they can code, wait for them to complete
- In FOLLOWUP: IMMEDIATELY ask a specific code-related question. Never announce the stage - just ask the question directly.
- In COMPLEXITY: Ask for complexity analysis
- In OPTIMIZATION: Guide optimization discussion (if applicable)

Current Question: {question_title}
Difficulty: {difficulty}
Current Stage: {current_stage}

Previous conversation:
{conversation_history}
"""

    def get_interviewer_response(
        self,
        user_message: str,
        question_title: str,
        question_description: str,
        difficulty: str,
        current_stage: str,
        conversation_history: List[Dict[str, str]],
        code_solution: str = None
    ) -> Dict[str, str]:
        """Get AI interviewer response based on current context"""
        
        # Build conversation history string
        history_text = "\n".join([
            f"{msg['speaker']}: {msg['message']}" 
            for msg in conversation_history[-10:]  # Last 10 messages for context
        ])
        
        # Build prompt
        prompt = self.system_prompt.format(
            question_title=question_title,
            difficulty=difficulty,
            current_stage=current_stage,
            conversation_history=history_text
        )
        
        # Add current user message
        full_prompt = f"{prompt}\n\nUser: {user_message}\n\nInterviewer:"
        
        # Add code context if available
        if code_solution:
            full_prompt += f"\n\nUser's code solution:\n{code_solution}\n"
            # If we're in followup stage and have code, emphasize asking about the code
            if current_stage == "followup":
                full_prompt += "\n\nCRITICAL: You are in FOLLOWUP stage. You MUST ask a specific question about the code above. Do NOT say 'Let's proceed to follow-up questions' or 'Let's move to follow-up questions' or 'Good work. Let's continue with follow-up questions' - ASK THE QUESTION NOW. Reference specific parts of the code in your question. Example: 'Why did you choose to use a HashMap here?' or 'How does your code handle the edge case of an empty array?' or 'Can you walk me through what happens in this loop?'"
            # If we're in complexity stage and have code, emphasize asking about complexity
            elif current_stage == "complexity":
                full_prompt += "\n\nCRITICAL: You are in COMPLEXITY STAGE. You MUST ask the candidate to explain the time and space complexity of their solution. Do NOT say 'Let's proceed to complexity analysis' or 'Let's analyze the complexity' - ASK THE QUESTION DIRECTLY. Example: 'Can you explain the time and space complexity of your solution?'"
        
        # Add explicit instruction to keep response short and not repeat user
        full_prompt += "\n\nIMPORTANT: Respond in 2-3 sentences maximum. Do NOT repeat what the user said. Ask a focused question or give brief feedback only."
        
        # Special handling for coding stage - no questions should be asked
        if current_stage == "coding":
            full_prompt += "\n\nCODING STAGE - CRITICAL: The candidate is currently coding. DO NOT ask any questions. If they're asking for help or clarification, provide brief guidance only. Otherwise, acknowledge briefly and let them continue coding. Do NOT interrupt their coding process with questions."
        
        # Additional stage-specific instructions (apply even if no code solution yet)
        if current_stage == "followup":
            # Count interviewer messages in followup to track progress
            followup_interviewer_count = 0
            if conversation_history:
                in_followup = False
                for msg in conversation_history:
                    # Detect when coding ended (user said they're done or submitted code)
                    if msg.get('speaker') == 'user' and any(phrase in msg.get('message', '').lower() for phrase in ['complete coding', 'completed', 'done', 'finished coding']):
                        in_followup = True
                    if in_followup and msg.get('speaker') == 'interviewer':
                        followup_interviewer_count += 1
            
            if followup_interviewer_count >= 2:
                # After 2 questions, explicitly transition to complexity
                full_prompt += "\n\nFOLLOWUP STAGE - TRANSITION: You've asked 2 follow-up questions. Now explicitly transition to complexity analysis. Say something like: 'Great! Now let's analyze the complexity. Can you explain the time and space complexity of your solution?' This will move the interview to the COMPLEXITY stage."
            elif followup_interviewer_count == 0:
                # First follow-up question - be very explicit
                full_prompt += "\n\nFOLLOWUP STAGE - FIRST QUESTION: This is your FIRST response in the follow-up stage. You MUST ask a specific question about their code implementation. Do NOT say 'Let's continue with follow-up questions' or 'Good work. Let's continue' - IMMEDIATELY ask a specific question. Examples: 'Why did you choose to use a HashMap in your solution?', 'How does your code handle the case when the input array is empty?', 'Can you explain the logic in this nested loop?'"
            else:
                full_prompt += "\n\nFOLLOWUP STAGE REMINDER: Ask a specific question about the code. Examples: 'Why did you use X?', 'How does your code handle Y?', 'Can you explain this part?' Do NOT announce the stage - just ask the question. NEVER say 'I understand. Let's continue' without asking an actual question."
        elif current_stage == "complexity":
            # Add complexity instructions even if code_solution is not provided yet
            if not code_solution:
                full_prompt += "\n\nCRITICAL: You are in COMPLEXITY STAGE. You MUST ask the candidate to explain the time and space complexity of their solution. Do NOT say 'Let's proceed to complexity analysis' or 'Let's analyze the complexity' - ASK THE QUESTION DIRECTLY. Example: 'Can you explain the time and space complexity of your solution?'"
            full_prompt += "\n\nCOMPLEXITY STAGE REMINDER: Ask the candidate to explain the time and space complexity. Examples: 'Can you explain the time complexity?', 'What about the space complexity?', 'Walk me through why it's O(n)?' Do NOT announce the stage - just ask the question."
        
        try:
            # Try with generation config first (if supported)
            try:
                from google.generativeai.types import GenerationConfig
                generation_config = GenerationConfig(
                    temperature=0.7,
                    top_p=0.8,
                    top_k=40,
                    max_output_tokens=300,  # Increased from 150 to allow full questions
                )
                response = self.model.generate_content(
                    full_prompt,
                    generation_config=generation_config
                )
            except (ImportError, AttributeError, TypeError, ValueError) as config_error:
                # If generation_config doesn't work, try without it
                print(f"Note: GenerationConfig not available, using default settings: {config_error}")
                response = self.model.generate_content(full_prompt)
            
            # Check if response was blocked or has issues
            if not response.candidates or len(response.candidates) == 0:
                raise ValueError("No candidates returned in response")
            
            candidate = response.candidates[0]
            
            # Check finish_reason: 
            # finish_reason can be an integer or enum:
            # 0 or "STOP" = normal completion
            # 1 or "MAX_TOKENS" = hit token limit  
            # 2 or "SAFETY" = blocked by safety filters (this is the error we're seeing)
            # 3 or "RECITATION" = blocked by recitation filter
            # 4 or "OTHER" = other reason
            
            finish_reason = getattr(candidate, 'finish_reason', None)
            finish_reason_value = None
            
            # Handle both enum and integer values
            if finish_reason is not None:
                if hasattr(finish_reason, 'name'):
                    finish_reason_value = finish_reason.name
                elif hasattr(finish_reason, 'value'):
                    finish_reason_value = finish_reason.value
                else:
                    finish_reason_value = finish_reason
            
            print(f"DEBUG: finish_reason = {finish_reason}, finish_reason_value = {finish_reason_value}")
            
            # Check if response was blocked (finish_reason 2 = SAFETY)
            if finish_reason_value == 2 or (isinstance(finish_reason_value, str) and "SAFETY" in str(finish_reason_value).upper()):
                print(f"WARNING: Response blocked by safety filters (finish_reason: {finish_reason_value})")
                # Provide a generic but helpful response to continue the interview
                if current_stage == "explanation":
                    return {
                        "message": "I understand your approach. Please proceed to coding the solution.",
                        "next_stage": "coding"
                    }
                elif current_stage == "coding":
                    # If user just completed coding, ask first follow-up question
                    if code_solution:
                        return {
                            "message": "Good work on the implementation. Looking at your code, why did you choose this particular approach?",
                            "next_stage": "followup"
                        }
                    else:
                        return {
                            "message": "Good work on the code. Let's move to follow-up questions.",
                            "next_stage": "followup"
                        }
                elif current_stage == "followup":
                    # In followup stage, ask a specific question
                    if code_solution:
                        return {
                            "message": "How does your code handle edge cases, such as an empty input?",
                            "next_stage": "followup"
                        }
                    else:
                        return {
                            "message": "Can you walk me through your code's logic?",
                            "next_stage": "followup"
                        }
                else:
                    return {
                        "message": "I understand. Let's continue with the next step.",
                        "next_stage": current_stage
                    }
            
            # Try to extract the message text
            try:
                ai_message = response.text.strip()
            except (ValueError, AttributeError) as text_error:
                # If response.text fails (e.g., finish_reason 2), try accessing parts directly
                print(f"Warning: response.text failed ({text_error}), trying alternative access")
                try:
                    if hasattr(candidate, 'content') and candidate.content:
                        if hasattr(candidate.content, 'parts') and candidate.content.parts and len(candidate.content.parts) > 0:
                            ai_message = candidate.content.parts[0].text.strip()
                        else:
                            # No parts available - likely blocked
                            raise ValueError("No parts in candidate content - likely blocked by safety filters")
                    else:
                        raise ValueError("No content in candidate")
                except Exception as e2:
                    print(f"Error accessing response content: {e2}")
                    # Provide a fallback message based on stage
                    if current_stage == "explanation":
                        ai_message = "I understand your approach. Please proceed to coding."
                    elif current_stage == "coding":
                        if code_solution:
                            ai_message = "Good work. Looking at your code, why did you choose this particular data structure?"
                        else:
                            ai_message = "Good work. Let's continue with follow-up questions."
                    elif current_stage == "followup":
                        if code_solution:
                            ai_message = "How does your code handle edge cases?"
                        else:
                            ai_message = "Can you explain your implementation approach?"
                    else:
                        ai_message = "I understand. Let's continue."
            
            # Determine next stage based on response and current stage
            try:
                next_stage = self._determine_next_stage(current_stage, ai_message, conversation_history)
            except TypeError as te:
                # Catch argument mismatch errors and provide fallback
                print(f"ERROR: _determine_next_stage argument mismatch: {te}")
                print(f"  Called with: current_stage={current_stage}, ai_message length={len(ai_message)}")
                # Fallback: determine stage based on current stage progression
                next_stage = self._get_fallback_stage(current_stage)
            except Exception as stage_error:
                # Catch any other errors in stage determination
                print(f"ERROR: Failed to determine next stage: {stage_error}")
                next_stage = self._get_fallback_stage(current_stage)
            
            return {
                "message": ai_message,
                "next_stage": next_stage
            }
        except Exception as e:
            # Log the error for debugging
            error_type = type(e).__name__
            error_msg = str(e)
            print(f"=" * 80)
            print(f"ERROR in Gemini API call:")
            print(f"  Error Type: {error_type}")
            print(f"  Error Message: {error_msg}")
            print(f"  Prompt length: {len(full_prompt)} characters")
            print(f"  User message preview: {user_message[:200] if user_message else 'None'}")
            print(f"  Current stage: {current_stage}")
            print(f"  Question: {question_title}")
            print(f"=" * 80)
            
            # Check for specific error types and provide helpful messages
            if "API key" in error_msg or "authentication" in error_msg.lower() or "401" in error_msg:
                return {
                    "message": "API authentication error. Please check your Gemini API key configuration.",
                    "next_stage": current_stage
                }
            elif "quota" in error_msg.lower() or "rate limit" in error_msg.lower() or "429" in error_msg:
                return {
                    "message": "API quota exceeded. Please try again in a moment.",
                    "next_stage": current_stage
                }
            elif "safety" in error_msg.lower() or "blocked" in error_msg.lower() or "SAFETY" in error_msg:
                return {
                    "message": "Your message was filtered by safety settings. Could you rephrase it?",
                    "next_stage": current_stage
                }
            elif "timeout" in error_msg.lower():
                return {
                    "message": "Request timed out. Please try again.",
                    "next_stage": current_stage
                }
            else:
                # Generic error - try to provide helpful feedback
                return {
                    "message": "I encountered an issue processing that. Could you please rephrase or try again?",
                    "next_stage": current_stage
                }
    
        def _determine_next_stage(self, current_stage: str, ai_response: str, conversation_history: List[Dict[str, str]] = None) -> str:
            """Determine next interview stage based on AI response"""
            response_lower = ai_response.lower()
            
            if current_stage == "explanation":
                # Check if AI approves moving to coding
                if any(word in response_lower for word in ["good", "sounds good", "proceed", "code", "implement", "write"]):
                    return "coding"
                return "explanation"
            
            elif current_stage == "coding":
                # After coding, move to followup
                # Check if user is saying they completed coding
                if any(phrase in response_lower for phrase in ["completed", "complete coding", "done", "finished"]):
                    return "followup"
                return "coding"
            
            elif current_stage == "followup":
                # Count how many followup exchanges have occurred
                followup_count = 0
                if conversation_history:
                    # Count messages after coding stage started
                    in_followup = False
                    for msg in conversation_history:
                        if msg.get('message', '').lower() in ['complete coding', 'completed coding', 'done coding']:
                            in_followup = True
                        if in_followup and msg.get('speaker') == 'interviewer':
                            followup_count += 1
                
                # After 2-3 follow-up questions from interviewer, move to complexity
                if followup_count >= 2:
                    # Check if AI is trying to continue or if it's asking about complexity
                    if any(phrase in response_lower for phrase in ["let's continue", "let's move", "let's proceed", "next", "complexity"]):
                        return "complexity"
                
                # Check if AI is now asking about complexity (explicit transition)
                if ("complexity" in response_lower or "analyze" in response_lower) and \
                   ("time" in response_lower or "space" in response_lower or "big o" in response_lower):
                    return "complexity"
                
                # Stay in followup
                return "followup"
            
            elif current_stage == "complexity":
                # Stay in complexity until AI has asked about both time and space complexity
                # Only move to optimization if AI explicitly mentions it
                if any(word in response_lower for word in ["optimization", "optimize", "better approach", "can you improve"]):
                    return "optimization"
                # Check if complexity discussion is done (AI confirms understanding)
                if any(phrase in response_lower for phrase in ["great", "excellent", "correct", "that's right", "perfect"]) and \
                   ("complexity" in response_lower or "analysis" in response_lower):
                    return "complete"
                return "complexity"
            
            elif current_stage == "optimization":
                return "complete"
            
            return current_stage
    
    def _get_fallback_stage(self, current_stage: str) -> str:
        """Fallback method to determine next stage if _determine_next_stage fails"""
        stage_progression = {
            "explanation": "coding",
            "coding": "followup",
            "followup": "complexity",
            "complexity": "optimization",
            "optimization": "complete",
            "complete": "complete"
        }
        return stage_progression.get(current_stage, current_stage)
    
    def generate_interview_feedback(
        self,
        question_title: str,
        question_description: str,
        difficulty: str,
        stage_statistics: Dict[str, int],
        transcripts: List[Dict[str, str]],
        code_solution: str = None,
        language: str = None,
        total_time_seconds: int = 0
    ) -> str:
        """Generate comprehensive interview feedback based on all statistics and performance"""
        
        # Calculate time metrics
        explanation_time = stage_statistics.get("explanation", 0)
        coding_time = stage_statistics.get("coding", 0)
        followup_time = stage_statistics.get("followup", 0)
        complexity_time = stage_statistics.get("complexity", 0)
        optimization_time = stage_statistics.get("optimization", 0)
        
        # Build conversation summary
        conversation_summary = "\n".join([
            f"{msg['speaker'].upper()}: {msg['message']}"
            for msg in transcripts[-20:]  # Last 20 messages for context
        ])
        
        # Build feedback prompt
        feedback_prompt = f"""You are a senior software engineer providing concise, actionable interview feedback for a DSA interview at a top tech company.

INTERVIEW SUMMARY:
Question: {question_title} ({difficulty})
Language: {language or "Not specified"}
Total Time: {total_time_seconds // 60}m {total_time_seconds % 60}s

TIME PER STAGE:
- Explanation: {explanation_time // 60}m {explanation_time % 60}s
- Coding: {coding_time // 60}m {coding_time % 60}s
- Follow-up: {followup_time // 60}m {followup_time % 60}s
- Complexity: {complexity_time // 60}m {complexity_time % 60}s
- Optimization: {optimization_time // 60}m {optimization_time % 60}s

CONVERSATION:
{conversation_summary}

{"CODE:" if code_solution else "CODE: Not provided"}
{code_solution if code_solution else ""}

Provide ultra-concise, keyword-packed feedback in this exact format (keep total under 200 words):

## Overall Rating
[One phrase: Strong/Good/Needs Improvement]

## ✅ Strengths
- [Keyword/phrase 1]
- [Keyword/phrase 2]
- [Keyword/phrase 3 if applicable]

## ⚠️ Improvements
- [Keyword/phrase 1]
- [Keyword/phrase 2]
- [Keyword/phrase 3 if applicable]

## 📊 Assessment
**Problem-Solving:** [One phrase: e.g., "Clear approach, missed edge cases"]
**Code:** [One phrase: e.g., "Correct but verbose" or "Incomplete"]
**Complexity:** [One phrase: e.g., "Accurate O(n) analysis" or "Incorrect space complexity"]
**Communication:** [One phrase: e.g., "Clear explanations" or "Needs clarity"]
**Time:** [One phrase: e.g., "Efficient" or "Too slow"]

## 💡 Verdict
[Strong Hire/Hire/Weak Hire/No Hire] - [One phrase justification]

Rules:
- Maximum 200 words total
- Use keywords/phrases, not full sentences
- Be specific but brief
- Reference actual examples
- FAANG standards"""

        try:
            # Generate feedback using Gemini
            try:
                generation_config = GenerationConfig(
                    temperature=0.7,
                    top_p=0.9,
                    top_k=40,
                    max_output_tokens=2000,  # Longer response for detailed feedback
                )
                response = self.model.generate_content(
                    feedback_prompt,
                    generation_config=generation_config
                )
            except (ImportError, AttributeError, TypeError, ValueError) as config_error:
                print(f"Note: GenerationConfig not available for feedback, using default: {config_error}")
                response = self.model.generate_content(feedback_prompt)
            
            # Extract feedback text
            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                try:
                    feedback = response.text.strip()
                except (ValueError, AttributeError):
                    if hasattr(candidate, 'content') and candidate.content:
                        if hasattr(candidate.content, 'parts') and len(candidate.content.parts) > 0:
                            feedback = candidate.content.parts[0].text.strip()
                        else:
                            feedback = "Unable to generate feedback at this time."
                    else:
                        feedback = "Unable to generate feedback at this time."
                
                return feedback
            else:
                return "Unable to generate feedback. No response from AI model."
                
        except Exception as e:
            print(f"Error generating interview feedback: {e}")
            return f"Error generating feedback: {str(e)}"

