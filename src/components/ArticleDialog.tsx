import React from 'react';
import { VStack, Text, Heading } from '@chakra-ui/react';
import { DialogRoot, DialogContent, DialogHeader, DialogBody, DialogCloseTrigger, DialogBackdrop } from './ui/dialog';

interface ArticleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  article: {
    title: string;
    content?: string;
    snippet?: string;
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
          maxWidth: 'none',
          position: 'fixed',
          left: '50%',
          top: '40%',
          transform: 'translate(-50%, -50%)',
        }}
        className="rounded-lg overflow-hidden"
      >
        <DialogHeader className="font-semibold">
          <Heading as="h2" fontSize="4xl">
            {article.title}
          </Heading>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody className="overflow-y-auto h-[calc(80vh-4rem)]">
          <VStack gap={4} alignItems="stretch" pb={6}>
            <Text fontSize="lg" color="gray.500">
              {article.source} • {article.publicationDatetime}
            </Text>
            <Text fontSize="base">
              {article.content || article.snippet}
            </Text>
          </VStack>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
};