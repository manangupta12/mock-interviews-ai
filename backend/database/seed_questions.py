"""
Seed script to populate DSA questions in the database
Run this after creating the database tables
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.question import Question

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

# Sample DSA questions
questions_data = [
    {
        "title": "Two Sum",
        "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
        "difficulty": "Easy",
        "examples": [
            {
                "input": "nums = [2,7,11,15], target = 9",
                "output": "[0,1]",
                "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
            },
            {
                "input": "nums = [3,2,4], target = 6",
                "output": "[1,2]",
                "explanation": "Because nums[1] + nums[2] == 6, we return [1, 2]."
            }
        ],
        "test_cases": [
            {"input": "[2,7,11,15]\n9", "output": "[0,1]"},
            {"input": "[3,2,4]\n6", "output": "[1,2]"},
            {"input": "[3,3]\n6", "output": "[0,1]"}
        ],
        "constraints": "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists."
    },
    {
        "title": "Best Time to Buy and Sell Stock",
        "description": "You are given an array prices where prices[i] is the price of a given stock on the ith day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.",
        "difficulty": "Easy",
        "examples": [
            {
                "input": "prices = [7,1,5,3,6,4]",
                "output": "5",
                "explanation": "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5."
            },
            {
                "input": "prices = [7,6,4,3,1]",
                "output": "0",
                "explanation": "In this case, no transactions are done and the max profit = 0."
            }
        ],
        "test_cases": [
            {"input": "[7,1,5,3,6,4]", "output": "5"},
            {"input": "[7,6,4,3,1]", "output": "0"},
            {"input": "[1,2]", "output": "1"}
        ],
        "constraints": "1 <= prices.length <= 10^5\n0 <= prices[i] <= 10^4"
    },
    {
        "title": "Valid Parentheses",
        "description": "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
        "difficulty": "Easy",
        "examples": [
            {
                "input": "s = \"()\"",
                "output": "true",
                "explanation": "The string is valid."
            },
            {
                "input": "s = \"()[]{}\"",
                "output": "true",
                "explanation": "All brackets are properly closed."
            },
            {
                "input": "s = \"(]\"",
                "output": "false",
                "explanation": "The brackets are not properly matched."
            }
        ],
        "test_cases": [
            {"input": "\"()\"", "output": "true"},
            {"input": "\"()[]{}\"", "output": "true"},
            {"input": "\"(]\"", "output": "false"},
            {"input": "\"([)]\"", "output": "false"}
        ],
        "constraints": "1 <= s.length <= 10^4\ns consists of parentheses only '()[]{}'."
    },
    {
        "title": "Longest Substring Without Repeating Characters",
        "description": "Given a string s, find the length of the longest substring without repeating characters.",
        "difficulty": "Medium",
        "examples": [
            {
                "input": "s = \"abcabcbb\"",
                "output": "3",
                "explanation": "The answer is \"abc\", with the length of 3."
            },
            {
                "input": "s = \"bbbbb\"",
                "output": "1",
                "explanation": "The answer is \"b\", with the length of 1."
            },
            {
                "input": "s = \"pwwkew\"",
                "output": "3",
                "explanation": "The answer is \"wke\", with the length of 3."
            }
        ],
        "test_cases": [
            {"input": "\"abcabcbb\"", "output": "3"},
            {"input": "\"bbbbb\"", "output": "1"},
            {"input": "\"pwwkew\"", "output": "3"},
            {"input": "\"\"", "output": "0"}
        ],
        "constraints": "0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols and spaces."
    },
    {
        "title": "3Sum",
        "description": "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.\n\nNotice that the solution set must not contain duplicate triplets.",
        "difficulty": "Medium",
        "examples": [
            {
                "input": "nums = [-1,0,1,2,-1,-4]",
                "output": "[[-1,-1,2],[-1,0,1]]",
                "explanation": "The triplets that sum to 0 are [-1,-1,2] and [-1,0,1]."
            },
            {
                "input": "nums = [0,1,1]",
                "output": "[]",
                "explanation": "No triplets sum to 0."
            }
        ],
        "test_cases": [
            {"input": "[-1,0,1,2,-1,-4]", "output": "[[-1,-1,2],[-1,0,1]]"},
            {"input": "[0,1,1]", "output": "[]"},
            {"input": "[0,0,0]", "output": "[[0,0,0]]"}
        ],
        "constraints": "3 <= nums.length <= 3000\n-10^5 <= nums[i] <= 10^5"
    },
    {
        "title": "Merge Intervals",
        "description": "Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.",
        "difficulty": "Medium",
        "examples": [
            {
                "input": "intervals = [[1,3],[2,6],[8,10],[15,18]]",
                "output": "[[1,6],[8,10],[15,18]]",
                "explanation": "Since intervals [1,3] and [2,6] overlap, merge them into [1,6]."
            },
            {
                "input": "intervals = [[1,4],[4,5]]",
                "output": "[[1,5]]",
                "explanation": "Intervals [1,4] and [4,5] are considered overlapping."
            }
        ],
        "test_cases": [
            {"input": "[[1,3],[2,6],[8,10],[15,18]]", "output": "[[1,6],[8,10],[15,18]]"},
            {"input": "[[1,4],[4,5]]", "output": "[[1,5]]"},
            {"input": "[[1,4],[0,4]]", "output": "[[0,4]]"}
        ],
        "constraints": "1 <= intervals.length <= 10^4\nintervals[i].length == 2\n0 <= starti <= endi <= 10^4"
    },
    {
        "title": "Trapping Rain Water",
        "description": "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
        "difficulty": "Hard",
        "examples": [
            {
                "input": "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
                "output": "6",
                "explanation": "The above elevation map (black section) is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water (blue section) are being trapped."
            },
            {
                "input": "height = [4,2,0,3,2,5]",
                "output": "9",
                "explanation": "9 units of rain water are trapped."
            }
        ],
        "test_cases": [
            {"input": "[0,1,0,2,1,0,1,3,2,1,2,1]", "output": "6"},
            {"input": "[4,2,0,3,2,5]", "output": "9"},
            {"input": "[3,0,2,0,4]", "output": "7"}
        ],
        "constraints": "n == height.length\n1 <= n <= 2 * 10^4\n0 <= height[i] <= 10^5"
    },
    {
        "title": "Merge k Sorted Lists",
        "description": "You are given an array of k linked-lists lists, each linked-list is sorted in ascending order.\n\nMerge all the linked-lists into one sorted linked-list and return it.",
        "difficulty": "Hard",
        "examples": [
            {
                "input": "lists = [[1,4,5],[1,3,4],[2,6]]",
                "output": "[1,1,2,3,4,4,5,6]",
                "explanation": "The linked-lists are:\n1->4->5\n1->3->4\n2->6\nmerging them into one sorted list:\n1->1->2->3->4->4->5->6"
            },
            {
                "input": "lists = []",
                "output": "[]",
                "explanation": "No lists to merge."
            }
        ],
        "test_cases": [
            {"input": "[[1,4,5],[1,3,4],[2,6]]", "output": "[1,1,2,3,4,4,5,6]"},
            {"input": "[]", "output": "[]"},
            {"input": "[[]]", "output": "[]"}
        ],
        "constraints": "k == lists.length\n0 <= k <= 10^4\n0 <= lists[i].length <= 500\n-10^4 <= lists[i][j] <= 10^4\nlists[i] is sorted in ascending order."
    }
]

def seed_questions():
    db = SessionLocal()
    try:
        # Clear existing questions (optional - comment out if you want to keep existing)
        # db.query(Question).delete()
        # db.commit()
        
        for q_data in questions_data:
            # Check if question already exists
            existing = db.query(Question).filter(Question.title == q_data["title"]).first()
            if not existing:
                question = Question(**q_data)
                db.add(question)
        
        db.commit()
        print(f"Seeded {len(questions_data)} questions successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding questions: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_questions()

