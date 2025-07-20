"""Data models for news analysis and heatmap generation."""

from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum

class SentimentType(str, Enum):
    """Sentiment types for news articles."""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"

class NewsArticle(BaseModel):
    """Model for a news article."""
    id: str
    title: str
    description: str
    url: str
    published_at: str
    source: str
    sentiment: Optional[SentimentType] = None
    relevance_score: Optional[float] = None
    entities: List[Dict[str, Any]] = Field(default_factory=list)
    sector: Optional[str] = None
    sector_confidence: Optional[float] = None

class SectorHeatmapData(BaseModel):
    """Model for sector heatmap data."""
    sector: str
    count: int
    sentiment_score: float  # -1 to 1 scale
    volume_score: float  # 0 to 1 scale
    relevance_score: float  # 0 to 1 scale
    articles: List[str] = Field(default_factory=list)  # Article IDs
    keywords: List[str] = Field(default_factory=list)

class NewsHeatmapResponse(BaseModel):
    """Response model for news heatmap data."""
    success: bool
    heatmap_data: Dict[str, Any]
    total_articles: int
    sectors_analyzed: List[str]
    last_updated: Optional[datetime] = None
    error_message: Optional[str] = None

class NewsAnalysisRequest(BaseModel):
    """Request model for news analysis."""
    sectors: Optional[List[str]] = None
    limit: int = Field(default=50, ge=1, le=100)
    include_sentiment: bool = True
    include_entities: bool = True 