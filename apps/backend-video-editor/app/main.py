import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import get_cors_middleware, create_directories
from .api.routes import router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Create FastAPI app
app = FastAPI(
    title="Video Editor API",
    description="API for video processing, including cropping, volume adjustment, and subtitle handling",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(CORSMiddleware, **get_cors_middleware())

# Include API routes
app.include_router(router, prefix="/api/v1")

@app.on_event("startup")
async def startup_event():
    """Create necessary directories on startup."""
    create_directories()

@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Welcome to the Video Editor API"} 