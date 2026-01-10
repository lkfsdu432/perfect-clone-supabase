import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Terminal, ChevronRight } from 'lucide-react';

interface News {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export const NewsSection = () => {
  const [news, setNews] = useState<News[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    const { data } = await supabase
      .from('news')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data && data.length > 0) {
      setNews(data);
    }
  };

  // Typing effect
  useEffect(() => {
    if (news.length === 0) return;

    const currentNews = news[currentIndex];
    const fullText = `${currentNews.title}: ${currentNews.content}`;
    let charIndex = 0;
    setIsTyping(true);
    setDisplayedText('');

    const typeInterval = setInterval(() => {
      if (charIndex < fullText.length) {
        setDisplayedText(fullText.slice(0, charIndex + 1));
        charIndex++;
      } else {
        setIsTyping(false);
        clearInterval(typeInterval);
        
        // Wait and move to next news
        setTimeout(() => {
          setCurrentIndex((prev) => (prev + 1) % news.length);
        }, 4000);
      }
    }, 30);

    return () => clearInterval(typeInterval);
  }, [currentIndex, news]);

  if (news.length === 0) return null;

  return (
    <div className="w-full mt-6">
      <div className="relative bg-black/80 border border-primary/30 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-b border-primary/20">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono text-primary uppercase tracking-wider">
            [ SYSTEM::NEWS ]
          </span>
          <div className="flex-1" />
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500/80" />
            <span className="w-2 h-2 rounded-full bg-yellow-500/80" />
            <span className="w-2 h-2 rounded-full bg-green-500/80" />
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 min-h-[60px] flex items-center">
          <ChevronRight className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
          <div className="font-mono text-sm text-primary/90 flex-1">
            <span>{displayedText}</span>
            {isTyping && (
              <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
            )}
          </div>
        </div>

        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent animate-scanline" />
        </div>

        {/* Indicators */}
        {news.length > 1 && (
          <div className="flex justify-center gap-1.5 pb-2">
            {news.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === currentIndex
                    ? 'bg-primary w-4'
                    : 'bg-primary/30 hover:bg-primary/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsSection;