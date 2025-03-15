#!/bin/bash

# Function to cleanup background processes on script exit
cleanup() {
    echo "Stopping all processes..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Set up cleanup on script exit
trap cleanup EXIT INT TERM

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Store the root directory
ROOT_DIR="$(pwd)"

echo -e "${GREEN}Starting development environment...${NC}\n"

# Start FastAPI backend
echo "Starting FastAPI backend..."
if [ -d "$ROOT_DIR/apps/backend-video-editor" ]; then
    cd "$ROOT_DIR/apps/backend-video-editor" || exit 1
    
    # Create and activate virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        echo "Creating Python virtual environment..."
        python3 -m venv venv
        source venv/bin/activate
        echo "Installing backend dependencies..."
        pip install -r requirements.txt
    else
        source venv/bin/activate
    fi
    
    # Create required directories
    mkdir -p uploads outputs transcripts
    
    # Start the backend server
    uvicorn main:app --reload --port 8000 &
    BACKEND_PID=$!
else
    echo -e "${RED}Error: backend directory not found at apps/backend-video-editor${NC}"
    exit 1
fi

# Wait a bit for backend to initialize
sleep 2

# Start Next.js frontend
echo "Starting Next.js frontend..."
if [ -d "$ROOT_DIR/apps/frontend-nextjs" ]; then
    cd "$ROOT_DIR/apps/frontend-nextjs" || exit 1
    # Ensure node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install
    fi
    npm run dev &
    FRONTEND_PID=$!
else
    echo -e "${RED}Error: frontend directory not found at apps/frontend-nextjs${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Keep script running and show status
echo -e "\n${GREEN}Development servers are running:${NC}"
echo "- Frontend: http://localhost:3000"
echo "- Backend:  http://localhost:8000"
echo -e "\nPress Ctrl+C to stop all servers\n"

# Wait for all background processes
wait 