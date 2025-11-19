import requests
import json
import logging
import re
from typing import List, Dict, Optional
from app.core.config import settings

# Set up logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def normalize_output(output: str) -> str:
    """Normalize output string to handle various formatting differences"""
    if not output:
        return ""
    
    # Strip whitespace
    output = output.strip()
    
    # Handle multiple lines - take the last non-empty line (the actual result)
    lines = [line.strip() for line in output.split('\n') if line.strip()]
    if lines:
        output = lines[-1]  # Take the last line as the result
    
    # Try to parse as JSON first (handles arrays, objects, booleans, numbers, strings)
    try:
        parsed = json.loads(output)
        # Re-serialize with consistent formatting (no spaces after commas/colons)
        # This converts Python True/False to JSON true/false
        return json.dumps(parsed, separators=(',', ':'))
    except (json.JSONDecodeError, ValueError):
        # If not valid JSON, try to handle common cases
        
        # Handle Python boolean literals (True/False -> true/false)
        if output == "True":
            return "true"
        elif output == "False":
            return "false"
        elif output == "None" or output == "null":
            return "null"
        
        # Try to parse as Python literal and convert to JSON
        try:
            # Use eval to parse Python literals (safe for simple types)
            parsed = eval(output)
            # Convert to JSON string
            return json.dumps(parsed, separators=(',', ':'))
        except (SyntaxError, NameError, ValueError):
            # If eval fails, try to normalize array-like strings
            # Remove all spaces after commas and colons
            normalized = re.sub(r',\s+', ',', output)
            normalized = re.sub(r':\s+', ':', normalized)
            # Also handle boolean-like strings
            normalized = re.sub(r'\bTrue\b', 'true', normalized, flags=re.IGNORECASE)
            normalized = re.sub(r'\bFalse\b', 'false', normalized, flags=re.IGNORECASE)
            return normalized.strip()


class Judge0Service:
    def __init__(self):
        self.base_url = settings.JUDGE0_API_URL
        self.headers = {
            "Content-Type": "application/json",
        }
        if settings.JUDGE0_API_KEY:
            self.headers["x-rapidapi-key"] = settings.JUDGE0_API_KEY
            self.headers["x-rapidapi-host"] = "judge0-ce.p.rapidapi.com"
    
    def get_language_id(self, language: str) -> int:
        """Map language name to Judge0 language ID"""
        language_map = {
            "python": 92,
            "java": 91,
            "javascript": 93,
            "cpp": 54,
            "c": 50,
        }
        return language_map.get(language.lower(), 92)  # Default to Python
    
    def submit_code(
        self,
        source_code: str,
        language: str,
        test_cases: List[Dict[str, str]]
    ) -> Dict:
        """Submit code for execution"""
        logger.info("=" * 80)
        logger.info("JUDGE0 API - SUBMITTING CODE")
        logger.info("=" * 80)
        logger.info(f"Language: {language}")
        logger.info(f"Number of test cases: {len(test_cases)}")
        logger.info(f"Source code length: {len(source_code)} characters")
        logger.info(f"Source code preview (first 200 chars): {source_code[:200]}")
        
        language_id = self.get_language_id(language)
        logger.info(f"Language ID: {language_id}")
        
        # Prepare test cases
        stdin = "\n".join([tc.get("input", "") for tc in test_cases])
        expected_output = "\n".join([tc.get("output", "").strip() for tc in test_cases])
        
        logger.info(f"STDIN input: {stdin[:200] if len(stdin) > 200 else stdin}")
        logger.info(f"Expected output: {expected_output[:200] if len(expected_output) > 200 else expected_output}")
        
        payload = {
            "source_code": source_code,
            "language_id": language_id,
            "stdin": stdin,
            "expected_output": expected_output,
        }
        
        logger.info(f"Request URL: {self.base_url}/submissions")
        logger.info(f"Request headers: {json.dumps({k: v for k, v in self.headers.items() if k != 'x-rapidapi-key'}, indent=2)}")
        logger.info(f"Request payload keys: {list(payload.keys())}")
        logger.info(f"Request params: base64_encoded=false, wait=true")
        
        try:
            logger.info("Sending POST request to Judge0 API...")
            response = requests.post(
                f"{self.base_url}/submissions",
                json=payload,
                headers=self.headers,
                params={"base64_encoded": "false", "wait": "true"},
                timeout=30
            )
            
            logger.info(f"Response status code: {response.status_code}")
            logger.info(f"Response headers: {dict(response.headers)}")
            
            response.raise_for_status()
            response_data = response.json()
            
            logger.info("=" * 80)
            logger.info("JUDGE0 API - RESPONSE RECEIVED")
            logger.info("=" * 80)
            logger.info(f"Full response: {json.dumps(response_data, indent=2)}")
            
            if "token" in response_data:
                logger.info(f"Submission token: {response_data['token']}")
            if "status" in response_data:
                logger.info(f"Status: {response_data['status']}")
            if "stdout" in response_data:
                logger.info(f"STDOUT: {response_data['stdout']}")
            if "stderr" in response_data:
                logger.info(f"STDERR: {response_data['stderr']}")
            if "compile_output" in response_data:
                logger.info(f"Compile output: {response_data['compile_output']}")
            if "message" in response_data:
                logger.info(f"Message: {response_data['message']}")
            
            return response_data
        except requests.exceptions.RequestException as e:
            logger.error("=" * 80)
            logger.error("JUDGE0 API - REQUEST ERROR")
            logger.error("=" * 80)
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error message: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response status: {e.response.status_code}")
                logger.error(f"Response text: {e.response.text}")
            return {"error": str(e)}
        except Exception as e:
            logger.error("=" * 80)
            logger.error("JUDGE0 API - UNEXPECTED ERROR")
            logger.error("=" * 80)
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error message: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {"error": str(e)}
    
    def get_submission(self, token: str) -> Dict:
        """Get submission result by token"""
        try:
            response = requests.get(
                f"{self.base_url}/submissions/{token}",
                headers=self.headers,
                params={"base64_encoded": "false"}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": str(e)}
    
    def _wrap_python_code(self, source_code: str, test_input: str) -> str:
        """Wrap Python code to execute function and print result"""
        # Try to detect if code has a main function or needs wrapping
        code_lines = source_code.strip().split('\n')
        
        # Check if code already has execution logic (import sys, input(), print outside function)
        has_execution = any('import sys' in line or 'input()' in line or 
                           (line.strip().startswith('print') and not line.strip().startswith('def')) 
                           for line in code_lines)
        
        if has_execution:
            return source_code
        
        # Try to find function name and count parameters
        function_name = None
        function_params = []
        for line in code_lines:
            if line.strip().startswith('def '):
                # Extract function definition: def function_name(param1, param2, ...):
                func_def = line.strip()
                if '(' in func_def and ')' in func_def:
                    func_match = func_def.split('def ')[1].split('(')[0].strip()
                    if func_match:
                        function_name = func_match
                        # Extract parameters
                        params_str = func_def.split('(')[1].split(')')[0].strip()
                        if params_str:
                            # Split by comma and clean up
                            function_params = [p.strip().split('=')[0].strip() for p in params_str.split(',') if p.strip()]
                        break
        
        if not function_name:
            return source_code
        
        # Count number of parameters
        num_params = len(function_params)
        
        # Parse input - check how many lines we have
        input_lines = test_input.strip().split('\n') if test_input else []
        num_input_lines = len([line for line in input_lines if line.strip()])
        
        # Build wrapper based on number of parameters and input lines
        if num_params == 1:
            # Single parameter function (e.g., merge(intervals))
            wrapper = f"""{source_code}

import sys
import json

# Read input from stdin
input_data = sys.stdin.read().strip()
if not input_data:
    input_data = {repr(test_input.strip()) if test_input else '""'}

# Parse single parameter input
try:
    # Try JSON first
    param1 = json.loads(input_data)
    result = {function_name}(param1)
    print(json.dumps(result))
except json.JSONDecodeError:
    # Fallback to eval for Python literals
    try:
        param1 = eval(input_data)
        result = {function_name}(param1)
        print(json.dumps(result))
    except Exception as e:
        print(f"Error: {{e}}", file=sys.stderr)
"""
        elif num_params == 2:
            # Two parameter function (e.g., twoSum(nums, target))
            wrapper = f"""{source_code}

import sys
import json

# Read input from stdin
input_data = sys.stdin.read().strip()
if not input_data:
    input_data = {repr(test_input.strip()) if test_input else '""'}

lines = [line.strip() for line in input_data.split('\\n') if line.strip()]

# Parse two parameters
if len(lines) >= 2:
    try:
        # Try JSON parsing
        param1 = json.loads(lines[0])
        param2 = json.loads(lines[1]) if lines[1].strip().startswith('[') or lines[1].strip().startswith('{{') else int(lines[1])
        result = {function_name}(param1, param2)
        print(json.dumps(result))
    except (json.JSONDecodeError, ValueError):
        # Fallback to eval
        try:
            param1 = eval(lines[0])
            param2 = int(lines[1]) if lines[1].strip().isdigit() or (lines[1].strip().startswith('-') and lines[1].strip()[1:].isdigit()) else eval(lines[1])
            result = {function_name}(param1, param2)
            print(json.dumps(result))
        except Exception as e:
            print(f"Error: {{e}}", file=sys.stderr)
else:
    # Single line - try to split or use as single param
    try:
        param1 = json.loads(lines[0])
        result = {function_name}(param1)
        print(json.dumps(result))
    except:
        try:
            param1 = eval(lines[0])
            result = {function_name}(param1)
            print(json.dumps(result))
        except Exception as e:
            print(f"Error: {{e}}", file=sys.stderr)
"""
        else:
            # More than 2 parameters or unknown - try to parse intelligently
            wrapper = f"""{source_code}

import sys
import json

# Read input from stdin
input_data = sys.stdin.read().strip()
if not input_data:
    input_data = {repr(test_input.strip()) if test_input else '""'}

lines = [line.strip() for line in input_data.split('\\n') if line.strip()]

# Try to parse and call function
try:
    if len(lines) == 1:
        param = json.loads(lines[0])
        result = {function_name}(param)
        print(json.dumps(result))
    else:
        params = [json.loads(line) if line.strip().startswith(('[' , '{{', '"')) else (int(line) if line.strip().isdigit() or (line.strip().startswith('-') and line.strip()[1:].isdigit()) else line) for line in lines]
        result = {function_name}(*params)
        print(json.dumps(result))
except:
    try:
        if len(lines) == 1:
            param = eval(lines[0])
            result = {function_name}(param)
            print(json.dumps(result))
        else:
            params = [eval(line) if line.strip().startswith(('[' , '{{', '"')) else (int(line) if line.strip().isdigit() or (line.strip().startswith('-') and line.strip()[1:].isdigit()) else line) for line in lines]
            result = {function_name}(*params)
            print(json.dumps(result))
    except Exception as e:
        print(f"Error: {{e}}", file=sys.stderr)
"""
        return wrapper
    
    def _wrap_java_code(self, source_code: str) -> str:
        """Wrap Java code with main method if needed"""
        if 'public static void main' in source_code:
            return source_code
        
        # Try to extract class and method
        # This is more complex for Java, return as-is for now
        return source_code
    
    def _wrap_javascript_code(self, source_code: str) -> str:
        """Wrap JavaScript code to execute function"""
        if 'console.log' in source_code and 'function' not in source_code:
            return source_code
        
        # Try to find function name
        function_name = None
        for line in source_code.split('\n'):
            if 'function ' in line or 'const ' in line and '=' in line:
                if 'function ' in line:
                    func_match = line.split('function ')[1].split('(')[0].strip()
                else:
                    func_match = line.split('const ')[1].split('=')[0].strip()
                if func_match:
                    function_name = func_match
                    break
        
        if not function_name:
            return source_code
        
        wrapper = f"""{source_code}

// Read input from stdin
const readline = require('readline');
const rl = readline.createInterface({{
  input: process.stdin,
  output: process.stdout
}});

let inputLines = [];
rl.on('line', (line) => {{
  inputLines.push(line);
}});

rl.on('close', () => {{
  try {{
    const nums = JSON.parse(inputLines[0]);
    const target = parseInt(inputLines[1]);
    const result = {function_name}(nums, target);
    console.log(JSON.stringify(result));
  }} catch (e) {{
    console.error('Error:', e.message);
  }}
}});
"""
        return wrapper

    def execute_test_cases(
        self,
        source_code: str,
        language: str,
        test_cases: List[Dict[str, str]]
    ) -> Dict:
        """Execute code with multiple test cases and return results"""
        logger.info("=" * 80)
        logger.info("JUDGE0 API - EXECUTING TEST CASES")
        logger.info("=" * 80)
        logger.info(f"Language: {language}")
        logger.info(f"Total test cases: {len(test_cases)}")
        logger.info(f"Source code length: {len(source_code)} characters")
        
        results = []
        all_passed = True
        
        for i, test_case in enumerate(test_cases):
            logger.info("-" * 80)
            logger.info(f"Processing Test Case {i + 1}/{len(test_cases)}")
            logger.info("-" * 80)
            logger.info(f"Test input: {test_case.get('input', '')[:200]}")
            logger.info(f"Expected output: {test_case.get('output', '')[:200]}")
            
            # Wrap code based on language
            wrapped_code = source_code
            if language.lower() == 'python':
                wrapped_code = self._wrap_python_code(source_code, test_case.get("input", ""))
                logger.info(f"Wrapped Python code length: {len(wrapped_code)} characters")
                logger.info(f"Wrapped code preview (first 300 chars): {wrapped_code[:300]}")
            elif language.lower() == 'java':
                wrapped_code = self._wrap_java_code(source_code)
                logger.info(f"Wrapped Java code length: {len(wrapped_code)} characters")
            elif language.lower() == 'javascript':
                wrapped_code = self._wrap_javascript_code(source_code)
                logger.info(f"Wrapped JavaScript code length: {len(wrapped_code)} characters")
            
            language_id = self.get_language_id(language)
            payload = {
                "source_code": wrapped_code,
                "language_id": language_id,
                "stdin": test_case.get("input", ""),
                "expected_output": test_case.get("output", "").strip(),
            }
            
            logger.info(f"Request payload - language_id: {language_id}")
            logger.info(f"Request payload - stdin length: {len(payload['stdin'])}")
            logger.info(f"Request payload - expected_output length: {len(payload['expected_output'])}")
            
            try:
                logger.info(f"Sending POST request to {self.base_url}/submissions...")
                response = requests.post(
                    f"{self.base_url}/submissions",
                    json=payload,
                    headers=self.headers,
                    params={"base64_encoded": "false", "wait": "true"},
                    timeout=30
                )
                
                logger.info(f"Response status code: {response.status_code}")
                response.raise_for_status()
                result = response.json()
                
                logger.info(f"Response received: {json.dumps(result, indent=2)}")
                
                # Judge0 status IDs: 1=In Queue, 2=Processing, 3=Accepted, 4=Wrong Answer, etc.
                status_obj = result.get("status", {})
                status_id = status_obj.get("id", 0)
                status_description = status_obj.get("description", "Unknown")
                
                logger.info(f"Status ID: {status_id}, Description: {status_description}")
                
                # Get outputs
                stdout = result.get("stdout", "").strip()
                stderr = result.get("stderr", "")
                compile_output = result.get("compile_output", "")
                message = result.get("message", "")
                expected_output = test_case.get("output", "").strip()
                
                logger.info(f"STDOUT: {stdout[:500] if len(stdout) > 500 else stdout}")
                if stderr:
                    logger.info(f"STDERR: {stderr[:500] if len(stderr) > 500 else stderr}")
                if compile_output:
                    logger.info(f"Compile output: {compile_output[:500] if len(compile_output) > 500 else compile_output}")
                if message:
                    logger.info(f"Message: {message}")
                
                # Normalize outputs for comparison to handle spacing differences, case differences, etc.
                normalized_expected = normalize_output(expected_output)
                normalized_actual = normalize_output(stdout)
                
                logger.info(f"Normalized comparison - Expected: '{normalized_expected}', Actual: '{normalized_actual}'")
                
                # Check if passed: either Judge0 says Accepted OR normalized outputs match
                passed = False
                if status_id == 3:  # Accepted by Judge0
                    passed = True
                    logger.info(f"Test case {i + 1} passed (Judge0 Accepted)")
                elif status_id == 4:  # Wrong Answer - but let's double-check with normalized comparison
                    if normalized_expected.lower() == normalized_actual.lower():
                        # Case-insensitive comparison for booleans and strings
                        passed = True
                        logger.info(f"Test case {i + 1} passed after normalization (formatting difference)")
                    elif normalized_expected == normalized_actual:
                        passed = True
                        logger.info(f"Test case {i + 1} passed after normalization (exact match)")
                    else:
                        passed = False
                        logger.warning(f"Test case {i + 1} failed - normalized outputs don't match")
                else:
                    # Other statuses (compilation error, runtime error, etc.)
                    passed = False
                
                error_msg = stderr if stderr else (compile_output if compile_output else message)
                if not passed and status_id == 4:
                    # Wrong Answer - provide comparison details
                    if normalized_expected != normalized_actual:
                        error_msg = f"Output mismatch. Expected: {expected_output}, Got: {stdout[:200]}"
                        if len(stdout) > 200:
                            error_msg += "... (truncated)"
                
                test_result = {
                    "test_case": i + 1,
                    "input": test_case.get("input", ""),
                    "expected_output": expected_output,
                    "actual_output": stdout,
                    "status": status_description,
                    "passed": passed,
                    "error": error_msg,
                }
                
                results.append(test_result)
                
                logger.info(f"Test case {i + 1} result: {'PASSED' if passed else 'FAILED'}")
                if not passed:
                    all_passed = False
                    logger.warning(f"Test case {i + 1} failed. Expected: {expected_output}, Got: {stdout}")
                    logger.warning(f"Normalized Expected: {normalized_expected}, Normalized Actual: {normalized_actual}")
                    
            except requests.exceptions.RequestException as e:
                logger.error(f"Request error for test case {i + 1}: {str(e)}")
                if hasattr(e, 'response') and e.response is not None:
                    logger.error(f"Response status: {e.response.status_code}")
                    logger.error(f"Response text: {e.response.text}")
                
                results.append({
                    "test_case": i + 1,
                    "input": test_case.get("input", ""),
                    "expected_output": test_case.get("output", ""),
                    "actual_output": "",
                    "status": "Error",
                    "passed": False,
                    "error": str(e),
                })
                all_passed = False
            except Exception as e:
                logger.error(f"Unexpected error for test case {i + 1}: {str(e)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                
                results.append({
                    "test_case": i + 1,
                    "input": test_case.get("input", ""),
                    "expected_output": test_case.get("output", ""),
                    "actual_output": "",
                    "status": "Error",
                    "passed": False,
                    "error": str(e),
                })
                all_passed = False
        
        final_result = {
            "all_passed": all_passed,
            "results": results,
            "total_tests": len(test_cases),
            "passed_tests": sum(1 for r in results if r["passed"])
        }
        
        logger.info("=" * 80)
        logger.info("JUDGE0 API - TEST EXECUTION COMPLETE")
        logger.info("=" * 80)
        logger.info(f"Total tests: {final_result['total_tests']}")
        logger.info(f"Passed: {final_result['passed_tests']}")
        logger.info(f"Failed: {final_result['total_tests'] - final_result['passed_tests']}")
        logger.info(f"All passed: {all_passed}")
        
        return final_result

