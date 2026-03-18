import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Bot, User, Sparkles, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8001";

interface GlassesResult {
  id: number;
  glasses_name: string;
  brand?: string;
  frame_type: string;
  selling_price: number;
  image_path?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  glasses?: GlassesResult[];
}

interface ChatAssistantProps {
  onFilterRequest?: (filters: Record<string, any>, glasses?: any[]) => void;
}

const suggestionsEN = [
  "Show me round frames",
  "Sunglasses for women",
  "Anti blue light glasses",
  "Cheapest glasses available",
];

const suggestionsAR = [
  "أرني نظارات مستديرة",
  "نظارات شمسية للنساء",
  "نظارات ضد الضوء الأزرق",
  "أرخص نظارات متاحة",
];

const uiText = {
  en: {
    title: "Intelligent Helper",
    subtitle: "Powered by AI",
    placeholder: "Ask about glasses, styles, filters...",
    suggestions: "Suggestions",
    greeting: "Hi! I'm your eyewear assistant. Ask me anything about our glasses — I can help you find the perfect pair!",
  },
  ar: {
    title: "المساعد الذكي",
    subtitle: "مدعوم بالذكاء الاصطناعي",
    placeholder: "اسأل عن النظارات، الأنماط، الفلاتر...",
    suggestions: "اقتراحات",
    greeting: "مرحباً! أنا مساعدك للنظارات. اسألني أي شيء عن نظاراتنا — يمكنني مساعدتك في العثور على الزوج المثالي!",
  },
};

export function ChatAssistant({ onFilterRequest }: ChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load greeting when language changes
  useEffect(() => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: uiText[lang].greeting,
        timestamp: new Date(),
      },
    ]);
  }, [lang]);



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    try {
      const chatHistory = newMessages
        .filter((m) => m.id !== '1') // skip greeting
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatHistory,
          language: lang,
        }),
      });

      if (!res.ok) {
        throw new Error('AI service error');
      }

      const data = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        glasses: data.glasses || undefined,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Apply filters to the main page if returned
      if (data.filters && onFilterRequest) {
        onFilterRequest(data.filters, data.glasses);
      }
    } catch {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: lang === 'ar'
          ? '❌ عذراً، حدث خطأ. حاول مرة أخرى.'
          : '❌ Sorry, something went wrong. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const t = uiText[lang];
  const suggestions = lang === 'ar' ? suggestionsAR : suggestionsEN;

  return (
    <>
      {/* Chat toggle button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-glow flex items-center justify-center transition-all hover:scale-105',
          isOpen && 'hidden'
        )}
        title="Intelligent Helper"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat panel */}
      <div
        className={cn(
          'fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] transition-all duration-300 transform',
          isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
        )}
      >
        <div className="glass-panel rounded-3xl overflow-hidden shadow-xl flex flex-col h-[500px] max-h-[70vh]">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/5 to-accent/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-sm">{t.title}</h3>
                <p className="text-xs text-muted-foreground">{t.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Language toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
                title={lang === 'en' ? 'Switch to Arabic' : 'التبديل للإنجليزية'}
                className="relative"
              >
                <Globe className="w-4 h-4" />
                <span className="absolute -bottom-0.5 -right-0.5 text-[9px] font-bold bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
                  {lang === 'en' ? 'ع' : 'En'}
                </span>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className={cn("flex-1 overflow-y-auto p-4 space-y-4", lang === 'ar' && 'direction-rtl')}
            style={lang === 'ar' ? { direction: 'rtl' } : undefined}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-2',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'chat-bubble whitespace-pre-line',
                    message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'
                  )}
                  style={lang === 'ar' ? { textAlign: 'right' } : undefined}
                >
                  {message.content}
                  {message.glasses && message.glasses.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.glasses.slice(0, 6).map((g) => (
                        <div key={g.id} className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-border/50">
                          {g.image_path && (
                            <img
                              src={`${API_BASE}/glasses_photos/${g.image_path}`}
                              alt={g.glasses_name}
                              className="w-12 h-12 object-cover rounded-md"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{g.glasses_name}</p>
                            <p className="text-[10px] text-muted-foreground">{g.brand} · {g.frame_type}</p>
                          </div>
                          <span className="text-xs font-semibold text-primary whitespace-nowrap">{g.selling_price} DA</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 items-center">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="chat-bubble chat-bubble-assistant">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3 h-3 text-accent" />
                <span className="text-xs text-muted-foreground">{t.suggestions}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSend(suggestion)}
                    className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-border">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
              style={lang === 'ar' ? { direction: 'rtl' } : undefined}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.placeholder}
                className="flex-1"
                style={lang === 'ar' ? { textAlign: 'right' } : undefined}
                disabled={isTyping}
              />
              <Button type="submit" size="icon" disabled={!input.trim() || isTyping}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
