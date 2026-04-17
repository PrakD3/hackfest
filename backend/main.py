from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from utils.db import init_db
import warnings
import os

# Load .env from backend directory explicitly
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Verify DATABASE_URL is loaded
if not os.getenv("DATABASE_URL"):
    print("WARNING: DATABASE_URL not loaded from .env file")

# Suppress optional dependency warnings
warnings.filterwarnings("ignore", message=".*PyTorch.*")
warnings.filterwarnings("ignore", message=".*TensorFlow.*")
warnings.filterwarnings("ignore", message=".*JAX.*")
warnings.filterwarnings("ignore", message=".*requires PyTorch.*")
warnings.filterwarnings("ignore", message=".*normalization.*")

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="Drug Discovery AI", version="3.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_methods=["*"], allow_headers=["*"], allow_credentials=True)

from routers import analysis, stream, status, molecules, export, benchmark, discoveries, themes
app.include_router(analysis.router,    prefix="/api")
app.include_router(stream.router,      prefix="/api")
app.include_router(status.router,      prefix="/api")
app.include_router(molecules.router,   prefix="/api")
app.include_router(export.router,      prefix="/api")
app.include_router(benchmark.router,   prefix="/api")
app.include_router(discoveries.router, prefix="/api")
app.include_router(themes.router,      prefix="/api")
