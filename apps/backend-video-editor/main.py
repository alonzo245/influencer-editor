from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import subprocess
import uuid
from pathlib import Path
import logging
from typing import Optional
import whisper
import time

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Video Editor API",
    description="REST API for video editing operations",
    version="1.0.0"
)

# Configure CORS
origins = [
    "http://localhost:3000",     # Next.js development server
    "http://127.0.0.1:3000",    # Alternative local development URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create necessary directories
UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")
TRANSCRIPTS_DIR = Path("transcripts")

# Create directories with proper permissions
for directory in [UPLOAD_DIR, OUTPUT_DIR, TRANSCRIPTS_DIR]:
    try:
        directory.mkdir(exist_ok=True)
        # Ensure directory is writable
        test_file = directory / ".test"
        test_file.touch()
        test_file.unlink()
    except Exception as e:
        logger.error(f"Error creating/accessing directory {directory}: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "message": f"Failed to create/access directory {directory}",
                "error": str(e)
            }
        )

# Initialize Whisper model
whisper_model = None

def get_whisper_model():
    global whisper_model
    if whisper_model is None:
        whisper_model = whisper.load_model("medium")
    return whisper_model

def format_timestamp(seconds):
    """Convert seconds to SRT timestamp format."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def create_srt_file(segments, output_path):
    """Create SRT file from transcription segments."""
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, segment in enumerate(segments, 1):
            start_time = format_timestamp(segment['start'])
            end_time = format_timestamp(segment['end'])
            f.write(f"{i}\n")
            f.write(f"{start_time} --> {end_time}\n")
            f.write(f"{segment['text'].strip()}\n\n")
    return output_path

def create_txt_file(segments, output_path):
    """Create plain text file from transcription segments."""
    with open(output_path, 'w', encoding='utf-8') as f:
        for segment in segments:
            f.write(f"{segment['text'].strip()}\n")
    return output_path

def transcribe_audio(input_path: str, language: Optional[str] = None):
    """Transcribe audio using Whisper."""
    model = get_whisper_model()
    
    # Set language options
    if language == "hebrew":
        language = "he"
    elif language == "english":
        language = "en"
    
    # Transcribe audio
    options = {"language": language} if language else {}
    result = model.transcribe(input_path, **options)
    
    return result

def get_video_dimensions(file_path: str) -> tuple:
    """Get video dimensions using ffprobe."""
    cmd = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "csv=s=x:p=0",
        file_path
    ]
    
    logger.info(f"Running ffprobe command: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        logger.error(f"ffprobe error output: {result.stderr}")
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Could not process video file",
                "error": result.stderr
            }
        )
    
    try:
        width, height = map(int, result.stdout.strip().split('x'))
        logger.info(f"Video dimensions: {width}x{height}")
        return width, height
    except ValueError as e:
        logger.error(f"Error parsing dimensions: {result.stdout}")
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Invalid video dimensions format",
                "error": str(e)
            }
        )

class SubtitleStyles(BaseModel):
    fontSize: int
    color: str
    borderSize: int
    borderColor: str
    verticalPosition: int
    volume: int
    textDirection: str
    marginV: int  # Range 0-200
    alignment: str  # "2", "5", or "8"

class SubtitlesData(BaseModel):
    text: str
    styles: SubtitleStyles

class ProcessVideoRequest(BaseModel):
    target_ratio: str
    position: float = 50
    volume: float = 100
    language: Optional[str] = None
    burn_subtitles: bool = False
    subtitles: Optional[SubtitlesData] = None

class TranscribeRequest(BaseModel):
    language: str

def create_custom_srt_file(text: str, output_path: Path) -> Path:
    """Create SRT file from custom subtitle text."""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(text)
    return output_path

def create_custom_ass_file(srt_path: Path, styles: SubtitleStyles, output_path: Path) -> Path:
    """Convert SRT to ASS with custom styles."""
    # First, convert SRT to basic ASS
    convert_cmd = [
        "ffmpeg",
        "-y",
        "-i", str(srt_path),
        str(output_path)
    ]
    subprocess.run(convert_cmd, check=True, capture_output=True)
    
    # Read the ASS file
    with open(output_path, 'r', encoding='utf-8') as f:
        ass_content = f.readlines()
    
    # Find the Style section and modify it
    style_line_index = -1
    for i, line in enumerate(ass_content):
        if line.startswith('Style: Default'):
            style_line_index = i
            break
    
    if style_line_index >= 0:
        # Convert hex color to ASS format (AABBGGRR)
        font_color = styles.color.lstrip('#')
        border_color = styles.borderColor.lstrip('#')
        
        # Convert RGB to ASS color format (AABBGGRR)
        def rgb_to_ass_color(hex_color: str) -> str:
            r = int(hex_color[0:2], 16)
            g = int(hex_color[2:4], 16)
            b = int(hex_color[4:6], 16)
            return f"&H00{b:02X}{g:02X}{r:02X}&"  # ASS uses BGR, we add 00 for alpha
        
        ass_font_color = rgb_to_ass_color(font_color)
        ass_border_color = rgb_to_ass_color(border_color)
        
        # Use the provided margin_v and alignment values
        margin_v = styles.marginV
        alignment = styles.alignment
        
        # Create new style line with custom properties
        # Format: Name, Font, Size, Primary, Secondary, Outline, Back, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
        new_style = f"Style: Default,Arial,{styles.fontSize},{ass_font_color},&H000000FF&,{ass_border_color},&H00000000&,0,0,0,0,100,100,0,0,1,{styles.borderSize},0,{alignment},10,10,{margin_v},1\n"
        
        ass_content[style_line_index] = new_style
        
        # Process RTL text if needed
        if styles.textDirection == "rtl":
            for i, line in enumerate(ass_content):
                if line.startswith("Dialogue:"):
                    # Split the dialogue line into parts
                    parts = line.split(",", 9)  # Split into 10 parts (Dialogue: + 9 style parameters)
                    if len(parts) == 10:
                        # Process the text part (last part)
                        text = parts[9].strip()
                        processed_text = process_rtl_text(text)
                        parts[9] = processed_text
                        ass_content[i] = ",".join(parts)
        
        # Write modified content back to file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.writelines(ass_content)
    
    return output_path

def process_rtl_text(text: str) -> str:
    """Process text to handle RTL (Hebrew) text properly."""
    if not text:
        return text
        
    # Split text into sentences
    sentences = []
    current_sentence = ""
    punctuation = ""
    
    # Process text from right to left
    for i in range(len(text) - 1, -1, -1):
        char = text[i]
        if char in "?!.":
            if current_sentence:
                # Add punctuation before the sentence
                sentences.append(char + " " + current_sentence.strip())
                current_sentence = ""
            else:
                punctuation = char
        else:
            current_sentence = char + current_sentence
    
    # Add the last sentence if exists
    if current_sentence:
        if punctuation:
            sentences.append(punctuation + " " + current_sentence.strip())
        else:
            sentences.append(current_sentence.strip())
    
    # Join sentences with proper spacing
    result = " ".join(sentences)
    return result

def crop_video(input_path: str, output_path: str, target_ratio: str, position: float = 50, volume: float = 100, language: Optional[str] = None, burn_subtitles: bool = False, subtitles_data: Optional[SubtitlesData] = None):
    """Crop video to target aspect ratio, adjust volume, and optionally burn in subtitles."""
    width, height = get_video_dimensions(input_path)
    
    logger.info(f"Processing video: {width}x{height}, ratio: {target_ratio}, position: {position}, volume: {volume}%")
    
    # Initialize variables
    new_width = width
    new_height = height
    x_offset = 0
    y_offset = 0
    
    if target_ratio == "9:16":  # Vertical
        new_width = int(height * (9/16))
        max_offset = width - new_width
        x_offset = int((position / 100) * max_offset)
        y_offset = 0
    else:  # 16:9 Horizontal
        new_height = int(width * (9/16))
        x_offset = 0
        y_offset = (height - new_height) // 2
    
    # Ensure dimensions are even numbers (required by some codecs)
    new_width = new_width - (new_width % 2)
    new_height = new_height - (new_height % 2)
    
    logger.info(f"Output dimensions: {new_width}x{new_height}")
    
    # Calculate volume factor (1.0 = 100%)
    volume_factor = volume / 100

    # Base video processing command
    filter_complex = [f"[0:v]crop={new_width}:{new_height}:{x_offset}:{y_offset}[v];[0:a]volume={volume_factor}[a]"]
    
    # Handle subtitles
    temp_srt_path = None
    temp_ass_path = None
    
    try:
        if burn_subtitles and subtitles_data:
            # Use custom subtitles
            logger.info("Using custom subtitles")
            temp_srt_path = TRANSCRIPTS_DIR / f"temp_{uuid.uuid4()}.srt"
            temp_ass_path = TRANSCRIPTS_DIR / f"temp_{uuid.uuid4()}.ass"
            
            create_custom_srt_file(subtitles_data.text, temp_srt_path)
            create_custom_ass_file(temp_srt_path, subtitles_data.styles, temp_ass_path)
            
            if temp_ass_path and temp_ass_path.exists():
                filter_complex[0] += f";[v]ass='{temp_ass_path}'[v]"
    except Exception as e:
        logger.error(f"Subtitle processing error: {str(e)}")
        # Continue without subtitles if there's an error
    
    cmd = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-filter_complex", filter_complex[0],
        "-map", "[v]",
        "-map", "[a]",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-profile:v", "main",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-c:a", "aac",
        "-b:a", "192k",
        output_path
    ]
    
    logger.info(f"Running FFmpeg command: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    # Clean up temporary files
    for temp_file in [temp_srt_path, temp_ass_path]:
        if temp_file and temp_file.exists():
            try:
                temp_file.unlink()
            except Exception as e:
                logger.warning(f"Could not clean up temporary file {temp_file}: {e}")
    
    if result.returncode != 0:
        logger.error(f"FFmpeg error output: {result.stderr}")
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Failed to process video",
                "error": result.stderr,
                "technical_details": "FFmpeg command failed",
                "can_retry": True
            }
        )

# API Endpoints

@app.get("/api/status")
async def get_status():
    """Check API health status"""
    return {
        "status": "ok",
        "version": "1.0.0",
        "service": "Video Editor API"
    }

@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload a video file for processing"""
    try:
        # Log the incoming file details
        logger.info(f"Received upload request for file: {file.filename}, content_type: {file.content_type}")
        
        # Check if it's a video file by attempting to get dimensions, rather than relying on content type
        # Some video files might come as application/octet-stream
        try:
            # Create a temporary file to check if it's a valid video
            temp_path = UPLOAD_DIR / f"temp_{uuid.uuid4()}_{file.filename}"
            content = await file.read()
            logger.info(f"Read {len(content)} bytes from uploaded file")
            
            with open(temp_path, "wb") as buffer:
                buffer.write(content)
            
            # Try to get video dimensions - this will fail if it's not a valid video file
            try:
                width, height = get_video_dimensions(str(temp_path))
                logger.info(f"Valid video file detected: {width}x{height}")
            except Exception as e:
                logger.error(f"Invalid video file: {str(e)}")
                raise HTTPException(
                    status_code=400,
                    detail={
                        "message": "Invalid video file",
                        "error": "File must be a valid video format",
                        "technical_details": str(e)
                    }
                )
            finally:
                # Clean up temporary file
                if temp_path.exists():
                    temp_path.unlink()
            
            # If we got here, it's a valid video file
            file_id = str(uuid.uuid4())
            input_path = UPLOAD_DIR / f"{file_id}_{file.filename}"
            logger.info(f"Saving file to: {input_path}")
            
            # Write the content to the final location
            with open(input_path, "wb") as buffer:
                buffer.write(content)
            logger.info("File saved successfully")
            
            # Verify file was written
            if not input_path.exists():
                raise Exception("File was not saved properly")
            
            if input_path.stat().st_size == 0:
                raise Exception("Saved file is empty")
            
            return {
                "success": True,
                "data": {
                    "file_id": file_id,
                    "original_filename": file.filename,
                    "dimensions": {
                        "width": width,
                        "height": height
                    }
                }
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error during file processing: {str(e)}")
            if 'input_path' in locals() and input_path.exists():
                try:
                    input_path.unlink()
                    logger.info("Cleaned up failed upload file")
                except Exception as cleanup_error:
                    logger.error(f"Error cleaning up file: {str(cleanup_error)}")
            raise
            
    except HTTPException as he:
        raise he
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Upload error: {error_msg}")
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Failed to process upload",
                "error": error_msg,
                "technical_details": {
                    "file_name": file.filename if file else None,
                    "content_type": file.content_type if file else None,
                }
            }
        )

@app.post("/api/videos/{file_id}/process")
async def process_video(
    file_id: str,
    request: ProcessVideoRequest
):
    """Process video with cropping and optional subtitles"""
    try:
        # Validate parameters
        if request.target_ratio not in ["9:16", "16:9"]:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Invalid aspect ratio",
                    "accepted_values": ["9:16", "16:9"]
                }
            )
        
        if not 0 <= request.position <= 100:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Invalid position value",
                    "accepted_range": "0-100"
                }
            )

        if not 0 <= request.volume <= 300:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Invalid volume value",
                    "accepted_range": "0-300"
                }
            )
        
        if request.language and request.language not in ["hebrew", "english"]:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Invalid language",
                    "accepted_values": ["hebrew", "english"]
                }
            )
        
        # Find input file
        input_files = list(UPLOAD_DIR.glob(f"{file_id}_*"))
        if not input_files:
            raise HTTPException(
                status_code=404,
                detail={
                    "message": "File not found",
                    "error": f"No input file found for ID: {file_id}"
                }
            )
        
        input_path = input_files[0]
        
        # Create unique output path with timestamp
        timestamp = int(time.time())
        output_path = OUTPUT_DIR / f"processed_{file_id}_{timestamp}.mp4"
        
        # Clean up any existing processed files for this video
        for old_file in OUTPUT_DIR.glob(f"processed_{file_id}_*.mp4"):
            try:
                old_file.unlink()
                logger.info(f"Cleaned up old processed file: {old_file}")
            except Exception as e:
                logger.warning(f"Could not clean up old file {old_file}: {e}")
        
        # Process video
        crop_video(
            str(input_path),
            str(output_path),
            request.target_ratio,
            request.position,
            request.volume,
            request.language,
            request.burn_subtitles,
            request.subtitles
        )
        
        # Generate transcripts
        transcript_files = {}
        
        # Save custom subtitles if provided
        if request.subtitles:
            # Save SRT file with timestamp
            srt_path = TRANSCRIPTS_DIR / f"transcript_{file_id}_{timestamp}.srt"
            with open(srt_path, 'w', encoding='utf-8') as f:
                f.write(request.subtitles.text)
            transcript_files["srt"] = str(srt_path)
            
            # Save TXT file with timestamp
            txt_path = TRANSCRIPTS_DIR / f"transcript_{file_id}_{timestamp}.txt"
            with open(txt_path, 'w', encoding='utf-8') as f:
                # Extract only the text lines from SRT format
                lines = request.subtitles.text.split('\n')
                for i, line in enumerate(lines):
                    if line and not line.isdigit() and not ' --> ' in line:
                        f.write(line + '\n')
            transcript_files["txt"] = str(txt_path)
            
            # Clean up old transcript files
            for old_file in TRANSCRIPTS_DIR.glob(f"transcript_{file_id}_*.srt"):
                try:
                    old_file.unlink()
                    logger.info(f"Cleaned up old SRT file: {old_file}")
                except Exception as e:
                    logger.warning(f"Could not clean up old SRT file {old_file}: {e}")
            for old_file in TRANSCRIPTS_DIR.glob(f"transcript_{file_id}_*.txt"):
                try:
                    old_file.unlink()
                    logger.info(f"Cleaned up old TXT file: {old_file}")
                except Exception as e:
                    logger.warning(f"Could not clean up old TXT file {old_file}: {e}")
        
        return {
            "success": True,
            "data": {
                "output_file": str(output_path),
                "transcript_files": transcript_files
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Processing error: {str(e)}")
        if 'output_path' in locals() and output_path.exists():
            output_path.unlink()
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Failed to process video",
                "error": str(e)
            }
        )

@app.get("/api/files/{filename}")
async def download_file(filename: str):
    """Download processed video or transcript file"""
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
        
        return FileResponse(
            file_path,
            filename=filename,
            media_type='application/octet-stream'
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

@app.delete("/api/files/{file_id}")
async def delete_files(file_id: str):
    """Delete all files associated with the given file ID"""
    try:
        deleted_files = []
        
        # Remove uploaded file
        for file in UPLOAD_DIR.glob(f"{file_id}_*"):
            try:
                file.unlink()
                deleted_files.append(str(file))
            except Exception as e:
                logger.error(f"Error removing uploaded file {file}: {str(e)}")

        # Remove processed file
        for file in OUTPUT_DIR.glob(f"processed_{file_id}.mp4"):
            try:
                file.unlink()
                deleted_files.append(str(file))
            except Exception as e:
                logger.error(f"Error removing processed file {file}: {str(e)}")

        # Remove transcript files
        for file in TRANSCRIPTS_DIR.glob(f"transcript_{file_id}.*"):
            try:
                file.unlink()
                deleted_files.append(str(file))
            except Exception as e:
                logger.error(f"Error removing transcript file {file}: {str(e)}")

        return {
            "success": True,
            "data": {
                "deleted_files": deleted_files
            }
        }
    except Exception as e:
        logger.error(f"Cleanup error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Failed to clean up files",
                "error": str(e)
            }
        )

@app.post("/api/videos/{file_id}/transcribe")
async def transcribe_video(file_id: str, request: TranscribeRequest):
    """Transcribe video speech to text"""
    try:
        # Find input file
        input_files = list(UPLOAD_DIR.glob(f"{file_id}_*"))
        if not input_files:
            raise HTTPException(
                status_code=404,
                detail={
                    "message": "File not found",
                    "error": f"No input file found for ID: {file_id}"
                }
            )
        
        input_path = input_files[0]
        
        # Validate language
        if request.language not in ["hebrew", "english"]:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Invalid language",
                    "accepted_values": ["hebrew", "english"]
                }
            )
        
        # Transcribe audio
        try:
            result = transcribe_audio(str(input_path), request.language)
            
            # Convert segments to full text
            full_text = "\n".join(
                f"{i + 1}\n{format_timestamp(segment['start'])} --> {format_timestamp(segment['end'])}\n{segment['text'].strip()}\n"
                for i, segment in enumerate(result["segments"])
            )
            
            return {
                "success": True,
                "data": {
                    "text": full_text
                }
            }
            
        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail={
                    "message": "Failed to transcribe video",
                    "error": str(e)
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Processing error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Failed to process request",
                "error": str(e)
            }
        ) 