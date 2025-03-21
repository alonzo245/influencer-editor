import re
import subprocess
import logging
from pathlib import Path
from typing import Optional

from ..models.subtitles import SubtitlesData, SubtitleStyles
from ..core.config import TRANSCRIPTS_DIR

logger = logging.getLogger(__name__)

def process_rtl_text(text: str) -> str:
    """Process text to handle RTL (Hebrew) text properly with correct punctuation positioning."""
    if not text:
        return text

    rtl_mark = "‏"  # RTL mark
    isolate_start = "⁧"  # RTL isolate start
    isolate_end = "⁩"  # RTL isolate end

    lines = text.splitlines()
    processed_lines = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            processed_lines.append("")
            continue

        # Move punctuation to the end of the line
        match = re.match(r"^([!?.,]+)(.+)", stripped)
        if match:
            stripped = match.group(2).strip() + match.group(1)

        processed_line = f"{rtl_mark}{isolate_start}{stripped}{isolate_end}"
        processed_lines.append(processed_line)

    return "\n".join(processed_lines)

def create_custom_srt_file(text: str, output_path: Path) -> Path:
    """Create SRT file from custom subtitle text with proper RTL formatting."""
    # Split text into lines and process each subtitle entry
    lines = text.split('\n')
    subtitle_entries = []
    current_entry = []
    
    for line in lines:
        line = line.strip()
        if not line:
            if current_entry:
                subtitle_entries.append(current_entry)
                current_entry = []
        elif line.isdigit() and len(current_entry) == 0:
            # This is a subtitle number
            current_entry.append(line)
        elif ' --> ' in line:
            # This is a timestamp line
            if len(current_entry) == 1:  # We have the subtitle number
                current_entry.append(line)
            else:
                # If we somehow get a timestamp without a number, start a new entry
                if current_entry:
                    subtitle_entries.append(current_entry)
                current_entry = [str(len(subtitle_entries) + 1), line]
        else:
            # This is a text line - process it for RTL
            if len(current_entry) >= 2:  # We have number and timestamp
                # Add RTL control characters to the text
                rtl_mark = "‏"
                isolate_start = "⁧"
                isolate_end = "⁩"
                processed_text = f"{rtl_mark}{isolate_start}{line.strip()}{isolate_end}"
                current_entry.append(processed_text)
            else:
                # If we somehow get text without number and timestamp, skip it
                continue
    
    # Add the last entry if exists
    if current_entry:
        subtitle_entries.append(current_entry)
    
    # Write the SRT file
    with open(output_path, 'w', encoding='utf-8') as f:
        for entry in subtitle_entries:
            if len(entry) >= 3:  # Ensure we have number, timestamp, and text
                f.write(f"{entry[0]}\n")  # Subtitle number
                f.write(f"{entry[1]}\n")  # Timestamp
                f.write(f"{entry[2]}\n")  # Text with RTL formatting
                if len(entry) > 3:  # Additional text lines
                    for text_line in entry[3:]:
                        f.write(f"{text_line}\n")
                f.write("\n")
    
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