import React, { useState, useEffect } from "react";
import { Box, Heading, Text, SimpleGrid, Button, VStack } from "@chakra-ui/react";

interface Article {
  id: string;
  title: string;
  snippet: string;
}

const LandingPage: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    // simulate fetching articles
    const timer = setTimeout(() => {
      const fakeArticles: Article[] = [
        { id: "1", title: "Article 1", snippet: "This is a brief snippet of article 1." },
        { id: "2", title: "Article 2", snippet: "This is a brief snippet of article 2." },
        { id: "3", title: "Article 3", snippet: "This is a brief snippet of article 3." },
      ];
      setArticles(fakeArticles);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <VStack gap={8} p={8} align="stretch">
      <Heading as="h1" size="2xl" textAlign="center">Cloud RSS</Heading>
      <Text fontSize="lg" textAlign="center">Your browser-based RSS reader. Stay updated with the latest news.</Text>
      <SimpleGrid columns={[1, 2, 3]} gap={6}>
        {articles.map(article => (
          <Box key={article.id} borderWidth="1px" borderRadius="lg" overflow="hidden" p={4} _hover={{ shadow: "md" }}>
            <Heading as="h3" size="md" mb={2}>{article.title}</Heading>
            <Text>{article.snippet}</Text>
          </Box>
        ))}
      </SimpleGrid>
      <Button alignSelf="center" onClick={() => {
         // simulate loading more articles
         setArticles(prev => [
           ...prev,
           {
             id: (prev.length + 1).toString(),
             title: `Article ${prev.length + 1}`,
             snippet: `This is a brief snippet of article ${prev.length + 1}.`
           }
         ]);
      }}>
        Load More
      </Button>
    </VStack>
  );
};

export default LandingPage;
