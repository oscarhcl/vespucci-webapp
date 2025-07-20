# 1. Backend Setup
cd backend
pip install .
cp .env.example .env
# Edit .env and add GEMINI_API_KEY

# 2. Frontend Setup  
cd ../frontend
npm install
cp .env.example .env
# Edit .env and add VITE_MARKETAUX_API_KEY (optional)

# 3. Run ALL servers (recommended)
make dev-all

# OR run servers separately:
# Terminal 1: Frontend
make dev-frontend

# Terminal 2: LangGraph Backend (AI agent)
make dev-backend

# Terminal 3: Web API (news/heatmap)
make dev-webapi