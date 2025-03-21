import subprocess
import logging
from pathlib import Path
from typing import Optional

from ..core.config import TRANSCRIPTS_DIR

logger = logging.getLogger(__name__)

def transcribe_audio(audio_path: Path, language: str = "he") -> Optional[Path]:
    """Transcribe audio using Whisper model."""
    try:
        # Create output path for transcription
        output_path = TRANSCRIPTS_DIR / f"{audio_path.stem}.srt"
        
        # Run Whisper transcription
        cmd = [
            "whisper",
            str(audio_path),
            "--language", language,
            "--output_dir", str(TRANSCRIPTS_DIR),
            "--output_format", "srt"
        ]
        
        logger.info(f"Running transcription command: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"Transcription failed: {result.stderr}")
            return None
            
        logger.info(f"Transcription completed successfully: {output_path}")
        return output_path
        
    except Exception as e:
        logger.error(f"Error during transcription: {str(e)}")
        return None 