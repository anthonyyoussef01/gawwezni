'use client';

import { useState, useEffect } from 'react';
import { MoonIcon, SunIcon, HeartIcon, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTheme } from 'next-themes';
import ChatInterface from '@/components/chat-interface';
import { translations } from '@/lib/translations';
import Cookies from 'js-cookie';

export default function Home() {
  const [chatStarted, setChatStarted] = useState(false);
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false);
  const [language, setLanguage] = useState<'ar' | 'en'>(() => {
    if (typeof window !== 'undefined') {
      return (Cookies.get('language') as 'ar' | 'en') || 'ar';
    }
    return 'ar';
  });
  
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLanguageChange = () => {
    const newLanguage = language === 'ar' ? 'en' : 'ar';
    setLanguage(newLanguage);
    Cookies.set('language', newLanguage, { expires: 365 });
  };

  const handleThemeChange = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    Cookies.set('theme', newTheme, { expires: 365 });
  };

  const handleStartChat = () => {
    if (message.trim()) {
      setChatStarted(true);
    }
  };

  const handleRestart = () => {
    setChatStarted(false);
    setMessage('');
  };

  if (!mounted) {
    return null;
  }

  if (chatStarted) {
    return (
      <ChatInterface 
        initialMessage={message} 
        language={language}
        onRestart={handleRestart}
      />
    );
  }

  const t = translations[language];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLanguageChange}
        >
          <Languages className="h-6 w-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleThemeChange}
        >
          {theme === 'dark' ? (
            <SunIcon className="h-6 w-6" />
          ) : (
            <MoonIcon className="h-6 w-6" />
          )}
        </Button>
      </div>

      <div className="text-center max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-center gap-2 mb-8">
          <HeartIcon className="h-8 w-8 text-pink-500" />
          <h1 className="text-4xl font-bold">{t.title}</h1>
        </div>

        <h2 className="text-2xl font-semibold text-muted-foreground">
          {t.subtitle}
        </h2>

        <div className="space-y-4 text-lg text-muted-foreground">
          <p>{t.description}</p>
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-2 justify-center">
              {t.features.timeline}
            </span>
            <span className="flex items-center gap-2 justify-center">
              {t.features.answers}
            </span>
            <span className="flex items-center gap-2 justify-center">
              {t.features.discounts}
            </span>
          </div>
        </div>

        <div className="mt-12 w-full max-w-xl mx-auto">
          <Textarea
            dir={language === 'ar' ? 'rtl' : 'ltr'}
            placeholder={t.input.placeholder}
            className="min-h-[100px] text-lg resize-none transition-all duration-200 ease-in-out focus:min-h-[200px]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button
            className="mt-4 w-full text-lg py-6"
            onClick={handleStartChat}
            disabled={!message.trim()}
          >
            {t.input.start}
          </Button>
        </div>
      </div>
    </main>
  );
}