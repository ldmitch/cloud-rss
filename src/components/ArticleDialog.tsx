import React, { useState, useEffect } from "react";
import {
  VStack,
  Text,
  Heading,
  Link,
  Box,
  Spinner,
  Center,
} from "@chakra-ui/react";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogCloseTrigger,
  DialogBackdrop,
} from "./ui/dialog";
import "./ArticleContent.css";

interface ArticleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  article: {
    id: string;
    title: string;
    snippet: string;
    url: string;
    content?: string;
    source: string;
    publicationDatetime: string;
    sourceUrl: string;
  };
}

export const ArticleDialog: React.FC<ArticleDialogProps> = ({
  isOpen,
  onClose,
  article,
}) => {
  const [isLoading, setIsLoading] = useState(article.content === undefined);

  // Update loading state when article content changes
  useEffect(() => {
    setIsLoading(article.content === undefined);
  }, [article.content]);

  const handleOpenChange = ({ open }: { open: boolean }) => {
    if (!open) onClose();
  };

  // Process the article content to preserve newlines and sanitize problematic elements
  const processContent = (content: string) => {
    // Handle empty content case
    if (!content || content.trim().length === 0) {
      return "<p>No content available. Please view the original article.</p>";
    }

    // Decode HTML entities (convert &lt; to <, &gt; to >, etc.)
    const decodingDiv = document.createElement("textarea");
    decodingDiv.innerHTML = content;
    content = decodingDiv.value;

    // Create a temporary container to manipulate the HTML content
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;

    // Fix any remaining problematic images that might have slipped through the backend processing
    const images = tempDiv.querySelectorAll("img");
    images.forEach((img) => {
      // Remove any position or size-related attributes that might cause rendering issues
      img.removeAttribute("width");
      img.removeAttribute("height");
      img.removeAttribute("class");
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.position = "static";
      img.style.display = "block";
      img.style.margin = "1rem 0";
    });

    // Make all links open in a new tab
    const links = tempDiv.querySelectorAll("a");
    links.forEach((link) => {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    });

    // Return the sanitized HTML
    return content.includes("<")
      ? tempDiv.innerHTML
      : content
          .split("\n\n")
          .map((paragraph) =>
            paragraph.trim().startsWith("<")
              ? paragraph
              : `<p>${paragraph}</p>`,
          )
          .join("\n");
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={handleOpenChange}>
      <DialogBackdrop className="backdrop-blur-sm bg-black/30" />
      <DialogContent
        style={{
          width: "80vw",
          height: "80vh",
          maxWidth: "1000px",
          maxHeight: "80vh",
          position: "fixed",
          left: "50%",
          top: "40%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
        }}
        className="rounded-lg overflow-hidden"
      >
        <DialogHeader className="font-semibold" style={{ flex: "0 0 auto" }}>
          <Heading as="h2" fontSize="4xl">
            {article.title}
          </Heading>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody
          className="overflow-y-auto"
          style={{
            flex: "1 1 auto",
            overflowY: "auto",
            overflowX: "hidden",
            padding: "16px",
            maxHeight: "calc(80vh - 100px)" /* Subtracting header height */,
            position:
              "relative" /* Important for containing absolute-positioned elements */,
          }}
        >
          <VStack gap={4} alignItems="stretch" pb={6} width="100%">
            <Text fontSize="lg" color="gray.500">
              {article.source} •{" "}
              {new Date(article.publicationDatetime).toLocaleString(undefined, {
                timeZoneName: "short",
              })}
            </Text>
            <Link
              href={article.url}
              color="blue.500"
              fontSize="lg"
              fontWeight="medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              View original article
            </Link>

            {isLoading ? (
              <Center py={8}>
                <VStack gap={4}>
                  <Spinner size="xl" color="blue.500" />
                  <Text>Loading article content...</Text>
                </VStack>
              </Center>
            ) : article.content ? (
              <Box
                dangerouslySetInnerHTML={{
                  __html: processContent(article.content),
                }}
                width="100%"
                className="article-content"
                position="relative"
              />
            ) : (
              <Text whiteSpace="pre-wrap">{article.snippet}</Text>
            )}
          </VStack>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
};
