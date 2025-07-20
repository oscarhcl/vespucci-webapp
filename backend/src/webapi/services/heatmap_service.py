"""Service for analyzing news data and generating sector heatmaps."""

import re
import logging
from typing import List, Dict, Any, Optional
from collections import defaultdict, Counter
import asyncio
from datetime import datetime

from ..models.news_models import NewsArticle, SectorHeatmapData, SentimentType

logger = logging.getLogger(__name__)

class HeatmapService:
    """Service for generating sector-based news heatmaps."""
    
    def __init__(self):
        # Define sector keywords for classification
        self.sector_keywords = {
            "Technology": [
                "tech", "software", "ai", "artificial intelligence", "machine learning", "cloud", "cybersecurity",
                "semiconductor", "chip", "digital", "platform", "app", "mobile", "internet", "social media",
                "blockchain", "crypto", "bitcoin", "ethereum", "web3", "metaverse", "vr", "ar", "iot"
            ],
            "Healthcare": [
                "healthcare", "medical", "pharmaceutical", "biotech", "drug", "treatment", "therapy", "vaccine",
                "hospital", "clinic", "diagnostic", "device", "fda", "clinical trial", "patient", "doctor",
                "insurance", "medicare", "medicaid", "telemedicine", "digital health"
            ],
            "Finance": [
                "bank", "financial", "investment", "trading", "stock", "market", "fund", "etf", "bond",
                "credit", "loan", "mortgage", "insurance", "payment", "fintech", "cryptocurrency",
                "blockchain", "digital currency", "crypto", "bitcoin", "ethereum", "defi", "nft"
            ],
            "Energy": [
                "energy", "oil", "gas", "renewable", "solar", "wind", "nuclear", "electric", "utility",
                "petroleum", "refinery", "drilling", "exploration", "green energy", "clean energy",
                "carbon", "emission", "climate", "environmental", "battery", "ev", "electric vehicle"
            ],
            "Consumer": [
                "retail", "consumer", "e-commerce", "amazon", "walmart", "target", "shopping", "brand",
                "product", "fashion", "apparel", "food", "beverage", "restaurant", "hotel", "travel",
                "entertainment", "media", "streaming", "netflix", "disney", "gaming"
            ],
            "Industrial": [
                "industrial", "manufacturing", "automotive", "aerospace", "defense", "construction",
                "materials", "steel", "aluminum", "chemical", "machinery", "equipment", "logistics",
                "supply chain", "transportation", "shipping", "railroad", "airline"
            ],
            "Real Estate": [
                "real estate", "property", "housing", "commercial", "residential", "reit", "mortgage",
                "construction", "development", "leasing", "rental", "apartment", "office", "retail space"
            ],
            "Communications": [
                "telecom", "communication", "wireless", "5g", "internet", "broadband", "cable",
                "satellite", "network", "infrastructure", "at&t", "verizon", "t-mobile", "sprint"
            ]
        }
        
        # Sentiment scoring weights
        self.sentiment_weights = {
            SentimentType.POSITIVE: 1.0,
            SentimentType.NEUTRAL: 0.0,
            SentimentType.NEGATIVE: -1.0
        }
    
    def _classify_article_sector(self, article: NewsArticle) -> tuple[str, float]:
        """
        Classify an article into a sector based on its content.
        
        Returns:
            Tuple of (sector_name, confidence_score)
        """
        text = f"{article.title} {article.description}".lower()
        
        sector_scores = defaultdict(float)
        
        for sector, keywords in self.sector_keywords.items():
            score = 0.0
            for keyword in keywords:
                # Count keyword occurrences
                count = text.count(keyword.lower())
                if count > 0:
                    # Weight by keyword importance and frequency
                    score += count * 1.0
                    
                    # Bonus for title matches
                    if keyword.lower() in article.title.lower():
                        score += 2.0
            
            sector_scores[sector] = score
        
        # Find the sector with highest score
        if not sector_scores:
            return "Other", 0.0
        
        best_sector = max(sector_scores.items(), key=lambda x: x[1])
        
        # Normalize confidence score (0-1)
        total_score = sum(sector_scores.values())
        confidence = best_sector[1] / total_score if total_score > 0 else 0.0
        
        return best_sector[0], min(confidence, 1.0)
    
    def _extract_keywords(self, articles: List[NewsArticle], sector: str) -> List[str]:
        """Extract common keywords from articles in a sector."""
        all_text = " ".join([
            f"{article.title} {article.description}" 
            for article in articles 
            if self._classify_article_sector(article)[0] == sector
        ]).lower()
        
        # Remove common stop words
        stop_words = {
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
            "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
            "will", "would", "could", "should", "may", "might", "can", "this", "that", "these", "those",
            "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them"
        }
        
        # Extract words and filter
        words = re.findall(r'\b[a-z]{3,}\b', all_text)
        words = [word for word in words if word not in stop_words]
        
        # Count and return top keywords
        word_counts = Counter(words)
        return [word for word, count in word_counts.most_common(10)]
    
    def _calculate_sentiment_score(self, articles: List[NewsArticle]) -> float:
        """Calculate average sentiment score for articles (-1 to 1)."""
        if not articles:
            return 0.0
        
        total_score = 0.0
        valid_articles = 0
        
        for article in articles:
            if article.sentiment:
                total_score += self.sentiment_weights.get(article.sentiment, 0.0)
                valid_articles += 1
        
        return total_score / valid_articles if valid_articles > 0 else 0.0
    
    def _calculate_volume_score(self, articles: List[NewsArticle], total_articles: int) -> float:
        """Calculate volume score based on article count (0 to 1)."""
        if total_articles == 0:
            return 0.0
        return min(len(articles) / total_articles, 1.0)
    
    def _calculate_relevance_score(self, articles: List[NewsArticle]) -> float:
        """Calculate average relevance score for articles (0 to 1)."""
        if not articles:
            return 0.0
        
        total_relevance = 0.0
        valid_articles = 0
        
        for article in articles:
            if article.relevance_score is not None:
                total_relevance += article.relevance_score
                valid_articles += 1
        
        return total_relevance / valid_articles if valid_articles > 0 else 0.0
    
    async def generate_heatmap(
        self, 
        articles: List[NewsArticle], 
        sectors: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate a sector-based heatmap from news articles.
        
        Args:
            articles: List of news articles to analyze
            sectors: Optional list of sectors to focus on
        
        Returns:
            Dictionary containing heatmap data
        """
        logger.info(f"Generating heatmap for {len(articles)} articles")
        
        # Classify articles by sector
        sector_articles = defaultdict(list)
        sector_confidences = defaultdict(list)
        
        for article in articles:
            sector, confidence = self._classify_article_sector(article)
            
            # Filter by requested sectors if specified
            if sectors and sector not in sectors:
                continue
            
            sector_articles[sector].append(article)
            sector_confidences[sector].append(confidence)
        
        # Generate heatmap data for each sector
        heatmap_data = []
        total_articles = len(articles)
        
        for sector, sector_article_list in sector_articles.items():
            if not sector_article_list:
                continue
            
            # Calculate metrics
            sentiment_score = self._calculate_sentiment_score(sector_article_list)
            volume_score = self._calculate_volume_score(sector_article_list, total_articles)
            relevance_score = self._calculate_relevance_score(sector_article_list)
            
            # Extract keywords
            keywords = self._extract_keywords(sector_article_list, sector)
            
            # Calculate average confidence
            avg_confidence = sum(sector_confidences[sector]) / len(sector_confidences[sector])
            
            heatmap_data.append({
                "sector": sector,
                "count": len(sector_article_list),
                "sentiment_score": round(sentiment_score, 3),
                "volume_score": round(volume_score, 3),
                "relevance_score": round(relevance_score, 3),
                "confidence": round(avg_confidence, 3),
                "articles": [article.id for article in sector_article_list],
                "keywords": keywords,
                "color_intensity": self._calculate_color_intensity(sentiment_score, volume_score, relevance_score)
            })
        
        # Sort by volume score (most active sectors first)
        heatmap_data.sort(key=lambda x: x["volume_score"], reverse=True)
        
        return {
            "sectors": [item["sector"] for item in heatmap_data],
            "heatmap_data": heatmap_data,
            "total_articles": total_articles,
            "generated_at": datetime.now().isoformat(),
            "summary": self._generate_summary(heatmap_data)
        }
    
    def _calculate_color_intensity(self, sentiment: float, volume: float, relevance: float) -> float:
        """Calculate color intensity for heatmap visualization (0 to 1)."""
        # Weight the factors: volume (40%), relevance (30%), sentiment magnitude (30%)
        sentiment_magnitude = abs(sentiment)
        intensity = (volume * 0.4) + (relevance * 0.3) + (sentiment_magnitude * 0.3)
        return min(intensity, 1.0)
    
    def _generate_summary(self, heatmap_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate a summary of the heatmap data."""
        if not heatmap_data:
            return {"message": "No sector data available"}
        
        # Find most active sector
        most_active = max(heatmap_data, key=lambda x: x["volume_score"])
        
        # Find most positive and negative sectors
        positive_sectors = [s for s in heatmap_data if s["sentiment_score"] > 0.1]
        negative_sectors = [s for s in heatmap_data if s["sentiment_score"] < -0.1]
        
        most_positive = max(positive_sectors, key=lambda x: x["sentiment_score"]) if positive_sectors else None
        most_negative = min(negative_sectors, key=lambda x: x["sentiment_score"]) if negative_sectors else None
        
        return {
            "most_active_sector": most_active["sector"],
            "most_positive_sector": most_positive["sector"] if most_positive else None,
            "most_negative_sector": most_negative["sector"] if most_negative else None,
            "total_sectors": len(heatmap_data),
            "average_sentiment": sum(s["sentiment_score"] for s in heatmap_data) / len(heatmap_data)
        }
    
    def get_available_sectors(self) -> List[str]:
        """Get list of available sectors for analysis."""
        return list(self.sector_keywords.keys()) 