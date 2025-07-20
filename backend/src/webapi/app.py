"""FastAPI application for news analysis and heatmap generation."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from typing import Dict, List, Optional
import asyncio
import logging

from .services.news_service import NewsService
from .services.heatmap_service import HeatmapService
from .models.news_models import NewsHeatmapResponse, NewsArticle

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="News Analysis API",
    description="API for analyzing financial news and generating sector heatmaps",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=False,  # Set to False when using allow_origins=["*"]
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Initialize services
news_service = NewsService()
heatmap_service = HeatmapService()

@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "News Analysis API is running"}

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "news-analysis-api"}

@app.get("/api/news/heatmap", response_model=NewsHeatmapResponse)
async def get_news_heatmap(
    sectors: Optional[str] = None,
    limit: int = 50,
    cache_duration: int = 3600  # 1 hour cache
):
    """
    Get news heatmap data by sector.
    
    Args:
        sectors: Comma-separated list of sectors to analyze (optional)
        limit: Maximum number of news articles to fetch
        cache_duration: Cache duration in seconds
    
    Returns:
        NewsHeatmapResponse with sector analysis and heatmap data
    """
    try:
        logger.info(f"Fetching news heatmap with limit={limit}")
        
        # Parse sectors if provided
        sector_list = None
        if sectors:
            sector_list = [s.strip() for s in sectors.split(",")]
        
        # Get news data
        news_data = await news_service.get_news_data(limit=limit)
        
        if not news_data:
            raise HTTPException(status_code=404, detail="No news data available")
        
        # Generate heatmap
        heatmap_data = await heatmap_service.generate_heatmap(
            news_data, 
            sectors=sector_list
        )
        
        return NewsHeatmapResponse(
            success=True,
            heatmap_data=heatmap_data,
            total_articles=len(news_data),
            sectors_analyzed=heatmap_data.get("sectors", []),
            last_updated=news_service.get_last_updated()
        )
        
    except Exception as e:
        logger.error(f"Error generating heatmap: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating heatmap: {str(e)}")

@app.get("/api/news/articles")
async def get_news_articles(limit: int = 20):
    """
    Get raw news articles.
    
    Args:
        limit: Maximum number of articles to return
    
    Returns:
        List of news articles
    """
    try:
        articles = await news_service.get_news_data(limit=limit)
        return {"articles": articles, "count": len(articles)}
    except Exception as e:
        logger.error(f"Error fetching news articles: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching news: {str(e)}")

@app.get("/api/news/sectors")
async def get_available_sectors():
    """
    Get list of available sectors for analysis.
    
    Returns:
        List of available sectors
    """
    try:
        sectors = heatmap_service.get_available_sectors()
        return {"sectors": sectors}
    except Exception as e:
        logger.error(f"Error fetching sectors: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching sectors: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(
        "webapi.app:app",
        host="0.0.0.0",
        port=8001,  # Different port from LangGraph server
        reload=True
    ) 