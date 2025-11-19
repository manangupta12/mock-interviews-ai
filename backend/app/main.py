import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api import auth, interviews

app = FastAPI(title="Mock Interview AI API", version="1.0.0")

# Build allowed origins for CORS
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5000",
]

# Add Replit domains if available
replit_domains = os.getenv("REPLIT_DOMAINS", "")
if replit_domains:
    for domain in replit_domains.split(","):
        allowed_origins.append(f"https://{domain.strip()}")

replit_dev_domain = os.getenv("REPLIT_DEV_DOMAIN", "")
if replit_dev_domain:
    allowed_origins.append(f"https://{replit_dev_domain}")

# CORS middleware - must be added before routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Include routers
app.include_router(auth.router)
app.include_router(interviews.router)


@app.get("/")
def root():
    return {"message": "Mock Interview AI API"}


@app.get("/health")
def health():
    return {"status": "healthy"}

