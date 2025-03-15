export interface ProcessingOptions {
  cropPosition: number;
  aspectRatio: "16:9" | "9:16";
  language?: string;
  burnSubtitles: boolean;
}

export interface VideoFile {
  url: string;
  type: string;
  name: string;
}

export interface SubtitleOptions {
  fontSize: number;
  color: string;
  borderSize: number;
  borderColor: string;
  verticalPosition: number;
}
