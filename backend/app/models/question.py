from sqlalchemy import Column, Integer, String, Text, JSON
from app.core.database import Base


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    difficulty = Column(String, nullable=False)  # Easy, Medium, Hard
    company = Column(String, nullable=True)  # Company tag (e.g., "Google", "Amazon", "Meta", "Microsoft", "Apple", "Netflix", "Uber", "General")
    examples = Column(JSON, nullable=True)  # List of {input, output, explanation}
    test_cases = Column(JSON, nullable=False)  # List of {input, output}
    constraints = Column(Text, nullable=True)

