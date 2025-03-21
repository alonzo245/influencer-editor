import subprocess
import logging
from pathlib import Path
from typing import Optional, Tuple
from fastapi import HTTPException

from ..models.subtitles import SubtitlesData
from ..core.config import UPLOAD_DIR, OUTPUT_DIR, TRANSCRIPTS_DIR

logger = logging.getLogger(__name__)

def get_video_dimensions(file_path: str) -> Tuple[int, int]:
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

def build_ffmpeg_command(input_path: str, output_path: str, filter_complex: list) -> list:
    """Build FFmpeg command with proper encoding settings."""
    return [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-filter_complex", "".join(filter_complex),
        "-map", "[v]",
        "-map", "[a]",
        "-c:v", "mpeg4",
        "-q:v", "5",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-c:a", "aac",
        "-b:a", "192k",
        output_path
    ]

def crop_video(
    input_path: str,
    output_path: str,
    target_ratio: str,
    position: float = 50,
    volume: float = 100,
    language: Optional[str] = None,
    burn_subtitles: bool = False,
    subtitles_data: Optional[SubtitlesData] = None
):
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

    # Handle subtitles
    temp_srt_path = None
    
    try:
        if burn_subtitles and subtitles_data:
            # Use custom subtitles
            logger.info("Using custom subtitles")
            temp_srt_path = TRANSCRIPTS_DIR / f"temp_{uuid.uuid4()}.srt"
            create_custom_srt_file(subtitles_data.text, temp_srt_path)
            
            if temp_srt_path and temp_srt_path.exists():
                # Convert hex colors to FFmpeg format (AABBGGRR)
                def hex_to_ffmpeg_color(hex_color: str) -> str:
                    hex_color = hex_color.lstrip('#')
                    r = hex_color[0:2]
                    g = hex_color[2:4]
                    b = hex_color[4:6]
                    return f"&H00{b}{g}{r}&"
                
                primary_color = hex_to_ffmpeg_color(subtitles_data.styles.color)
                outline_color = hex_to_ffmpeg_color(subtitles_data.styles.borderColor)
                
                # Ensure alignment is a number
                alignment = int(subtitles_data.styles.alignment)
                
                # Create subtitle filter with styling
                subtitle_style = (
                    f"FontName=Arial,"
                    f"FontSize={int(subtitles_data.styles.fontSize)},"
                    f"PrimaryColour={primary_color},"
                    f"OutlineColour={outline_color},"
                    f"Outline={int(subtitles_data.styles.borderSize)},"
                    f"MarginV={int(subtitles_data.styles.marginV)},"
                    f"Alignment={alignment},"
                    f"MarginL=0,"
                    f"MarginR=0,"
                    f"Bold=0,"
                    f"Italic=0,"
                    f"Spacing=0,"
                    f"BorderStyle=1,"
                    f"Shadow=0,"
                    f"MarginH=0"
                )
                
                # Add subtitle filter with proper escaping
                srt_path_str = str(temp_srt_path).replace('\\', '/').replace(':', '\\:')
                filter_complex = [
                    f"[0:v]crop={new_width}:{new_height}:{x_offset}:{y_offset},subtitles='{srt_path_str}':force_style='{subtitle_style}'[v];",
                    f"[0:a]volume={volume_factor}[a]"
                ]
                logger.info(f"Added subtitle filter with path: {srt_path_str}")
                logger.info(f"Subtitle style: {subtitle_style}")
            else:
                filter_complex = [f"[0:v]crop={new_width}:{new_height}:{x_offset}:{y_offset}[v];[0:a]volume={volume_factor}[a]"]
        else:
            filter_complex = [f"[0:v]crop={new_width}:{new_height}:{x_offset}:{y_offset}[v];[0:a]volume={volume_factor}[a]"]
    except Exception as e:
        logger.error(f"Subtitle processing error: {str(e)}")
        filter_complex = [f"[0:v]crop={new_width}:{new_height}:{x_offset}:{y_offset}[v];[0:a]volume={volume_factor}[a]"]
    
    # Build and execute FFmpeg command
    cmd = build_ffmpeg_command(input_path, output_path, filter_complex)
    logger.info(f"Running FFmpeg command: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    # Clean up temporary files
    if temp_srt_path and temp_srt_path.exists():
        try:
            temp_srt_path.unlink()
        except Exception as e:
            logger.warning(f"Could not clean up temporary SRT file {temp_srt_path}: {e}")
    
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