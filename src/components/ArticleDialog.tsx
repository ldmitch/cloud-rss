import React from 'react';
import { VStack, Text } from '@chakra-ui/react';
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
      <DialogContent className="max-w-3xl mx-4 rounded-lg">
        <DialogHeader className="font-semibold">
          {article.title}
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody>
          <VStack gap={4} alignItems="stretch" pb={6}>
            <Text fontSize="sm" color="gray.500">
              {article.source} • {article.publicationDatetime}
            </Text>
            <Text>
              {article.content || article.snippet}
            </Text>
          </VStack>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
};