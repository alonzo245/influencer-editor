import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
from typing import Optional
import uuid
import time

from ..models.subtitles import ProcessVideoRequest, TranscribeRequest
from ..services.video_processor import crop_video
from ..services.transcription_service import transcribe_audio
from ..core.config import UPLOAD_DIR, OUTPUT_DIR, TRANSCRIPTS_DIR

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload a video file."""
    try:
        # Create upload directory if it doesn't exist
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        file_path = UPLOAD_DIR / f"{file_id}_{file.filename}"
        
        # Save uploaded file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
            
        logger.info(f"Video uploaded successfully: {file_path}")
        return {
            "success": True,
            "data": {
                "file_id": file_id,
                "original_filename": file.filename,
                "path": str(file_path)
            }
        }
        
    except Exception as e:
        logger.error(f"Error uploading video: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process")
async def process_video(request: ProcessVideoRequest):
    """Process a video with cropping, volume adjustment, and optional subtitles."""
    try:
        input_path = Path(request.input_path)
        if not input_path.exists():
            raise HTTPException(status_code=404, detail="Input video not found")
            
        # Create output directory if it doesn't exist
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        
        # Generate unique output filename with timestamp
        timestamp = int(time.time())
        output_path = OUTPUT_DIR / f"processed_{input_path.stem}_{timestamp}.mp4"
        
        # Process the video
        await crop_video(
            input_path=str(input_path),
            output_path=str(output_path),
            target_ratio=request.target_ratio,
            position=request.position,
            volume=request.volume,
            language=request.language,
            burn_subtitles=request.burn_subtitles,
            subtitles_data=request.subtitles
        )
        
        logger.info(f"Video processed successfully: {output_path}")
        return {
            "success": True,
            "data": {
                "output_path": str(output_path),
                "filename": output_path.name
            }
        }
        
    except Exception as e:
        logger.error(f"Error processing video: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transcribe")
async def transcribe_video(request: TranscribeRequest):
    """Transcribe audio from a video file."""
    try:
        input_path = Path(request.input_path)
        if not input_path.exists():
            raise HTTPException(status_code=404, detail="Input video not found")
            
        # Extract audio and transcribe
        output_path = await transcribe_audio(input_path, request.language)
        if not output_path:
            raise HTTPException(status_code=500, detail="Transcription failed")
            
        logger.info(f"Transcription completed successfully: {output_path}")
        return {
            "success": True,
            "data": {
                "output_path": str(output_path),
                "filename": output_path.name
            }
        }
        
    except Exception as e:
        logger.error(f"Error transcribing video: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/files/{filename}")
async def download_file(filename: str):
    """Download a file (video or transcript)."""
    try:
        # Check both OUTPUT_DIR and TRANSCRIPTS_DIR
        file_path = OUTPUT_DIR / filename
        if not file_path.exists():
            file_path = TRANSCRIPTS_DIR / filename
            if not file_path.exists():
                raise HTTPException(
                    status_code=404,
                    detail={
                        "message": "File not found",
                        "error": f"No file found with name: {filename}"
                    }
                )
        
        # Determine content type based on file extension
        content_type = "application/octet-stream"
        if filename.endswith(".mp4"):
            content_type = "video/mp4"
        elif filename.endswith(".srt"):
            content_type = "application/x-subrip"
        elif filename.endswith(".txt"):
            content_type = "text/plain"
        
        return FileResponse(
            file_path,
            filename=filename,
            media_type=content_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Download error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Failed to download file",
                "error": str(e)
            }
        ) 