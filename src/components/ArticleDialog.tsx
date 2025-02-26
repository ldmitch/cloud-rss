import React from 'react';
import { VStack, Text, Heading, Link, Box } from '@chakra-ui/react';
import { DialogRoot, DialogContent, DialogHeader, DialogBody, DialogCloseTrigger, DialogBackdrop } from './ui/dialog';

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
  };
}

export const ArticleDialog: React.FC<ArticleDialogProps> = ({ isOpen, onClose, article }) => {
  const handleOpenChange = ({ open }: { open: boolean }) => {
    if (!open) onClose();
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={handleOpenChange}>
      <DialogBackdrop className="backdrop-blur-sm bg-black/30" />
      <DialogContent
        style={{
          width: '80vw',
          height: '80vh',
          maxWidth: '1000px',
          maxHeight: '80vh',
          position: 'fixed',
          left: '50%',
          top: '40%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
        }}
        className="rounded-lg overflow-hidden"
      >
        <DialogHeader className="font-semibold" style={{ flex: '0 0 auto' }}>
          <Heading as="h2" fontSize="4xl">
            {article.title}
          </Heading>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody 
          className="overflow-y-auto" 
          style={{ 
            flex: '1 1 auto',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px',
            maxHeight: 'calc(80vh - 100px)', /* Subtracting header height */
          }}
        >
          <VStack gap={4} alignItems="stretch" pb={6} width="100%">
            <Text fontSize="lg" color="gray.500">
              {article.source} • {new Date(article.publicationDatetime).toLocaleString()}
            </Text>
            <Link 
              href={article.url} 
              color="blue.500" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              View original article
            </Link>
            {article.content ? (
              <Box 
                dangerouslySetInnerHTML={{ __html: article.content }} 
                width="100%"
                className="article-content"
                style={{
                  overflow: 'hidden'
                }}
              />
            ) : (
              <Text>
                {article.snippet}
              </Text>
            )}
          </VStack>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
};