import React, { useState, useEffect } from "react";
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Button,
  VStack,
  Spinner,
  Container,
} from "@chakra-ui/react";
import { format, isValid } from "date-fns";
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
  sourceUrl: string;
}

const formatSnippet = (
  htmlContent: string,
  maxLength: number = 150,
): string => {
  try {
    const parser = new DOMParser();
    // Wrap in div in case the snippet is just text or inline elements
    const doc = parser.parseFromString(
      `<div>${htmlContent}</div>`,
      "text/html",
    );

    // Elements to remove before extracting text
    const elementsToRemove = [
      "script",
      "style",
      "nav",
      "header",
      "footer",
      "aside",
      "iframe",
      "noscript",
      "svg",
      "form",
      "button",
    ];
    elementsToRemove.forEach((selector) => {
      doc.body.querySelectorAll(selector).forEach((el) => el.remove());
    });

    let text = doc.body.textContent || "";
    text = text.replace(/\s+/g, " ").trim();
    if (text.length > maxLength) {
      return `${text.substring(0, maxLength)}…`;
    }

    return text;
  } catch (error) {
    console.error("Error formatting snippet using DOMParser:", error);

    // Fallback to a simpler regex method if parsing fails
    try {
      const strippedHtml = htmlContent.replace(/<[^>]*>?/gm, "");
      const cleanText = strippedHtml.replace(/\s+/g, " ").trim();

      if (cleanText.length > maxLength) {
        return `${cleanText.substring(0, maxLength)}…`;
      }
      return cleanText;
    } catch (fallbackError) {
      console.error("Error in fallback snippet formatting:", fallbackError);
      return "Snippet unavailable";
    }
  }
};

const LandingPage: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/articles");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched articles: \n", data);

      const fetchedArticles = data.articles || data || [];
      setArticles(fetchedArticles);

      if (data.error) {
        toaster.create({
          title: "Some feeds failed to load",
          description: data.error,
          duration: 5000,
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch articles";
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
  }, []);

  const handleArticleClick = async (article: Article) => {
    setSelectedArticle(article);

    try {
      // Fetch the full content
      const response = await fetch(`/article/${article.id}`);
      if (!response.ok) {
        console.error("Content-Type:", response.headers.get("Content-Type"));
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`,
        );
      }

      const data = await response.json();
      setSelectedArticle((prev) =>
        prev ? { ...prev, content: data.content } : null,
      );
    } catch (err) {
      console.error("Error fetching article content:", err);
      const message =
        err instanceof Error ? err.message : "Failed to fetch article content";
      toaster.create({
        title: "Error fetching article content",
        description: message,
        duration: 5000,
      });
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isValid(date)) {
        // Example format: Mar 30, 2025, 5:07 PM
        return format(date, "MMM d, yyyy, h:mm a");
      }
    } catch (e) {
      console.error("Error parsing date:", dateString, e);
    }
    // Fallback for invalid or unparseable dates
    return "Date unavailable";
  };

  return (
    <VStack gap={8} p={8} align="stretch">
      <Heading as="h1" size="2xl" textAlign="center">
        Cloud RSS
      </Heading>
      <Text fontSize="lg" textAlign="center">
        A fast and secure RSS/ATOM reader.
      </Text>

      {isLoading && articles.length === 0 ? (
        <VStack py={8}>
          <Spinner size="xl" />
          <Text>Loading articles...</Text>
        </VStack>
      ) : error ? (
        <VStack py={8}>
          <Text color="red.500" mb={4}>
            Error: {error}
          </Text>
          <Button onClick={fetchArticles}>Retry</Button>
        </VStack>
      ) : (
        <Container maxW="1200px" px={0}>
          <SimpleGrid columns={[1, 2, 3]} gap={6}>
            {articles && articles.length > 0 ? (
              articles.map((article) => (
                <Box
                  key={article.id}
                  textAlign="left"
                  width="100%"
                  borderWidth="1px"
                  borderRadius="lg"
                  overflow="hidden"
                  p={4}
                  _hover={{ shadow: "md", cursor: "pointer" }}
                  onClick={() => handleArticleClick(article)}
                  _focusVisible={{
                    outline: "none",
                    boxShadow: "outline",
                  }}
                >
                  <Heading as="h3" size="md" mb={2}>
                    {article.title}
                  </Heading>
                  <Text>{formatSnippet(article.snippet)}</Text>
                  <Text fontSize="sm" color="gray.500" mt={2}>
                    {" "}
                    {article.source} • {formatDate(article.publicationDatetime)}
                  </Text>
                </Box>
              ))
            ) : (
              <Text gridColumn="1 / -1" textAlign="center" py={8}>
                No articles found.
              </Text>
            )}
          </SimpleGrid>
        </Container>
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
