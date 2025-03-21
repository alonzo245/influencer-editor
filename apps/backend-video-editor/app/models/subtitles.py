from pydantic import BaseModel

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
    language: str | None = None
    burn_subtitles: bool = False
    subtitles: SubtitlesData | None = None

class TranscribeRequest(BaseModel):
    language: str 