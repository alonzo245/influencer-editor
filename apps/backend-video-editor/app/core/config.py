from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware

# Directory configurations
UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")
TRANSCRIPTS_DIR = Path("transcripts")

# CORS configuration
CORS_ORIGINS = [
    "http://localhost:3000",     # Next.js development server
    "http://127.0.0.1:3000",    # Alternative local development URL
]

# Create CORS middleware
def get_cors_middleware():
    return CORSMiddleware(
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Create necessary directories
def create_directories():
    for directory in [UPLOAD_DIR, OUTPUT_DIR, TRANSCRIPTS_DIR]:
        try:
            directory.mkdir(exist_ok=True)
            # Ensure directory is writable
            test_file = directory / ".test"
            test_file.touch()
            test_file.unlink()
        except Exception as e:
            raise RuntimeError(f"Failed to create/access directory {directory}: {e}") 