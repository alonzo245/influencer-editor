# Web Video Editor

A modern web-based video editor built with Next.js 15 and FastAPI, designed for easy video cropping, subtitle generation, and customization.

## 🎥 Features

- **Video Upload & Processing**

  - Support for common video formats
  - Secure file handling and processing
  - Real-time progress tracking

- **Video Editing**

  - Aspect ratio selection (16:9 or 9:16)
  - Smart cropping with position adjustment
  - Volume adjustment (0-300%)
  - Preview before processing

- **Subtitle Generation & Customization**
  - Automatic speech-to-text using Whisper AI
  - Support for English and Hebrew
  - Customizable subtitle styles:
    - Font size (16-72px)
    - Font color
    - Border size and color
    - Vertical positioning
  - Live preview of subtitles
  - Export options: Burned into video or separate SRT file

## 🛠️ Tech Stack

### Frontend

- Next.js 15
- React
- TypeScript
- Tailwind CSS

### Backend

- Python FastAPI
- FFmpeg for video processing
- Whisper AI for speech recognition
- ASS/SRT subtitle handling

## 📋 Prerequisites

- Node.js (v18 or higher)
- Python (v3.8 or higher)
- FFmpeg
- Git

## 🚀 Installation

1. **Clone the Repository**

   ```bash
   git clone [repository-url]
   cd web-video-editor-nextjs-15
   ```

2. **Frontend Setup**

   ```bash
   cd apps/frontend-nextjs
   npm install
   ```

3. **Backend Setup**

   ```bash
   cd apps/backend-video-editor
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Environment Variables**

   Create `.env` files in both frontend and backend directories:

   Frontend (.env.local):

   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

   Backend (.env):

   ```
   CORS_ORIGINS=http://localhost:3000
   ```

## 🏃‍♂️ Running the Application

1. **Start the Backend Server**

   ```bash
   cd apps/backend-video-editor
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   uvicorn main:app --reload
   ```

2. **Start the Frontend Development Server**

   ```bash
   cd apps/frontend-nextjs
   npm run dev
   ```

3. **Access the Application**

   Open your browser and navigate to `http://localhost:3000`

## 🎬 Usage Guide

1. **Upload Video**

   - Click "Upload Video" or drag and drop your video file
   - Supported formats: MP4, MOV, AVI, etc.

2. **Choose Aspect Ratio**

   - Select between 16:9 (horizontal) or 9:16 (vertical)
   - Preview the cropped result

3. **Adjust Crop Position**

   - Use the slider to adjust the crop position
   - Preview updates in real-time

4. **Subtitle Options**

   - Enable/disable speech-to-text
   - Choose language (English/Hebrew)
   - Select whether to burn subtitles into video

5. **Customize Subtitles**

   - Adjust font size, color, and border
   - Set vertical position
   - Adjust video volume
   - Preview changes in real-time

6. **Process and Download**
   - Click "Save and Render" to process
   - Download the final video and subtitle files

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
