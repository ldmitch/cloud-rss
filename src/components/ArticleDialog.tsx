import React, { useState, useEffect, useRef } from "react";
import {
  VStack,
  Text,
  Heading,
  Link,
  Box,
  Spinner,
  Center,
} from "@chakra-ui/react";
import { LuExternalLink } from "react-icons/lu";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogCloseTrigger,
  DialogBackdrop,
} from "./ui/dialog";
import DOMPurify from "dompurify";
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
  const [isTitleExpanded, setIsTitleExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setIsLoading(article.content === undefined);
  }, [article.content]);

  const handleOpenChange = ({ open }: { open: boolean }) => {
    if (!open) onClose();
  };

  // Check for title truncation
  useEffect(() => {
    if (isOpen && headingRef.current) {
      const header = headingRef.current;
      setIsTruncated(header.scrollHeight > header.clientHeight);
    }
    if (!isOpen) {
      setIsTruncated(false);
      setIsTitleExpanded(false);
    }
  }, [article.title, isOpen]);

  // Process, decode, and sanitize the article content
  const processContent = (content: string): string => {
    if (!content || content.trim().length === 0) {
      return "<p>No content available. Please view the original article.</p>";
    }

    // Decode potential HTML entities first
    let decodedContent: string;
    try {
      const decodingEl = document.createElement("textarea");
      decodingEl.innerHTML = content;
      decodedContent = decodingEl.value;
    } catch (error) {
      console.error("Error decoding HTML entities:", error);
      decodedContent = content;
    }

    let processedHtml: string;

    // Check if decoded content appears to contain HTML tags
    if (decodedContent.includes("<") && decodedContent.includes(">")) {
      // Process as HTML
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(decodedContent, "text/html");

        // Fix images styles
        const images = doc.body.querySelectorAll("img");
        images.forEach((img) => {
          img.removeAttribute("width");
          img.removeAttribute("height");
          img.removeAttribute("class");
          img.style.maxWidth = "100%";
          img.style.height = "auto";
          img.style.position = "static";
          img.style.display = "block";
          img.style.margin = "1rem 0";
        });

        // Make links open in a new tab
        const links = doc.body.querySelectorAll("a");
        links.forEach((link) => {
          link.setAttribute("target", "_blank");
          link.setAttribute("rel", "noopener noreferrer");
        });

        processedHtml = doc.body.innerHTML;
      } catch (error) {
        console.error("Error parsing/manipulating HTML:", error);
        processedHtml = decodedContent;
      }
    } else {
      // Process as plain text
      processedHtml = decodedContent
        .split("\n\n")
        .map((paragraph) => paragraph.trim())
        .filter((paragraph) => paragraph.length > 0)
        .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
        .join("");
    }

    // Sanitize final HTML
    let sanitizedHtml = "";
    try {
      sanitizedHtml = DOMPurify.sanitize(processedHtml, {
        ADD_ATTR: ["target", "rel"],
        USE_PROFILES: { html: true },
      });
    } catch (error) {
      console.error("Error during DOMPurify sanitization:", error);
      sanitizedHtml = "<p>Error processing content.</p>";
    }

    return sanitizedHtml;
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={handleOpenChange}>
      <DialogBackdrop className="backdrop-blur-sm bg-black/30" />
      <DialogContent className="article-dialog-content rounded-lg overflow-hidden bg-white dark:bg-gray-800">
        <DialogHeader className="article-dialog-header font-semibold p-4 border-b dark:border-gray-700">
          <Heading
            ref={headingRef}
            as="h2"
            fontSize="2xl"
            position="relative" // For potential absolute positioned children like close button
            className={`title-base ${!isTitleExpanded ? "clamped-title" : ""}`}
            style={{
              cursor: isTruncated ? "pointer" : "default",
              WebkitLineClamp: !isTitleExpanded ? 3 : "unset",
            }}
            onClick={() => isTruncated && setIsTitleExpanded(!isTitleExpanded)}
            title={
              isTruncated ? "Click to expand/collapse title" : article.title
            }
          >
            {article.title}
            {!isTitleExpanded && isTruncated && (
              <Box as="span" color="blue.500" ml={1} display="inline">
                {" "}
                ...
              </Box>
            )}
          </Heading>
          <DialogCloseTrigger className="article-dialog-close-trigger" />
        </DialogHeader>

        <DialogBody className="article-dialog-body overflow-y-auto p-4">
          <VStack gap={3} alignItems="stretch" pb={4} width="100%">
            {/* Article Metadata */}
            <Text fontSize="sm" color="gray.500">
              {article.source} •{" "}
              {new Date(article.publicationDatetime).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </Text>
            {/* Link to Original */}
            <Link
              href={article.url}
              color="blue.500"
              fontSize="sm"
              fontWeight="medium"
              target="_blank"
              rel="noopener noreferrer"
              display="inline-flex"
              alignItems="center"
            >
              View original article
              <LuExternalLink className="external-link-icon" />
            </Link>

            {isLoading ? (
              <Center py={8}>
                <VStack gap={4}>
                  <Spinner size="lg" color="blue.500" />
                  <Text>Loading article content...</Text>
                </VStack>
              </Center>
            ) : article.content ? (
              // Render sanitized HTML content
              <Box
                dangerouslySetInnerHTML={{
                  __html: processContent(article.content),
                }}
                width="100%"
                className="article-content" // Styles for content applied via this class
              />
            ) : (
              // Fallback to snippet
              <Text whiteSpace="pre-wrap">{article.snippet}</Text>
            )}
          </VStack>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
};
