from fastapi import FastAPI
from .routes import media
from .routes import auth
from .routes import registrations
from .routes import ai_generate
from .config import settings
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ProofChain Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080", "http://localhost:5173"],
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
