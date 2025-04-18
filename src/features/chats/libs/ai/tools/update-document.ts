import { DataStreamWriter, tool } from 'ai';
// import { Session } from 'next-auth';
import { z } from 'zod';
import { getDocumentById } from '@/features/chats/queries';
import { documentHandlersByArtifactKind } from '@/features/chats/libs/artifacts/server';

interface UpdateDocumentProps {
  dataStream: DataStreamWriter;
}

export const updateDocument = ({dataStream }: UpdateDocumentProps) =>
  tool({
    description: 'Update a document with the given description.',
    parameters: z.object({
      id: z.string().describe('The ID of the document to update'),
      description: z
        .string()
        .describe('The description of changes that need to be made'),
    }),
    execute: async ({ id, description }) => {
      const rawDocument = await getDocumentById({ id });

      const document = rawDocument
        ? {
            ...rawDocument,
            id: rawDocument.id,
            title: rawDocument.title ?? 'Untitled Document',
            kind: rawDocument.kind as 'code' | 'text' | 'sheet' | 'task',
            content: rawDocument.content ?? '',
            userId: rawDocument.userId,
          }
        : null;

      if (!document) {
        return {
          error: 'Document not found',
        };
      }

      dataStream.writeData({
        type: 'clear',
        content: document.title,
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === document.kind,
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${document.kind}`);
      }

      await documentHandler.onUpdateDocument({
        document,
        description,
        dataStream,
        // session,
      });

      dataStream.writeData({ type: 'finish', content: '' });

      return {
        id,
        title: document.title,
        kind: document.kind,
        content: 'The document has been updated successfully.',
      };
    },
  });
