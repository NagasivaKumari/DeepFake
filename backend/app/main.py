from fastapi import FastAPI
from .routes import media
from .routes import auth
from .routes import registrations
from .routes import ai_generate
from .config import settings
from fastapi.middleware.cors import CORSMiddleware
import logging

app = FastAPI(title="ProofChain Backend")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("ProofChain Backend")

# Log startup message
logger.info("Starting ProofChain Backend API")

# Middleware to log requests and responses
@app.middleware("http")
async def log_requests(request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

# Middleware to log unhandled exceptions
@app.exception_handler(Exception)
async def log_exceptions(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return await app.default_exception_handler(request, exc)

app.add_middleware(
    CORSMiddleware,
    # Allow common local dev origins. Add any additional dev origins (e.g. Vite at :5175) as needed.
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:5173",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



app.include_router(registrations.router)
app.include_router(media.router)
app.include_router(auth.router)
app.include_router(ai_generate.router)


@app.get("/health")
def health():
    return {"status": "ok"}
