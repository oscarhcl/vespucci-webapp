# News Heatmap API Setup

This document explains how to set up and use the news heatmap feature that analyzes financial news using MarketAux API and NLP.

## Features

- **News Data Fetching**: Pulls financial news from MarketAux API with intelligent caching
- **Sector Classification**: Uses NLP to classify news articles into sectors (Technology, Healthcare, Finance, etc.)
- **Sentiment Analysis**: Analyzes sentiment scores for each sector
- **Heatmap Generation**: Creates visual heatmaps showing sector activity and sentiment
- **API Rate Limiting**: Respects MarketAux's 100 queries per day limit with smart caching

## Setup Instructions

### 1. Get MarketAux API Key

1. Visit [MarketAux](https://www.marketaux.com/)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Note: Free tier allows 100 API calls per day

### 2. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# MarketAux API Configuration
MARKETAUX_API_KEY=your_actual_api_key_here

# Web API Server Configuration
WEBAPI_HOST=0.0.0.0
WEBAPI_PORT=8001
WEBAPI_RELOAD=true
```

### 3. Install Dependencies

The required dependencies are already added to `pyproject.toml`:

- `aiohttp>=3.8.0` - For async HTTP requests
- `uvicorn[standard]>=0.20.0` - ASGI server
- `pydantic>=2.0.0` - Data validation

### 4. Run the Application

#### Option 1: Run All Services (Recommended)
```bash
make dev-all
```

This will start:
- Frontend (Vite) on http://localhost:5173
- Backend (LangGraph) on http://localhost:2024
- Web API (News Analysis) on http://localhost:8001

#### Option 2: Run Individual Services
```bash
# Frontend only
make dev-frontend

# Backend only (LangGraph)
make dev-backend

# Web API only (News Analysis)
make dev-webapi
```

## API Endpoints

### News Heatmap
- **GET** `/api/news/heatmap` - Get sector-based news heatmap
  - Query params:
    - `limit` (int): Number of articles to analyze (default: 50, max: 100)
    - `sectors` (string): Comma-separated list of sectors to focus on
    - `cache_duration` (int): Cache duration in seconds (default: 3600)

### Raw News Articles
- **GET** `/api/news/articles` - Get raw news articles
  - Query params:
    - `limit` (int): Number of articles to return (default: 20)

### Available Sectors
- **GET** `/api/news/sectors` - Get list of available sectors

## Sector Classification

The system automatically classifies news articles into the following sectors:

1. **Technology** - AI, software, cybersecurity, blockchain, etc.
2. **Healthcare** - Medical, pharmaceutical, biotech, etc.
3. **Finance** - Banking, investment, trading, fintech, etc.
4. **Energy** - Oil, gas, renewable energy, utilities, etc.
5. **Consumer** - Retail, e-commerce, entertainment, etc.
6. **Industrial** - Manufacturing, automotive, aerospace, etc.
7. **Real Estate** - Property, housing, commercial real estate, etc.
8. **Communications** - Telecom, wireless, internet infrastructure, etc.

## Heatmap Metrics

Each sector in the heatmap includes:

- **Count**: Number of articles in that sector
- **Sentiment Score**: Average sentiment (-1 to 1, where -1 is very negative, 1 is very positive)
- **Volume Score**: Percentage of total articles in that sector (0 to 1)
- **Relevance Score**: Average relevance score of articles (0 to 1)
- **Color Intensity**: Visual indicator based on activity and sentiment
- **Keywords**: Top keywords extracted from sector articles

## Caching Strategy

- **Cache Duration**: 1 hour by default
- **API Limit Respect**: Tracks daily API usage and stops at 100 calls
- **Fallback**: Returns cached data even if expired when API limit is reached
- **Smart Refresh**: Only fetches new data when cache expires

## Frontend Integration

The heatmap is displayed in the "Market" tab of the application. Users can:

1. View sector-based news heatmaps
2. See sentiment analysis for each sector
3. Identify trending sectors and keywords
4. Send heatmap analysis to the AI copilot for deeper insights

## Troubleshooting

### API Key Issues
- Ensure `MARKETAUX_API_KEY` is set in your `.env` file
- Verify the API key is valid and has remaining quota

### Port Conflicts
- The web API runs on port 8001 by default
- Change `WEBAPI_PORT` in `.env` if needed

### CORS Issues
- The API is configured to allow requests from the frontend dev server
- If you change the frontend URL, update the CORS configuration in `webapi/app.py`

### Rate Limiting
- The system automatically tracks API usage
- When the daily limit is reached, it will use cached data
- Check the API usage info endpoint for current status

## Development

### Project Structure
```
backend/src/webapi/
├── app.py              # Main FastAPI application
├── server.py           # Server startup script
├── models/
│   └── news_models.py  # Pydantic data models
└── services/
    ├── news_service.py     # MarketAux API integration
    └── heatmap_service.py  # NLP analysis and heatmap generation
```

### Adding New Sectors
To add new sectors, update the `sector_keywords` dictionary in `heatmap_service.py`.

### Customizing Analysis
Modify the sentiment weights, keyword extraction, or scoring algorithms in the respective service files. 