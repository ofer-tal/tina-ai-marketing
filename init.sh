#!/bin/bash

# Blush Marketing Operations Center - Initialization Script
# This script sets up the development environment for the blush-marketing project

set -e  # Exit on error

echo "🌸 Blush Marketing Operations Center - Environment Setup"
echo "=========================================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 22+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if Python is installed (for AI/ML microservice)
if ! command -v python3 &> /dev/null; then
    echo "⚠️  Python 3 not found. AI/ML features will be limited."
else
    echo "✅ Python $(python3 --version) detected"
fi

# Check if MongoDB connection string is set
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file from template..."
    cat > .env << EOF
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/blush-marketing

# API Keys (to be configured in Settings UI)
# APP_STORE_CONNECT_KEY_ID=
# APP_STORE_CONNECT_ISSUER_ID=
# APP_STORE_CONNECT_PRIVATE_KEY_PATH=
# APPLE_SEARCH_ADS_CLIENT_ID=
# APPLE_SEARCH_ADS_CLIENT_SECRET=
# TIKTOK_APP_KEY=
# TIKTOK_APP_SECRET=
# GOOGLE_ANALYTICS_VIEW_ID=
# GOOGLE_ANALYTICS_CREDENTIALS=
# FAL_AI_API_KEY=
# RUNPOD_API_KEY=
# RUNPOD_API_ENDPOINT=
# GLM47_API_KEY=
# GLM47_API_ENDPOINT=

# Server Configuration
PORT=3001
NODE_ENV=development

# Budget Settings
MONTHLY_BUDGET_LIMIT=1000
BUDGET_WARNING_THRESHOLD=0.70
BUDGET_CRITICAL_THRESHOLD=0.90

# Content Generation
CONTENT_GENERATION_SCHEDULE=0 6 * * *
POSTING_SCHEDULE=0 */4 * * *

# Storage
STORAGE_PATH=./storage
EOF
    echo "✅ .env file created"
    echo "⚠️  Please configure your API keys in .env or through the Settings UI"
else
    echo "✅ .env file already exists"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
if [ -f package.json ]; then
    npm install
    echo "✅ Dependencies installed"
else
    echo "❌ package.json not found. Please run this from the project root."
    exit 1
fi

# Create storage directories
echo ""
echo "📁 Creating storage directories..."
mkdir -p storage/videos
mkdir -p storage/images
mkdir -p storage/audio
mkdir -p storage/temp
mkdir -p logs
echo "✅ Storage directories created"

# Check Docker availability
echo ""
if command -v docker &> /dev/null; then
    echo "✅ Docker detected - containerized development available"
    echo "   Run 'docker-compose up' to start services in containers"
else
    echo "⚠️  Docker not detected. Some features may require manual setup."
fi

# Start instructions
echo ""
echo "=========================================================="
echo "✅ Setup Complete!"
echo ""
echo "🚀 To start the development environment:"
echo ""
echo "   Option 1: Start directly with Node.js"
echo "   npm run dev"
echo ""
echo "   Option 2: Start with Docker (if available)"
echo "   docker-compose up"
echo ""
echo "📱 Access the application:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:3001"
echo "   API Docs: http://localhost:3001/api-docs"
echo ""
echo "📖 First time setup:"
echo "   1. Open http://localhost:5173 in your browser"
echo "   2. Navigate to Settings to configure API keys"
echo "   3. Run initial content generation from Dashboard"
echo ""
echo "📚 Documentation:"
echo "   README.md - Project overview and setup guide"
echo "   docs/ - Detailed documentation"
echo ""
echo "=========================================================="
