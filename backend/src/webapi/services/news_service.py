"""Service for fetching and managing news data from MarketAux API."""

import os
import asyncio
import aiohttp
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import time

from ..models.news_models import NewsArticle, SentimentType

logger = logging.getLogger(__name__)

@dataclass
class NewsCache:
    """Cache for news data to respect API limits."""
    data: List[Dict[str, Any]]
    timestamp: datetime
    query_count: int = 0

class NewsService:
    """Service for fetching and managing financial news data."""
    
    def __init__(self):
        self.api_key = os.getenv("MARKETAUX_API_KEY")
        self.base_url = "https://api.marketaux.com/v1"
        self.cache: Optional[NewsCache] = None
        self.cache_duration = timedelta(hours=1)  # Cache for 1 hour
        self.max_queries_per_day = 100
        self.daily_query_count = 0
        self.last_query_reset = datetime.now().date()
        
        if not self.api_key:
            logger.warning("MARKETAUX_API_KEY not found in environment variables")
    
    def _reset_daily_count_if_needed(self):
        """Reset daily query count if it's a new day."""
        today = datetime.now().date()
        if today > self.last_query_reset:
            self.daily_query_count = 0
            self.last_query_reset = today
    
    def _is_cache_valid(self) -> bool:
        """Check if cached data is still valid."""
        if not self.cache:
            return False
        
        return (datetime.now() - self.cache.timestamp) < self.cache_duration
    
    def _can_make_api_call(self) -> bool:
        """Check if we can make an API call without exceeding limits."""
        self._reset_daily_count_if_needed()
        return self.daily_query_count < self.max_queries_per_day
    
    def get_last_updated(self) -> Optional[datetime]:
        """Get the timestamp of the last data update."""
        return self.cache.timestamp if self.cache else None
    
    async def _fetch_from_marketaux(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch news data from MarketAux API."""
        if not self.api_key:
            raise ValueError("MarketAux API key not configured")
        
        if not self._can_make_api_call():
            raise ValueError(f"Daily API limit reached ({self.max_queries_per_day} queries)")
        
        url = f"{self.base_url}/news/all"
        params = {
            "api_token": self.api_key,
            "language": "en",
            "limit": min(limit, 100),  # MarketAux max is 100
            "exchanges": "NYSE,NASDAQ",
            "filter_entities": "true",
            "sentiment": "true"
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"MarketAux API error: {response.status} - {error_text}")
                        raise Exception(f"API request failed: {response.status}")
                    
                    data = await response.json()
                    
                    if "data" not in data or not isinstance(data["data"], list):
                        raise Exception("Invalid response format from MarketAux API")
                    
                    # Increment query count
                    self.daily_query_count += 1
                    logger.info(f"MarketAux API call successful. Daily count: {self.daily_query_count}")
                    
                    return data["data"]
                    
        except aiohttp.ClientError as e:
            logger.error(f"Network error fetching news: {e}")
            raise Exception(f"Network error: {e}")
        except Exception as e:
            logger.error(f"Error fetching news from MarketAux: {e}")
            raise
    
    def _parse_news_article(self, raw_article: Dict[str, Any]) -> NewsArticle:
        """Parse raw API response into NewsArticle model."""
        # Map sentiment to enum
        sentiment = None
        if raw_article.get("sentiment"):
            sentiment_str = raw_article["sentiment"].lower()
            if sentiment_str in ["positive", "negative", "neutral"]:
                sentiment = SentimentType(sentiment_str)
        
        # Parse entities
        entities = []
        if raw_article.get("entities"):
            for entity in raw_article["entities"]:
                entities.append({
                    "name": entity.get("name", ""),
                    "type": entity.get("type", ""),
                    "confidence": entity.get("confidence", 0.0)
                })
        
        return NewsArticle(
            id=raw_article.get("uuid", str(hash(raw_article.get("title", "")))),
            title=raw_article.get("title", ""),
            description=raw_article.get("description", ""),
            url=raw_article.get("url", ""),
            published_at=raw_article.get("published_at", ""),
            source=raw_article.get("source", ""),
            sentiment=sentiment,
            relevance_score=raw_article.get("relevance_score"),
            entities=entities
        )
    
    async def get_news_data(self, limit: int = 50, force_refresh: bool = False) -> List[NewsArticle]:
        """
        Get news data, using cache if available and valid.
        
        Args:
            limit: Maximum number of articles to return
            force_refresh: Force refresh from API even if cache is valid
        
        Returns:
            List of NewsArticle objects
        """
        # Check cache first
        if not force_refresh and self._is_cache_valid():
            logger.info("Using cached news data")
            cached_articles = [self._parse_news_article(article) for article in self.cache.data[:limit]]
            return cached_articles
        
        # Fetch fresh data
        try:
            logger.info("Fetching fresh news data from MarketAux")
            raw_data = await self._fetch_from_marketaux(limit=limit)
            
            # Update cache
            self.cache = NewsCache(
                data=raw_data,
                timestamp=datetime.now(),
                query_count=self.daily_query_count
            )
            
            # Parse and return articles
            articles = [self._parse_news_article(article) for article in raw_data[:limit]]
            logger.info(f"Successfully fetched {len(articles)} news articles")
            return articles
            
        except Exception as e:
            logger.error(f"Error fetching news data: {e}")
            
            # Return cached data if available, even if expired
            if self.cache and self.cache.data:
                logger.warning("Returning expired cached data due to API error")
                cached_articles = [self._parse_news_article(article) for article in self.cache.data[:limit]]
                return cached_articles
            
            raise
    
    def get_api_usage_info(self) -> Dict[str, Any]:
        """Get information about API usage and limits."""
        self._reset_daily_count_if_needed()
        
        return {
            "daily_queries_used": self.daily_query_count,
            "daily_queries_limit": self.max_queries_per_day,
            "queries_remaining": self.max_queries_per_day - self.daily_query_count,
            "last_cache_update": self.cache.timestamp.isoformat() if self.cache else None,
            "cache_valid": self._is_cache_valid() if self.cache else False
        } 