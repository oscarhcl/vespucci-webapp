#!/usr/bin/env python3
"""Test script for the news heatmap API."""

import asyncio
import sys
import os
from pathlib import Path

# Add the backend src directory to Python path
backend_src = Path(__file__).parent / "src"
sys.path.insert(0, str(backend_src))

from dotenv import load_dotenv
from webapi.services.news_service import NewsService
from webapi.services.heatmap_service import HeatmapService

async def test_news_api():
    """Test the news API functionality."""
    print("🧪 Testing News Heatmap API...")
    
    # Load environment variables
    load_dotenv()
    
    # Check API key
    api_key = os.getenv("MARKETAUX_API_KEY")
    if not api_key:
        print("❌ MARKETAUX_API_KEY not found in environment variables")
        print("   Please add it to your .env file")
        return False
    
    print("✅ API key found")
    
    try:
        # Test news service
        print("\n📰 Testing News Service...")
        news_service = NewsService()
        
        # Get API usage info
        usage_info = news_service.get_api_usage_info()
        print(f"   Daily queries used: {usage_info['daily_queries_used']}/{usage_info['daily_queries_limit']}")
        print(f"   Queries remaining: {usage_info['queries_remaining']}")
        
        if usage_info['queries_remaining'] <= 0:
            print("⚠️  Daily API limit reached, will use cached data if available")
        
        # Test fetching news (with small limit to save API calls)
        print("\n📡 Fetching news data...")
        articles = await news_service.get_news_data(limit=5)
        print(f"   ✅ Fetched {len(articles)} articles")
        
        if articles:
            print(f"   Sample article: {articles[0].title[:50]}...")
        
        # Test heatmap service
        print("\n🗺️  Testing Heatmap Service...")
        heatmap_service = HeatmapService()
        
        # Get available sectors
        sectors = heatmap_service.get_available_sectors()
        print(f"   Available sectors: {', '.join(sectors)}")
        
        # Generate heatmap
        if articles:
            print("\n📊 Generating heatmap...")
            heatmap_data = await heatmap_service.generate_heatmap(articles)
            print(f"   ✅ Generated heatmap with {len(heatmap_data['heatmap_data'])} sectors")
            
            if heatmap_data['heatmap_data']:
                top_sector = heatmap_data['heatmap_data'][0]
                print(f"   Top sector: {top_sector['sector']} ({top_sector['count']} articles)")
        
        print("\n✅ All tests passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_news_api())
    sys.exit(0 if success else 1) 