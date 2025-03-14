'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, SendIcon, DownloadIcon, HomeIcon, MoonIcon, SunIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { translations } from '@/lib/translations';
import { jsPDF } from 'jspdf';
import { useTheme } from 'next-themes';
import Cookies from 'js-cookie';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

interface ChatInterfaceProps {
  initialMessage: string;
  language: 'en' | 'ar';
  onRestart: () => void;
}

export default function ChatInterface({ initialMessage, language }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [weddingDate, setWeddingDate] = useState<Date>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [model, setModel] = useState<'groq' | 'gemini'>('groq'); // Default to gemini
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const t = translations[language];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!hasInitialized) {
      setMessages([{
        role: 'user',
        content: initialMessage,
        timestamp: new Date(),
      }]);
      setHasInitialized(true);
    }
  }, [initialMessage, hasInitialized]);

  useEffect(() => {
    document.title = t.title;
  }, [language, t.title]);

  useEffect(() => {
    const sendInitialResponse = async () => {
      if (messages.length === 1 && !isProcessing) {
        setIsProcessing(true);
        
        // Add system message with wedding date if available
        const systemMessages: Message[] = [];
        if (weddingDate) {
          systemMessages.push({
            role: 'system',
            content: `The user's wedding date is ${format(weddingDate, 'PPP', { locale: language === 'ar' ? ar : enUS })}. Provide wedding planning advice appropriate for this timeline.`,
          });
        }
        
        await sendMessageToAPI([...systemMessages, ...messages]);
        setIsProcessing(false);
      }
    };
    sendInitialResponse();
  }, [messages, weddingDate]);

  const sendMessageToAPI = async (messagesToSend: Message[]) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesToSend.map(({ timestamp, ...rest }) => rest), // excluding the timestamps
          model,
        }),
      });

      if (!response.ok) {
        const resetTime = response.headers.get('X-RateLimit-Reset');
        const errorMessage = response.status === 429 
          ? `${t.errors.rateLimitExceeded} ${t.errors.tryAfter} ${format(new Date(Number(resetTime)), 'PPP pp', { locale: language === 'ar' ? ar : enUS })}`
          : t.errors.generalError;
        
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      let botMessage = '';
      
      // Add a new message from the assistant
      const botMessageObj: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, botMessageObj]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.text || '';
              if (content) {
                botMessage += content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = botMessage;
                  return newMessages;
                });
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message to API:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
      }]);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || isProcessing) return;

    setIsProcessing(true);
    const userMessage: Message = {
      role: 'user',
      content: newMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');

    // Add system message with wedding date if available
    const systemMessages: Message[] = [];
    if (weddingDate) {
      systemMessages.push({
        role: 'system',
        content: `The user's wedding date is ${format(weddingDate, 'PPP', { locale: language === 'ar' ? ar : enUS })}. Provide wedding planning advice appropriate for this timeline.`,
      });
    }

    await sendMessageToAPI([...systemMessages, ...messages, userMessage]);
    setIsProcessing(false);
  };

  const handleDateSelect = async (newDate: Date | undefined) => {
    if (!newDate) return;
    setWeddingDate(newDate);
    setIsCalendarOpen(false);
    
    const dateMessage: Message = {
      role: 'user',
      content: `My wedding date is ${format(newDate, 'PPP', { locale: language === 'ar' ? ar : enUS })}`,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, dateMessage]);

    setIsProcessing(true);
    
    // Add system message with wedding date
    const systemMessages: Message[] = [{
      role: 'system',
      content: `The user's wedding date is ${format(newDate, 'PPP', { locale: language === 'ar' ? ar : enUS })}. Provide wedding planning advice appropriate for this timeline.`,
    }];

    await sendMessageToAPI([...systemMessages, ...messages, dateMessage]);
    setIsProcessing(false);
  };

  const handleThemeChange = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    Cookies.set('theme', newTheme, { expires: 365 });
  };

  const downloadChat = () => {
    const doc = new jsPDF();
    const dateStr = format(new Date(), 'yyyy-MM-dd HH:mm');
    const title = t.title;
    
    doc.setFont('helvetica');
    doc.text(`${title} - ${dateStr}`, 20, 20);
    
    if (weddingDate) {
      const weddingDateStr = format(weddingDate, 'PPP', { locale: language === 'ar' ? ar : enUS });
      doc.text(`${t.chat.weddingDate}: ${weddingDateStr}`, 20, 30);
    }
    
    let y = 40;
    messages.forEach((msg) => {
      const prefix = msg.role === 'user' ? `${t.chat.you}: ` : `${t.chat.bot}: `;
      const text = `${prefix}${msg.content}`;
      
      const lines = doc.splitTextToSize(text, 170);
      doc.text(lines, 20, y);
      y += 10 * lines.length;
      
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
    
    doc.save('gawwezni-chat.pdf');
  };

  return (
    <div className="flex flex-col h-screen max-h-screen p-4">
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent('restart'))} className="gap-2">
            <HomeIcon className="h-5 w-5" />
            {t.actions.restart}
          </Button>
          <Button variant="ghost" onClick={handleThemeChange} className="gap-2">
            {theme === 'dark' ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <MoonIcon className="h-5 w-5" />
            )}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={model === 'groq' ? 'default' : 'outline'} 
            onClick={() => setModel('groq')} 
            size="sm"
          >
            Groq
          </Button>
          <Button 
            variant={model === 'gemini' ? 'default' : 'outline'} 
            onClick={() => setModel('gemini')} 
            size="sm"
          >
            Gemini
          </Button>
          <Button variant="outline" onClick={downloadChat} className="gap-2">
            <DownloadIcon className="h-5 w-5" />
            {t.actions.download}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 rounded-lg border" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({node, ...props}) => <p dir={language === 'ar' ? 'rtl' : 'ltr'} {...props} />,
                    h1: ({node, ...props}) => <h1 dir={language === 'ar' ? 'rtl' : 'ltr'} {...props} className='text-xl font-bold mt-4' />,
                    ul: ({node, ...props}) => <ul dir={language === 'ar' ? 'rtl' : 'ltr'} {...props} className='list-disc pl-6' />,
                    li: ({node, ...props}) => <li dir={language === 'ar' ? 'rtl' : 'ltr'} {...props} className='my-1' />,
                    ol: ({node,...props}) => <ol dir={language === 'ar'? 'rtl' : 'ltr'} {...props} className='list-decimal pl-6' />,
                    em: ({node,...props}) => <em {...props} className='italic' />,
                    strong: ({node, ...props}) => <strong {...props} className='font-semibold' />,
                    code: ({node, ...props}) => <code {...props} className='bg-muted px-1 rounded' />
                  }}
                >
                  {message.content}
                </ReactMarkdown>
                <span className="text-xs opacity-70 mt-2 block">
                  {message.timestamp && format(message.timestamp, 'HH:mm', { 
                    locale: language === 'ar' ? ar : enUS 
                  })}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="mt-4 flex gap-2 px-2">
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              title={t.actions.selectDate}
              className={weddingDate ? 'bg-primary text-primary-foreground' : ''}
            >
              <CalendarIcon className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={weddingDate}
              onSelect={handleDateSelect}
              locale={language === 'ar' ? ar : enUS}
              className="rounded-md border"
              disabled={(date) => date < new Date()}
            />
          </PopoverContent>
        </Popover>

        <Textarea
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          placeholder={t.input.message}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        <Button 
          size="icon" 
          onClick={handleSend} 
          disabled={!newMessage.trim() || isProcessing}
        >
          <SendIcon className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}