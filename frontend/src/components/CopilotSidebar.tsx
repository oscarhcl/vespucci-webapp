import { InputForm } from "./InputForm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Copy, CopyCheck, ChevronLeft, ChevronRight, X, Maximize2, Minimize2, FileText, XCircle } from "lucide-react";
import React, { useState, ReactNode, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Message } from "@langchain/langgraph-sdk";
import {
  ActivityTimeline,
  ProcessedEvent,
} from "@/components/ActivityTimeline";

// Compact markdown components for sidebar
const compactMdComponents = {
  h1: ({ className, children, ...props }: any) => (
    <h1 className={cn("text-base font-bold mt-2 mb-1", className)} {...props}>
      {children}
    </h1>
  ),
  h2: ({ className, children, ...props }: any) => (
    <h2 className={cn("text-sm font-bold mt-2 mb-1", className)} {...props}>
      {children}
    </h2>
  ),
  h3: ({ className, children, ...props }: any) => (
    <h3 className={cn("text-xs font-bold mt-1 mb-1", className)} {...props}>
      {children}
    </h3>
  ),
  p: ({ className, children, ...props }: any) => (
    <p className={cn("mb-1 leading-5 text-xs break-words", className)} {...props}>
      {children}
    </p>
  ),
  a: ({ className, children, href, ...props }: any) => (
    <Badge className="text-xs mx-0.5">
      <a
        className={cn("text-blue-400 hover:text-blue-300 text-xs", className)}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    </Badge>
  ),
  ul: ({ className, children, ...props }: any) => (
    <ul className={cn("list-disc pl-3 mb-1 text-xs", className)} {...props}>
      {children}
    </ul>
  ),
  ol: ({ className, children, ...props }: any) => (
    <ol className={cn("list-decimal pl-3 mb-1 text-xs", className)} {...props}>
      {children}
    </ol>
  ),
  li: ({ className, children, ...props }: any) => (
    <li className={cn("mb-0.5", className)} {...props}>
      {children}
    </li>
  ),
  blockquote: ({ className, children, ...props }: any) => (
    <blockquote
      className={cn(
        "border-l-2 border-neutral-600 pl-2 italic my-1 text-xs",
        className
      )}
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: ({ className, children, ...props }: any) => (
    <code
      className={cn(
        "bg-neutral-800 rounded px-1 py-0.5 font-mono text-xs",
        className
      )}
      {...props}
    >
      {children}
    </code>
  ),
  pre: ({ className, children, ...props }: any) => (
    <pre
      className={cn(
        "bg-neutral-800 p-1.5 rounded overflow-x-auto font-mono text-xs my-1 break-words",
        className
      )}
      {...props}
    >
      {children}
    </pre>
  ),
  hr: ({ className, ...props }: any) => (
    <hr className={cn("border-neutral-600 my-2", className)} {...props} />
  ),
  table: ({ className, children, ...props }: any) => (
    <div className="my-1 overflow-x-auto">
      <table className={cn("border-collapse w-full text-xs", className)} {...props}>
        {children}
      </table>
    </div>
  ),
  th: ({ className, children, ...props }: any) => (
    <th
      className={cn(
        "border border-neutral-600 px-1 py-0.5 text-left font-bold text-xs",
        className
      )}
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ className, children, ...props }: any) => (
    <td
      className={cn("border border-neutral-600 px-1 py-0.5 text-xs", className)}
      {...props}
    >
      {children}
    </td>
  ),
};

// Compact HumanMessageBubble Component
const CompactHumanMessageBubble: React.FC<{ message: Message }> = ({
  message,
}) => {
  return (
    <div className="text-white rounded-xl break-words min-h-5 bg-neutral-700 max-w-[85%] px-2 pt-1.5 rounded-br-md text-xs overflow-hidden">
      <ReactMarkdown components={compactMdComponents}>
        {typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content)}
      </ReactMarkdown>
    </div>
  );
};

// Compact AiMessageBubble Component
const CompactAiMessageBubble: React.FC<{
  message: Message;
  historicalActivity: ProcessedEvent[] | undefined;
  liveActivity: ProcessedEvent[] | undefined;
  isLastMessage: boolean;
  isOverallLoading: boolean;
  handleCopy: (text: string, messageId: string) => void;
  copiedMessageId: string | null;
}> = ({
  message,
  historicalActivity,
  liveActivity,
  isLastMessage,
  isOverallLoading,
  handleCopy,
  copiedMessageId,
}) => {
  const activityForThisBubble =
    isLastMessage && isOverallLoading ? liveActivity : historicalActivity;
  const isLiveActivityForThisBubble = isLastMessage && isOverallLoading;

  return (
    <div className="relative break-words flex flex-col max-w-[85%]">
      {activityForThisBubble && activityForThisBubble.length > 0 && (
        <div className="mb-1.5 border-b border-neutral-700 pb-1.5 text-xs">
          <ActivityTimeline
            processedEvents={activityForThisBubble}
            isLoading={isLiveActivityForThisBubble}
          />
        </div>
      )}
      <div className="bg-neutral-800 rounded-xl p-2 text-xs overflow-hidden">
        <ReactMarkdown components={compactMdComponents}>
          {typeof message.content === "string"
            ? message.content
            : JSON.stringify(message.content)}
        </ReactMarkdown>
      </div>
      <Button
        variant="default"
        size="sm"
        className={`cursor-pointer bg-neutral-700 border-neutral-600 text-neutral-300 self-end mt-1.5 text-xs h-5 px-1.5 ${
          message.content.length > 0 ? "visible" : "hidden"
        }`}
        onClick={() =>
          handleCopy(
            typeof message.content === "string"
              ? message.content
              : JSON.stringify(message.content),
            message.id!
          )
        }
      >
        {copiedMessageId === message.id ? "Copied" : "Copy"}
        {copiedMessageId === message.id ? <CopyCheck className="h-2.5 w-2.5 ml-1" /> : <Copy className="h-2.5 w-2.5 ml-1" />}
      </Button>
    </div>
  );
};

interface CopilotSidebarProps {
  handleSubmit: (
    submittedInputValue: string,
    effort: string,
    model: string
  ) => void;
  onCancel: () => void;
  isLoading: boolean;
  messages: Message[];
  liveActivityEvents: ProcessedEvent[];
  historicalActivities: Record<string, ProcessedEvent[]>;
  backgroundContext: string | null;
  clearBackgroundContext: () => void;
}

export const CopilotSidebar: React.FC<CopilotSidebarProps> = ({
  handleSubmit,
  onCancel,
  isLoading,
  messages,
  liveActivityEvents,
  historicalActivities,
  backgroundContext,
  clearBackgroundContext,
}) => {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleCopy = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const deltaX = startX - e.clientX;
    const newWidth = Math.max(280, Math.min(500, sidebarWidth + deltaX));
    setSidebarWidth(newWidth);
    setStartX(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, startX, sidebarWidth]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  if (isMinimized) {
    return (
      <div className="fixed right-0 top-1/2 transform -translate-y-1/2 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="bg-neutral-900 border border-neutral-700 text-neutral-300 hover:bg-neutral-800 p-2 rounded-l-lg"
          size="sm"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <aside 
      className={cn(
        "h-full bg-neutral-900 border-l border-neutral-700 flex flex-col transition-all duration-300 ease-in-out relative",
        isCollapsed ? "w-16" : "w-auto"
      )}
      style={{ width: isCollapsed ? 64 : sidebarWidth }}
    >
      {/* Resize Handle */}
      <div
        className={cn(
          "absolute -left-0.5 top-0 bottom-0 w-1 cursor-col-resize transition-colors z-10",
          isDragging ? "bg-blue-500" : "hover:bg-blue-500/50 bg-neutral-600/30"
        )}
        onMouseDown={handleMouseDown}
      />

      {/* Header */}
      <div className={cn(
        "p-3 border-b border-neutral-700 flex items-center justify-between",
        isCollapsed && "justify-center"
      )}>
        {!isCollapsed ? (
          <>
            <div>
              <h1 className="text-lg font-semibold text-neutral-100 mb-0.5">
                Welcome.
              </h1>
              <p className="text-xs text-neutral-400">
                How can I help you today?
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                onClick={() => setIsCollapsed(true)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-300"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button
                onClick={() => setIsMinimized(true)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-300"
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
            </div>
          </>
        ) : (
          <Button
            onClick={() => setIsCollapsed(false)}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-300"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
        )}
      </div>

      {!isCollapsed && (
        <>
          {/* Background Context Display */}
          {backgroundContext && (
            <div className="p-2 border-b border-neutral-700 bg-neutral-800/50">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3 w-3 text-blue-400" />
                  <span className="text-xs font-medium text-neutral-300">Background Context</span>
                </div>
                <Button
                  onClick={clearBackgroundContext}
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-neutral-400 hover:text-neutral-300"
                >
                  <XCircle className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs text-neutral-400 bg-neutral-900 p-1.5 rounded border border-neutral-700 max-h-20 overflow-y-auto">
                <p className="line-clamp-3">{backgroundContext}</p>
              </div>
            </div>
          )}

          {/* Chat Messages Area */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <ScrollArea className="flex-1 h-full" ref={scrollAreaRef}>
              <div className="p-2 space-y-1.5 pb-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[150px] text-center">
                    <div className="text-neutral-400">
                      <p className="text-xs">Start a conversation to begin your research.</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isLast = index === messages.length - 1;
                    return (
                      <div key={message.id || `msg-${index}`} className="space-y-1.5">
                        <div
                          className={`flex items-start gap-1.5 ${
                            message.type === "human" ? "justify-end" : ""
                          }`}
                        >
                          {message.type === "human" ? (
                            <CompactHumanMessageBubble message={message} />
                          ) : (
                            <CompactAiMessageBubble
                              message={message}
                              historicalActivity={historicalActivities[message.id!]}
                              liveActivity={liveActivityEvents}
                              isLastMessage={isLast}
                              isOverallLoading={isLoading}
                              handleCopy={handleCopy}
                              copiedMessageId={copiedMessageId}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                {isLoading &&
                  (messages.length === 0 ||
                    messages[messages.length - 1].type === "human") && (
                  <div className="flex items-start gap-1.5 mt-1.5">
                    <div className="relative group max-w-full rounded-lg p-1.5 shadow-sm break-words bg-neutral-800 text-neutral-100 rounded-bl-none w-full min-h-[32px]">
                      {liveActivityEvents.length > 0 ? (
                        <div className="text-xs">
                          <ActivityTimeline
                            processedEvents={liveActivityEvents}
                            isLoading={true}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-start h-full">
                          <Loader2 className="h-3 w-3 animate-spin text-neutral-400 mr-1.5" />
                          <span className="text-xs">Processing...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Input Form */}
          <div className="p-2 border-t border-neutral-700">
            <InputForm
              onSubmit={handleSubmit}
              isLoading={isLoading}
              onCancel={onCancel}
              hasHistory={messages.length > 0}
            />
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-neutral-700">
            <p className="text-xs text-neutral-500 text-center">
              Powered by Google Gemini and LangChain LangGraph.
            </p>
          </div>
        </>
      )}
    </aside>
  );
}; 