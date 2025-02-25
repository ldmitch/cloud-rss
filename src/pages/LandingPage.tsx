import React, { useState, useEffect } from "react";
import { Box, Heading, Text, SimpleGrid, Button, VStack, Spinner } from "@chakra-ui/react";
import { ArticleDialog } from "../components/ArticleDialog";
import { toaster } from "../components/ui/toaster";

interface Article {
  id: string;
  title: string;
  snippet: string;
  url: string;
  content?: string;
  source: string;
  publicationDatetime: string;
}

const LandingPage: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/articles");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched articles: \n");
      console.log(data);
      setArticles(data);

      // Show warning if there were partial errors
      if (data.error) {
        toaster.create({
          title: "Some feeds failed to load",
          description: data.error,
          duration: 5000,
        });
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch articles";
      setError(message);
      toaster.create({
        title: "Error fetching articles",
        description: message,
        duration: 10000,
      });

    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
    const interval = setInterval(fetchArticles, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleArticleClick = async (article: Article) => {
    try {
      // First show the dialog with just the snippet
      setSelectedArticle(article);

      // Then fetch the full content
      const response = await fetch(`/article/${article.id}`);
      console.log(`Article fetch response for ${article.id}: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log('Content-Type:', response.headers.get('Content-Type'));
      
      // Try to parse the response as JSON
      const data = await response.json();
      console.log('Article data:', data);

      // Update the selected article with full content
      setSelectedArticle(prev =>
        prev ? { ...prev, content: data.content } : null
      );

    } catch (err) {
      console.error('Error fetching article:', err);
      const message = err instanceof Error ? err.message : "Failed to fetch article content";
      toaster.create({
        title: "Error fetching article content",
        description: message,
        duration: 5000,
      });
    }
  };

  return (
    <VStack gap={8} p={8} align="stretch">
      <Heading as="h1" size="2xl" textAlign="center">Cloud RSS</Heading>
      <Text fontSize="lg" textAlign="center">Your browser-based RSS reader. Stay updated with the latest news.</Text>

      {isLoading && articles.length === 0 ? (
        <VStack py={8}>
          <Spinner size="xl" />
          <Text>Loading articles...</Text>
        </VStack>
      ) : error ? (
        <VStack py={8}>
          <Text color="red.500">{error}</Text>
          <Button onClick={fetchArticles}>Retry</Button>
        </VStack>
      ) : (
        <SimpleGrid columns={[1, 2, 3]} gap={6}>
          {articles && articles.length > 0 ? (
            articles.map(article => (
              <Box
                key={article.id}
                borderWidth="1px"
                borderRadius="lg"
                overflow="hidden"
                p={4}
                _hover={{ shadow: "md", cursor: "pointer" }}
                onClick={() => handleArticleClick(article)}
              >
                <Heading as="h3" size="md" mb={2}>{article.title}</Heading>
                <Text>{article.snippet}</Text>
                <Text fontSize="sm" color="gray.500" mt={2}>
                  {article.source} • {new Date(article.publicationDatetime).toLocaleString()}
                </Text>
              </Box>
            ))
          ) : (
            <Text>No articles found.</Text>
          )}
        </SimpleGrid>
      )}

      {selectedArticle && (
        <ArticleDialog
          isOpen={!!selectedArticle}
          onClose={() => setSelectedArticle(null)}
          article={selectedArticle}
        />
      )}
    </VStack>
  );
};

export default LandingPage;
