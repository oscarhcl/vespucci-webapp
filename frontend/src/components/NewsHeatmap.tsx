import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, RefreshCw, AlertCircle, BarChart3, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeatmapData {
  sector: string;
  count: number;
  sentiment_score: number;
  volume_score: number;
  relevance_score: number;
  confidence: number;
  articles: string[];
  keywords: string[];
  color_intensity: number;
}

interface HeatmapResponse {
  success: boolean;
  heatmap_data: {
    sectors: string[];
    heatmap_data: HeatmapData[];
    total_articles: number;
    generated_at: string;
    summary: {
      most_active_sector: string;
      most_positive_sector?: string;
      most_negative_sector?: string;
      total_sectors: number;
      average_sentiment: number;
    };
  };
  total_articles: number;
  sectors_analyzed: string[];
  last_updated?: string;
  error_message?: string;
}

interface NewsHeatmapProps {
  className?: string;
  onSendToCopilot?: (context: string) => void;
}

export const NewsHeatmap: React.FC<NewsHeatmapProps> = ({ className, onSendToCopilot }) => {
  const [heatmapData, setHeatmapData] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHeatmapData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching heatmap data from:', 'http://localhost:8001/api/news/heatmap?limit=50');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch('http://localhost:8001/api/news/heatmap?limit=50', {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data: HeatmapResponse = await response.json();
      console.log('Received data:', data);
      
      if (data.success) {
        setHeatmapData(data);
        setLastUpdated(new Date());
      } else {
        throw new Error(data.error_message || 'Failed to fetch heatmap data');
      }
    } catch (err) {
      console.error('Error fetching heatmap data:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch heatmap data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmapData();
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getSentimentColor = (score: number) => {
    if (score > 0.3) return 'text-green-400';
    if (score < -0.3) return 'text-red-400';
    return 'text-yellow-400';
  };

  const getSentimentIcon = (score: number) => {
    if (score > 0.3) return '↗️';
    if (score < -0.3) return '↘️';
    return '→';
  };

  const getIntensityColor = (intensity: number) => {
    if (intensity > 0.7) return 'bg-red-500/80';
    if (intensity > 0.5) return 'bg-orange-500/70';
    if (intensity > 0.3) return 'bg-yellow-500/60';
    return 'bg-blue-500/50';
  };

  const handleSendToCopilot = () => {
    if (!onSendToCopilot || !heatmapData) return;

    const context = `I'm analyzing a news heatmap with the following sector insights:

${heatmapData.heatmap_data.heatmap_data.map((sector, index) => `
${index + 1}. **${sector.sector}**
   - Article Count: ${sector.count}
   - Sentiment Score: ${sector.sentiment_score.toFixed(3)} ${getSentimentIcon(sector.sentiment_score)}
   - Volume Score: ${(sector.volume_score * 100).toFixed(1)}%
   - Relevance Score: ${(sector.relevance_score * 100).toFixed(1)}%
   - Top Keywords: ${sector.keywords.slice(0, 5).join(', ')}
`).join('\n')}

Summary:
- Most Active Sector: ${heatmapData.heatmap_data.summary.most_active_sector}
- Most Positive Sector: ${heatmapData.heatmap_data.summary.most_positive_sector || 'N/A'}
- Most Negative Sector: ${heatmapData.heatmap_data.summary.most_negative_sector || 'N/A'}
- Average Sentiment: ${heatmapData.heatmap_data.summary.average_sentiment.toFixed(3)}
- Total Articles Analyzed: ${heatmapData.total_articles}

Please provide analysis on:
1. Key sector trends and patterns
2. Sentiment analysis insights
3. Potential market implications
4. Investment opportunities or risks
5. Questions to consider about these sector movements`;

    onSendToCopilot(context);
  };

  if (error) {
    return (
      <Card className={cn("bg-neutral-900 border-neutral-700", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-neutral-100 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            News Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={fetchHeatmapData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-neutral-900 border-neutral-700", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-neutral-100 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-400" />
            Sector Heatmap
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <div className="flex items-center gap-1 text-xs text-neutral-400">
                <Clock className="h-3 w-3" />
                {formatTimeAgo(lastUpdated.toISOString())}
              </div>
            )}
            <Button
              onClick={fetchHeatmapData}
              variant="ghost"
              size="sm"
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            {heatmapData && onSendToCopilot && (
              <Button
                onClick={handleSendToCopilot}
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
                title="Send heatmap analysis to copilot"
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                Analyze
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-neutral-800 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : heatmapData ? (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-neutral-800 rounded-lg p-3">
                <div className="text-xs text-neutral-400">Total Articles</div>
                <div className="text-lg font-semibold text-neutral-100">
                  {heatmapData.total_articles}
                </div>
              </div>
              <div className="bg-neutral-800 rounded-lg p-3">
                <div className="text-xs text-neutral-400">Sectors</div>
                <div className="text-lg font-semibold text-neutral-100">
                  {heatmapData.heatmap_data.summary.total_sectors}
                </div>
              </div>
            </div>

            {/* Sector Heatmap */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {heatmapData.heatmap_data.heatmap_data.map((sector) => (
                  <div
                    key={sector.sector}
                    className="p-4 bg-neutral-800 rounded-lg border border-neutral-700 hover:border-neutral-600 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-neutral-100 text-sm">
                        {sector.sector}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {sector.count} articles
                        </Badge>
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          getIntensityColor(sector.color_intensity)
                        )} />
                      </div>
                    </div>
                    
                    {/* Metrics Bar */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-400">Sentiment</span>
                        <span className={cn("flex items-center gap-1", getSentimentColor(sector.sentiment_score))}>
                          {getSentimentIcon(sector.sentiment_score)}
                          {sector.sentiment_score.toFixed(3)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-400">Volume</span>
                        <span className="text-neutral-300">
                          {(sector.volume_score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-400">Relevance</span>
                        <span className="text-neutral-300">
                          {(sector.relevance_score * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Keywords */}
                    {sector.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {sector.keywords.slice(0, 5).map((keyword, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs px-1.5 py-0.5 bg-neutral-700 text-neutral-300"
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Summary */}
            <div className="mt-4 p-3 bg-neutral-800 rounded-lg">
              <div className="text-xs text-neutral-400 mb-2">Summary</div>
              <div className="text-sm text-neutral-300">
                <div className="flex items-center gap-4">
                  <span>Most Active: <span className="text-blue-400">{heatmapData.heatmap_data.summary.most_active_sector}</span></span>
                  {heatmapData.heatmap_data.summary.most_positive_sector && (
                    <span>Most Positive: <span className="text-green-400">{heatmapData.heatmap_data.summary.most_positive_sector}</span></span>
                  )}
                  {heatmapData.heatmap_data.summary.most_negative_sector && (
                    <span>Most Negative: <span className="text-red-400">{heatmapData.heatmap_data.summary.most_negative_sector}</span></span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-neutral-400">
            No heatmap data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 