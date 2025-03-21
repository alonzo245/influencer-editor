import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
from typing import Optional

from ..models.subtitles import ProcessVideoRequest, TranscribeRequest
from ..services.video_processor import crop_video
from ..services.transcription_service import transcribe_audio
from ..core.config import UPLOAD_DIR, OUTPUT_DIR

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload a video file."""
    try:
        # Create upload directory if it doesn't exist
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        
        # Save uploaded file
        file_path = UPLOAD_DIR / file.filename
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
            
        logger.info(f"Video uploaded successfully: {file_path}")
        return {"filename": file.filename, "path": str(file_path)}
        
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
        output_path = OUTPUT_DIR / f"processed_{input_path.name}"
        
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
        return {"output_path": str(output_path)}
        
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
        return {"output_path": str(output_path)}
        
    except Exception as e:
        logger.error(f"Error transcribing video: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 