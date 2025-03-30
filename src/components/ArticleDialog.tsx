import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  VStack,
  Text,
  Heading,
  Link,
  Box,
  Spinner,
  Center,
  Icon,
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

// Process, decode, and sanitize the article content
const processContent = (content: string | undefined): string => {
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
    decodedContent = content; // Fallback to original content on decoding error
  }

  let processedHtml: string;

  // Check if decoded content appears to contain HTML tags
  if (decodedContent.includes("<") && decodedContent.includes(">")) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(decodedContent, "text/html");

      const images = doc.body.querySelectorAll("img");
      images.forEach((img) => {
        img.removeAttribute("width");
        img.removeAttribute("height");
        img.removeAttribute("class");
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
      processedHtml = decodedContent; // Fallback to decoded content on parsing error
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
    sanitizedHtml = "<p>Error processing content.</p>"; // Fallback on sanitization error
  }

  return sanitizedHtml;
};

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
    // Reset title expansion when dialog closes or article changes
    setIsTitleExpanded(false);
    setIsTruncated(false);

    if (isOpen && headingRef.current) {
      const checkTruncation = () => {
        if (headingRef.current) {
          const header = headingRef.current;
          // Check scrollHeight against clientHeight for clamping detection
          setIsTruncated(header.scrollHeight > header.clientHeight);
        }
      };
      // Allow layout to settle before checking
      requestAnimationFrame(checkTruncation);
    }
  }, [article.title, isOpen]);

  const sanitizedContentHtml = useMemo(() => {
    if (isLoading || !article.content) return "";
    return processContent(article.content);
  }, [article.content, isLoading]);

  return (
    <DialogRoot open={isOpen} onOpenChange={handleOpenChange}>
      <DialogBackdrop backdropFilter="blur(3px)" bg="blackAlpha.400" />

      <DialogContent
        w={{ base: "90vw", md: "80vw" }}
        h="80vh"
        maxW="1000px"
        maxH="80vh"
        position="fixed"
        left="50%"
        top="50%"
        transform="translate(-50%, -60%)"
        display="flex"
        flexDirection="column"
        borderRadius="lg"
        overflow="hidden"
        bg="white"
        _dark={{ bg: "gray.800" }}
      >
        <DialogHeader
          fontWeight="semibold"
          p={4}
          borderBottomWidth="1px"
          borderColor="gray.200"
          _dark={{ borderColor: "gray.700" }}
          flexShrink={0}
          position="relative"
        >
          <Heading
            ref={headingRef}
            as="h2"
            fontSize="xl"
            className={`title-base ${!isTitleExpanded ? "clamped-title" : ""}`}
            css={{
              cursor: isTruncated ? "pointer" : "default",
              "--line-clamp": !isTitleExpanded ? 3 : "unset",
              WebkitLineClamp: "var(--line-clamp)",
            }}
            onClick={() => isTruncated && setIsTitleExpanded(!isTitleExpanded)}
            title={
              isTruncated ? "Click to expand/collapse title" : article.title
            }
          >
            {article.title}
            {isTruncated && !isTitleExpanded && (
              <Box as="span" color="blue.500" ml={1} display="inline">
                {" "}
                ...
              </Box>
            )}
          </Heading>
          <DialogCloseTrigger
            position="absolute"
            top="10px"
            right="10px"
            w="24px"
            h="24px"
            p={0}
            bg="none"
            border="none"
            cursor="pointer"
          />
        </DialogHeader>

        <DialogBody p={4} flexGrow={1} overflowY="auto" overflowX="hidden">
          <VStack gap={3} alignItems="stretch" pb={4} width="100%">
            <Text fontSize="sm" color="gray.500" _dark={{ color: "gray.400" }}>
              {article.source} •{" "}
              {new Date(article.publicationDatetime).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </Text>
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
              <Icon as={LuExternalLink} ml="4px" boxSize="1em" />
            </Link>

            {isLoading ? (
              <Center py={8}>
                <VStack gap={4}>
                  <Spinner size="lg" color="blue.500" />
                  <Text>Loading article content...</Text>
                </VStack>
              </Center>
            ) : article.content ? (
              <Box
                dangerouslySetInnerHTML={{ __html: sanitizedContentHtml }}
                width="100%"
                className="article-content"
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
