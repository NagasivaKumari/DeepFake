from fastapi import FastAPI, Depends, HTTPException
from .routes import media
from .routes import auth
from .routes import registrations
from .routes import ai_generate
from .config import settings
from fastapi.middleware.cors import CORSMiddleware
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.security import OAuth2PasswordBearer

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

# Initialize the rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Add rate limit exception handler
@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request, exc):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please try again later."},
    )

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

# Add HTTPS enforcement middleware
app.add_middleware(HTTPSRedirectMiddleware)

app.include_router(registrations.router)
app.include_router(media.router)
app.include_router(auth.router)
app.include_router(ai_generate.router)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Mock function to decode token and retrieve user role
def get_user_role(token: str = Depends(oauth2_scheme)):
    # Replace this with actual token decoding logic
    user_roles = {
        "admin_token": "admin",
        "editor_token": "editor",
        "viewer_token": "viewer",
    }
    role = user_roles.get(token)
    if not role:
        raise HTTPException(status_code=403, detail="Invalid or missing role")
    return role

# Middleware to enforce role-based access
async def role_required(required_role: str):
    def role_checker(role: str = Depends(get_user_role)):
        if role != required_role:
            raise HTTPException(status_code=403, detail="Access denied")
    return role_checker

# Example usage in an endpoint
@app.get("/admin/protected")
async def protected_endpoint(role: str = Depends(role_required("admin"))):
    return {"message": "Welcome, admin!"}

@app.get("/health")
@limiter.limit("5/minute")
def health():
    return {"status": "ok"}
