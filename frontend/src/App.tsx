import { useStream } from "@langchain/langgraph-sdk/react";
import type { Message } from "@langchain/langgraph-sdk";
import { useState, useEffect, useRef, useCallback } from "react";
import { ProcessedEvent } from "@/components/ActivityTimeline";
import { CopilotSidebar } from "@/components/CopilotSidebar";
import { NewsWidget } from "@/components/NewsWidget";
import { NewsHeatmap } from "@/components/NewsHeatmap";
import { Button } from "@/components/ui/button";
import { Newspaper, TrendingUp, BarChart3, Settings, Home } from "lucide-react";
import { cn } from "@/lib/utils";

type PageType = 'news' | 'market' | 'charting' | 'settings';

export default function App() {
  const [processedEventsTimeline, setProcessedEventsTimeline] = useState<
    ProcessedEvent[]
  >([]);
  const [historicalActivities, setHistoricalActivities] = useState<
    Record<string, ProcessedEvent[]>
  >({});
  const [backgroundContext, setBackgroundContext] = useState<string | null>(null);
  const hasFinalizeEventOccurredRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<PageType>('news');
  const thread = useStream<{
    messages: Message[];
    initial_search_query_count: number;
    max_research_loops: number;
    reasoning_model: string;
  }>({
    apiUrl: import.meta.env.DEV
      ? "http://localhost:2024"
      : "http://localhost:8123",
    assistantId: "agent",
    messagesKey: "messages",
    onUpdateEvent: (event: any) => {
      let processedEvent: ProcessedEvent | null = null;
      if (event.generate_query) {
        processedEvent = {
          title: "Generating Search Queries",
          data: event.generate_query?.search_query?.join(", ") || "",
        };
      } else if (event.web_research) {
        const sources = event.web_research.sources_gathered || [];
        const numSources = sources.length;
        const uniqueLabels = [
          ...new Set(sources.map((s: any) => s.label).filter(Boolean)),
        ];
        const exampleLabels = uniqueLabels.slice(0, 3).join(", ");
        processedEvent = {
          title: "Web Research",
          data: `Gathered ${numSources} sources. Related to: ${
            exampleLabels || "N/A"
          }.`,
        };
      } else if (event.reflection) {
        processedEvent = {
          title: "Reflection",
          data: "Analysing Web Research Results",
        };
      } else if (event.finalize_answer) {
        processedEvent = {
          title: "Finalizing Answer",
          data: "Composing and presenting the final answer.",
        };
        hasFinalizeEventOccurredRef.current = true;
      }
      if (processedEvent) {
        setProcessedEventsTimeline((prevEvents) => [
          ...prevEvents,
          processedEvent!,
        ]);
      }
    },
    onError: (error: any) => {
      setError(error.message);
    },
  });

  useEffect(() => {
    if (
      hasFinalizeEventOccurredRef.current &&
      !thread.isLoading &&
      thread.messages.length > 0
    ) {
      const lastMessage = thread.messages[thread.messages.length - 1];
      if (lastMessage && lastMessage.type === "ai" && lastMessage.id) {
        setHistoricalActivities((prev) => ({
          ...prev,
          [lastMessage.id!]: [...processedEventsTimeline],
        }));
      }
      hasFinalizeEventOccurredRef.current = false;
    }
  }, [thread.messages, thread.isLoading, processedEventsTimeline]);

  const handleSubmit = useCallback(
    (submittedInputValue: string, effort: string, model: string) => {
      if (!submittedInputValue.trim()) return;
      setProcessedEventsTimeline([]);
      hasFinalizeEventOccurredRef.current = false;

      // Combine background context with user input
      let combinedInput = submittedInputValue;
      if (backgroundContext) {
        combinedInput = `Background Context:\n${backgroundContext}\n\nUser Query:\n${submittedInputValue}`;
      }

      // convert effort to, initial_search_query_count and max_research_loops
      // low means max 1 loop and 1 query
      // medium means max 3 loops and 3 queries
      // high means max 10 loops and 5 queries
      let initial_search_query_count = 0;
      let max_research_loops = 0;
      switch (effort) {
        case "low":
          initial_search_query_count = 1;
          max_research_loops = 1;
          break;
        case "medium":
          initial_search_query_count = 3;
          max_research_loops = 3;
          break;
        case "high":
          initial_search_query_count = 5;
          max_research_loops = 10;
          break;
      }

      const newMessages: Message[] = [
        ...(thread.messages || []),
        {
          type: "human",
          content: combinedInput,
          id: Date.now().toString(),
        },
      ];
      thread.submit({
        messages: newMessages,
        initial_search_query_count: initial_search_query_count,
        max_research_loops: max_research_loops,
        reasoning_model: model,
      });
    },
    [thread, backgroundContext]
  );

  const handleCancel = useCallback(() => {
    thread.stop();
    window.location.reload();
  }, [thread]);

  const clearBackgroundContext = useCallback(() => {
    setBackgroundContext(null);
  }, []);

  const navigationItems = [
    { id: 'news' as PageType, icon: Newspaper, label: 'News' },
    { id: 'market' as PageType, icon: TrendingUp, label: 'Market' },
    { id: 'charting' as PageType, icon: BarChart3, label: 'Charting' },
    { id: 'settings' as PageType, icon: Settings, label: 'Settings' },
  ];

  const renderPageContent = () => {
    switch (currentPage) {
      case 'news':
        return (
          <div className="flex-1 flex flex-col p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-neutral-100 mb-2">
                News Dashboard
              </h1>
              <p className="text-neutral-400">
                Stay updated with the latest news and insights. Use the copilot on the right to research specific topics.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <NewsWidget onSendToCopilot={(context) => {
                // Set the news context as background context
                setBackgroundContext(context);
              }} />
              
              <NewsHeatmap onSendToCopilot={(context) => {
                // Set the heatmap context as background context
                setBackgroundContext(context);
              }} />
            </div>
          </div>
        );
      case 'market':
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="text-center max-w-2xl">
              <h1 className="text-4xl font-bold text-neutral-100 mb-4">
                Market Analysis
              </h1>
              <p className="text-lg text-neutral-400 mb-8">
                Track market trends, analyze financial data, and get market insights.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-neutral-100 mb-2">📈 Market Trends</h3>
                  <p className="text-sm text-neutral-400">
                    Analyze current market trends and identify opportunities.
                  </p>
                </div>
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-neutral-100 mb-2">💰 Financial Data</h3>
                  <p className="text-sm text-neutral-400">
                    Access real-time financial data and market indicators.
                  </p>
                </div>
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-neutral-100 mb-2">📊 Analytics</h3>
                  <p className="text-sm text-neutral-400">
                    Advanced market analytics and predictive insights.
                  </p>
                </div>
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-neutral-100 mb-2">🔔 Alerts</h3>
                  <p className="text-sm text-neutral-400">
                    Set up market alerts and notifications for key events.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'charting':
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="text-center max-w-2xl">
              <h1 className="text-4xl font-bold text-neutral-100 mb-4">
                Charting Tools
              </h1>
              <p className="text-lg text-neutral-400 mb-8">
                Advanced charting and technical analysis tools for data visualization.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-neutral-100 mb-2">📊 Technical Charts</h3>
                  <p className="text-sm text-neutral-400">
                    Interactive charts with technical indicators and patterns.
                  </p>
                </div>
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-neutral-100 mb-2">📈 Data Visualization</h3>
                  <p className="text-sm text-neutral-400">
                    Create custom charts and visualize complex data sets.
                  </p>
                </div>
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-neutral-100 mb-2">🔍 Pattern Recognition</h3>
                  <p className="text-sm text-neutral-400">
                    AI-powered pattern recognition and trend analysis.
                  </p>
                </div>
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-neutral-100 mb-2">⚙️ Custom Indicators</h3>
                  <p className="text-sm text-neutral-400">
                    Build and customize your own technical indicators.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="text-center max-w-2xl">
              <h1 className="text-4xl font-bold text-neutral-100 mb-4">
                Settings
              </h1>
              <p className="text-lg text-neutral-400 mb-8">
                Configure your preferences, manage your account, and customize the interface.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-neutral-100 mb-2">👤 Profile</h3>
                  <p className="text-sm text-neutral-400">
                    Manage your account settings and personal information.
                  </p>
                </div>
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-neutral-100 mb-2">🎨 Appearance</h3>
                  <p className="text-sm text-neutral-400">
                    Customize themes, colors, and interface preferences.
                  </p>
                </div>
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-neutral-100 mb-2">🔔 Notifications</h3>
                  <p className="text-sm text-neutral-400">
                    Configure notification settings and alerts.
                  </p>
                </div>
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-neutral-100 mb-2">🔒 Privacy</h3>
                  <p className="text-sm text-neutral-400">
                    Manage privacy settings and data preferences.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-neutral-800 text-neutral-100 font-sans antialiased">
      {/* Left Navigation Sidebar */}
      <aside className="w-16 h-full bg-neutral-900 border-r border-neutral-700 flex flex-col items-center py-4">
        {/* App Icon */}
        <div className="mb-6">
          <img 
            src="/app/images/vespucci_icon.png" 
            alt="Vespucci Icon" 
            className="w-10 h-10 rounded-lg"
          />
        </div>
        
        <div className="flex flex-col items-center space-y-4">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-12 w-12 p-0 rounded-lg transition-all duration-200 group relative",
                  currentPage === item.id
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800"
                )}
                title={item.label}
              >
                <Icon className="h-5 w-5" />
                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-neutral-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                  {item.label}
                </div>
              </Button>
            );
          })}
        </div>
      </aside>

      {/* Main Content Area - Left Side */}
      <main className="flex-1 h-full flex flex-col">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="flex flex-col items-center justify-center gap-4">
              <h1 className="text-2xl text-red-400 font-bold">Error</h1>
              <p className="text-red-400">{JSON.stringify(error)}</p>

              <Button
                variant="destructive"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : (
          renderPageContent()
        )}
      </main>

      {/* Copilot Sidebar - Right Side */}
      <CopilotSidebar
        handleSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={thread.isLoading}
        messages={thread.messages}
        liveActivityEvents={processedEventsTimeline}
        historicalActivities={historicalActivities}
        backgroundContext={backgroundContext}
        clearBackgroundContext={clearBackgroundContext}
      />
    </div>
  );
}
