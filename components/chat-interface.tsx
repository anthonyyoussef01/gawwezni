'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, SendIcon, DownloadIcon, HomeIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { translations } from '@/lib/translations';
import { jsPDF } from 'jspdf';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatInterfaceProps {
  initialMessage: string;
  language: 'en' | 'ar';
  onRestart: () => void;
}

const getBotResponse = async (message: string, language: string, weddingDate?: Date, isDateChange: boolean = false): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  const t = translations[language as keyof typeof translations].chat;
  
  if (isDateChange) {
    return t.dateChanged;
  }

  if (!weddingDate) {
    return t.datePrompt;
  }

  const monthsUntilWedding = Math.ceil(
    (weddingDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  if (monthsUntilWedding < 0) {
    return t.invalidDate;
  }

  if (monthsUntilWedding > 12) {
    return t.longTermPlanning(monthsUntilWedding);
  } else if (monthsUntilWedding > 6) {
    return t.midTermPlanning;
  } else {
    return t.shortTermPlanning;
  }
};

export default function ChatInterface({ initialMessage, language, onRestart }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [weddingDate, setWeddingDate] = useState<Date>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
        text: initialMessage,
        isUser: true,
        timestamp: new Date(),
      }]);
      setHasInitialized(true);
    }
  }, [initialMessage, hasInitialized]);

  useEffect(() => {
    const sendInitialResponse = async () => {
      if (messages.length === 1 && !isProcessing) {
        setIsProcessing(true);
        const response = await getBotResponse(initialMessage, language, weddingDate);
        setMessages(prev => [...prev, {
          text: response,
          isUser: false,
          timestamp: new Date()
        }]);
        setIsProcessing(false);
      }
    };
    sendInitialResponse();
  }, [messages, initialMessage, language, weddingDate]);

  const handleSend = async () => {
    if (!newMessage.trim() || isProcessing) return;

    setIsProcessing(true);
    const userMessage = {
      text: newMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');

    const response = await getBotResponse(newMessage, language, weddingDate);
    setMessages(prev => [...prev, {
      text: response,
      isUser: false,
      timestamp: new Date()
    }]);
    setIsProcessing(false);
  };

  const handleDateSelect = async (newDate: Date | undefined) => {
    if (!newDate) return;
    
    const isDateChange = weddingDate !== undefined;
    setWeddingDate(newDate);
    setIsCalendarOpen(false);
    
    const dateMessage = {
      text: format(newDate, 'PPP', { locale: language === 'ar' ? ar : enUS }),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, dateMessage]);

    setIsProcessing(true);
    const response = await getBotResponse('', language, newDate, isDateChange);
    setMessages(prev => [...prev, {
      text: response,
      isUser: false,
      timestamp: new Date()
    }]);

    if (isDateChange) {
      const followUpResponse = await getBotResponse('', language, newDate);
      setMessages(prev => [...prev, {
        text: followUpResponse,
        isUser: false,
        timestamp: new Date()
      }]);
    }
    
    setIsProcessing(false);
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
      const prefix = msg.isUser ? `${t.chat.you}: ` : `${t.chat.bot}: `;
      const text = `${prefix}${msg.text}`;
      
      const lines = doc.splitTextToSize(text, 170);
      doc.text(lines, 20, y);
      y += 10 * lines.length;
      
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
    
    doc.save('gawezni-chat.pdf');
  };

  return (
    <div className="flex flex-col h-screen max-h-screen p-4">
      <div className="flex justify-between items-center mb-4 px-2">
        <Button variant="ghost" onClick={onRestart} className="gap-2">
          <HomeIcon className="h-5 w-5" />
          {t.actions.restart}
        </Button>
        <Button variant="outline" onClick={downloadChat} className="gap-2">
          <DownloadIcon className="h-5 w-5" />
          {t.actions.download}
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4 rounded-lg border" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-lg ${
                  message.isUser
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p dir={language === 'ar' ? 'rtl' : 'ltr'}>{message.text}</p>
                <span className="text-xs opacity-70 mt-2 block">
                  {format(message.timestamp, 'HH:mm', { 
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
          disabled={!newMessage.trim() || isProcessing || !weddingDate}
        >
          <SendIcon className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}