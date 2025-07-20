import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink, RefreshCw, Clock, TrendingUp, AlertCircle, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  published_at: string;
  source: string;
  sentiment: string;
  relevance_score: number;
  entities: Array<{
    name: string;
    type: string;
  }>;
}

interface NewsWidgetProps {
  className?: string;
  onSendToCopilot?: (context: string) => void;
}

export const NewsWidget: React.FC<NewsWidgetProps> = ({ className, onSendToCopilot }) => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchNews = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // You'll need to add your MarketAux API key to your environment variables
      const apiKey = import.meta.env.VITE_MARKETAUX_API_KEY;
      
      if (!apiKey) {
        throw new Error('MarketAux API key not found. Please add VITE_MARKETAUX_API_KEY to your environment variables.');
      }

      const response = await fetch(
        `https://api.marketaux.com/v1/news/all?api_token=${apiKey}&language=en&limit=10&exchanges=NYSE,NASDAQ`
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        setNews(data.data);
        setLastUpdated(new Date());
      } else {
        throw new Error('Invalid response format from API');
      }
    } catch (err) {
      console.error('Error fetching news:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch news');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
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

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'negative':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'neutral':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const handleSendToCopilot = () => {
    if (!onSendToCopilot || news.length === 0) return;

    const context = `I'm currently viewing the following financial news articles. Please help me analyze these stories and provide insights:

${news.map((article, index) => `
${index + 1}. **${article.title}**
   - Source: ${article.source}
   - Published: ${formatTimeAgo(article.published_at)}
   - Sentiment: ${article.sentiment || 'N/A'}
   - Relevance Score: ${article.relevance_score ? Math.round(article.relevance_score * 100) + '%' : 'N/A'}
   - Description: ${article.description}
   ${article.entities && article.entities.length > 0 ? `- Key Entities: ${article.entities.slice(0, 3).map(e => e.name).join(', ')}` : ''}
`).join('\n')}

Please provide analysis on:
1. Key themes and trends across these articles
2. Potential market implications
3. Companies or sectors to watch
4. Any notable sentiment patterns
5. Questions I should consider about these developments`;

    onSendToCopilot(context);
  };

  if (error) {
    return (
      <Card className={cn("bg-neutral-900 border-neutral-700", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-neutral-100 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            News Widget
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={fetchNews} variant="outline" size="sm">
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
            <TrendingUp className="h-5 w-5 text-blue-400" />
            Latest News
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <div className="flex items-center gap-1 text-xs text-neutral-400">
                <Clock className="h-3 w-3" />
                {formatTimeAgo(lastUpdated.toISOString())}
              </div>
            )}
            <Button
              onClick={fetchNews}
              variant="ghost"
              size="sm"
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            {news.length > 0 && onSendToCopilot && (
              <Button
                onClick={handleSendToCopilot}
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
                title="Send news context to copilot"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Ask AI
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-neutral-800 rounded mb-2"></div>
                <div className="h-3 bg-neutral-800 rounded mb-1 w-3/4"></div>
                <div className="h-3 bg-neutral-800 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {news.map((article) => (
                <div
                  key={article.id}
                  className="p-3 bg-neutral-800 rounded-lg border border-neutral-700 hover:border-neutral-600 transition-colors cursor-pointer"
                  onClick={() => window.open(article.url, '_blank')}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-medium text-neutral-100 text-sm leading-tight line-clamp-2">
                      {article.title}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(article.url, '_blank');
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <p className="text-xs text-neutral-400 mb-3 line-clamp-2">
                    {article.description}
                  </p>
                  
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs px-2 py-1">
                        {article.source}
                      </Badge>
                      {article.sentiment && (
                        <Badge
                          variant="outline"
                          className={cn("text-xs px-2 py-1", getSentimentColor(article.sentiment))}
                        >
                          {article.sentiment}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <span>{formatTimeAgo(article.published_at)}</span>
                      {article.relevance_score && (
                        <span className={getRelevanceColor(article.relevance_score)}>
                          {Math.round(article.relevance_score * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {article.entities && article.entities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {article.entities.slice(0, 3).map((entity, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs px-1.5 py-0.5 bg-neutral-700 text-neutral-300"
                        >
                          {entity.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}; 