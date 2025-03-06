import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { toaster } from "../components/ui/toaster";

export interface Article {
  id: string;
  title: string;
  snippet: string;
  url: string;
  content?: string;
  source: string;
  publicationDatetime: string;
}

interface ArticlesContextType {
  articles: Article[];
  isLoading: boolean;
  error: string | null;
  fetchArticles: () => Promise<void>;
  newArticles: Article[] | null;
  hasNewArticles: boolean;
  loadNewArticles: () => void;
  checkForNewArticles: () => Promise<boolean>;
}

const ArticlesContext = createContext<ArticlesContextType | undefined>(undefined);

export const ArticlesProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [newArticles, setNewArticles] = useState<Article[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/articles");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setArticles(data);

      if (data.error) {
        toaster.create({
          title: "Some feeds failed to load",
          description: data.error,
          duration: 5000,
        });
      }
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch articles";
      setError(message);
      toaster.create({
        title: "Error fetching articles",
        description: message,
        duration: 10000,
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const checkForNewArticles = async () => {
    try {
      const response = await fetch("/articles");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Compare with current articles to see if there are new ones
      const currentIds = new Set(articles.map(article => article.id));
      const newOnes = data.filter((article: Article) => !currentIds.has(article.id));
      
      if (newOnes.length > 0) {
        setNewArticles(data);
        return true;
      } else {
        setNewArticles(null);
        return false;
      }
    } catch (err) {
      console.error("Error checking for new articles:", err);
      return false;
    }
  };

  const loadNewArticles = () => {
    if (newArticles) {
      setArticles(newArticles);
      setNewArticles(null);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchArticles();
  }, []);

  return (
    <ArticlesContext.Provider value={{
      articles,
      isLoading, 
      error,
      fetchArticles,
      newArticles,
      hasNewArticles: !!newArticles,
      loadNewArticles,
      checkForNewArticles
    }}>
      {children}
    </ArticlesContext.Provider>
  );
};

export const useArticles = () => {
  const context = useContext(ArticlesContext);
  if (context === undefined) {
    throw new Error('useArticles must be used within an ArticlesProvider');
  }
  return context;
};