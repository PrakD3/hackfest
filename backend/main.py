from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from utils.db import init_db

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
