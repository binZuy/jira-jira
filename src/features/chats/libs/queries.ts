import { ID, Query, Models } from 'node-appwrite';
import { createSessionClient } from '@/lib/appwrite';
import {
  DATABASE_ID,
  CHATS_ID,
  MESSAGES_ID,
  DOCUMENTS_ID,
} from '@/config';
import { Chat } from '../types';

// Helper function to get authenticated client info
async function getAuthClientInfo() {
  const client = await createSessionClient();
  const account = await client.account.get();
  return {
    databases: client.databases,
    userId: account.$id
  };
}

// export async function getUser(email: string) {
//   try {
//     const databases = await getDatabaseClient();
//     const users = await databases.listDocuments(DATABASE_ID, USERS_ID, [
//       Query.equal('email', email)
//     ]);
//     return users.documents;
//   } catch (error) {
//     console.error('Failed to get user from database');
//     throw error;
//   }
// }

export async function saveChat({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  try {
    const { databases, userId } = await getAuthClientInfo();
    return await databases.createDocument(DATABASE_ID, CHATS_ID, id, {
      userId,
      title,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

export async function deleteChatById(databases: any, { id }: { id: string }) {
  try {
    // Delete related messages
    const messages = await databases.listDocuments(DATABASE_ID, MESSAGES_ID, [
      Query.equal('chatId', id)
    ]);
    await Promise.all(messages.documents.map(message =>
      databases.deleteDocument(DATABASE_ID, MESSAGES_ID, message.$id)
    ));

    // Delete chat
    return await databases.deleteDocument(DATABASE_ID, CHATS_ID, id);
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

export async function getChatsByUserId() {
  try {
    const { databases, userId } = await getAuthClientInfo();
    const chats = await databases.listDocuments(DATABASE_ID, CHATS_ID, [
      Query.equal('userId', userId),
      Query.orderDesc('createdAt')
    ]);
    return chats.documents;
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

export async function getChatById(databases: any, { id }: { id: string }) {
  try {
    const chat = await databases.getDocument(DATABASE_ID, CHATS_ID, id);
    return chat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

export async function saveMessages(databases: any, {
  messages,
}: {
  messages: Array<any>;
}) {
  try {
    return await Promise.all(messages.map(message =>
      databases.createDocument(DATABASE_ID, MESSAGES_ID, message.id, {
        chatId: message.chatId,
        role: message.role,
        parts: message.parts,
        content: message.content,
        createdAt: message.createdAt
      })
    ));
  } catch (error) {
    console.error('Failed to save messages in database');
    throw error;
  }
}

export async function getMessagesByChatId(databases: any, { id }: { id: string }) {
  try {
    const messages = await databases.listDocuments(DATABASE_ID, MESSAGES_ID, [
      Query.equal('chatId', id),
      Query.orderAsc('createdAt')
    ]);
    return messages.documents;
  } catch (error) {
    console.error('Failed to get messages by chat id from database');
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content
}: {
  id: string;
  title: string;
  kind: string;
  content: string;
}) {
  try {
    const { databases, userId } = await getAuthClientInfo();
    return await databases.createDocument(DATABASE_ID, DOCUMENTS_ID, id, {
      title,
      kind,
      content,
      userId,
    });
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const { databases, userId } = await getAuthClientInfo();
    const documents = await databases.listDocuments(DATABASE_ID, DOCUMENTS_ID, [
      Query.equal('id', userId),
      Query.orderDesc('createdAt')
    ]);
    return documents.documents;
  } catch (error) {
    console.error('Failed to get documents by user from database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const { databases, userId } = await getAuthClientInfo();
    const document = await databases.getDocument(DATABASE_ID, DOCUMENTS_ID, id);
    return document;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    const { databases } = await getAuthClientInfo();
    const documents = await databases.listDocuments(DATABASE_ID, DOCUMENTS_ID, [
      Query.equal('id', id),
      Query.orderDesc('createdAt')
    ]);
    return await Promise.all(documents.documents.map(document => {
      if (new Date(document.createdAt) > timestamp) {
        return databases.deleteDocument(DATABASE_ID, DOCUMENTS_ID, document.$id);
      }
    }));
  }} catch (error) {
    console.error('Failed to delete documents by id from database');
    throw error;
  }
})
// ... Additional functions following same pattern ...