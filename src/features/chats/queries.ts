import { createSessionClient } from "@/lib/appwrite";
import {
  DATABASE_ID,
  PROJECTS_ID,
  CHATS_ID,
  MESSAGES_ID,
  DOCUMENTS_ID,
  SUGGESTIONS_ID,
} from "@/config";
import { Message, Suggestion } from "@/features/chats/types";
import { ID, Query } from "node-appwrite";
import { ArtifactKind } from "./components/artifact";

export async function getAuthInfo() {
  const { databases, account } = await createSessionClient();
  try {
    const user = await account.get();
    return { databases, user };
  } catch (error) {
    console.error("Failed to get user from Appwrite account", error);
    throw error;
  }
}

export async function saveProject({
  workspaceId,
  name,
  imageUrl,
}: {
  workspaceId: string;
  name: string;
  imageUrl?: string;
}) {
  const { databases, user } = await getAuthInfo();
  console.log(user.$id);
  try {
    return await databases.createDocument(
      DATABASE_ID,
      PROJECTS_ID,
      ID.unique(),
      {
        workspaceId: workspaceId,
        name: name,
        imageUrl: imageUrl,
      }
    );
  } catch (error) {
    console.error("Failed to save project in Appwrite database", error);
    throw error;
  }
}

export async function saveChat({ id, title }: { id: string; title: string }) {
  const { databases, user } = await getAuthInfo();
  try {
    return await databases.createDocument(DATABASE_ID, CHATS_ID, id, {
      userId: user.$id,
      title,
    });
  } catch (error) {
    console.error("Failed to save chat in Appwrite database", error);
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  const { databases } = await getAuthInfo();

  try {
    // Delete the chat document
    await databases.deleteDocument(DATABASE_ID, CHATS_ID, id);
    console.log(`Chat with ID ${id} deleted successfully.`);

    // Fetch all messages associated with the chat
    const messages = await databases.listDocuments(DATABASE_ID, MESSAGES_ID, [
      Query.equal("chatId", id),
    ]);

    // Delete all messages associated with the chat
    await Promise.all(
      messages.documents.map((message) =>
        databases.deleteDocument(DATABASE_ID, MESSAGES_ID, message.$id)
      )
    );
    console.log(`All messages for chat ID ${id} deleted successfully.`);

    return true;
  } catch (error) {
    console.error("Failed to delete chat or its messages from Appwrite database", error);
    throw error;
  }
}

export async function getChatsByUserId() {
  const { databases, user } = await getAuthInfo();
  try {
    const response = await databases.listDocuments(DATABASE_ID, CHATS_ID, [
      Query.equal("userId", user.$id),
      Query.orderDesc("created_at"),
    ]);
    return response.documents;
  } catch (error) {
    console.error("Failed to get chats by user from Appwrite database", error);
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  const { databases } = await getAuthInfo();
  try {
    const response = await databases.getDocument(DATABASE_ID, CHATS_ID, id);
    return response;
  } catch {
    return false;
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  const { databases } = await getAuthInfo();
  try {
    return await Promise.all(
      messages.map((message) =>
        databases.createDocument(DATABASE_ID, MESSAGES_ID, message.id, {
          chatId: message.chatId,
          role: message.role,
          content: message.content,
          parts: JSON.stringify(message.parts),
        })
      )
    );
  } catch (error) {
    console.error("Failed to save messages in Appwrite database", error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  const { databases } = await createSessionClient();
  try {
    const response = await databases.listDocuments(DATABASE_ID, MESSAGES_ID, [
      Query.equal("chatId", id),
      Query.orderAsc("$created_at"),
    ]);
    return response.documents;
  } catch (error) {
    console.error(
      "Failed to get messages by chat id from Appwrite database",
      error
    );
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
}) {
  try {
    const { databases, user } = await getAuthInfo();
    return await databases.createDocument(DATABASE_ID, DOCUMENTS_ID, ID.unique(), {
      id,
      title,
      kind,
      content,
      userId: user.$id,
    });
  } catch (error) {
    console.error("Failed to save document in database");
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  const { databases } = await getAuthInfo();
  try {
    const response = await databases.listDocuments(DATABASE_ID, DOCUMENTS_ID, [
      Query.equal("id", id),
      Query.orderDesc("$created_at"),
    ]);
    const selectedDocument = response.documents[0];
    return selectedDocument;
  } catch (error) {
    console.error("Failed to get document by id from Appwrite database", error);
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  const { databases } = await getAuthInfo();
  try {
    const response = await databases.listDocuments(DATABASE_ID, DOCUMENTS_ID, [
      Query.equal("id", id),
      Query.orderAsc("$created_at"),
    ]);
    return response.documents;
  } catch (error) {
    console.error(
      "Failed to get documents by user id from Appwrite database",
      error
    );
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  const { databases } = await getAuthInfo();
  try {
    const response = await databases.listDocuments(DATABASE_ID, DOCUMENTS_ID, [
      Query.equal("$id", id),
      Query.orderDesc("$created_at"),
    ]);
    return await Promise.all(
      response.documents.map((document) => {
        if (new Date(document.$created_at) > timestamp) {
          return databases.deleteDocument(
            DATABASE_ID,
            DOCUMENTS_ID,
            document.$id
          );
        }
      })
    );
  } catch (error) {
    console.error(
      "Failed to delete documents by id from Appwrite database",
      error
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Omit<Suggestion, 'userId'>>;
}) {
  try {
    const { databases } = await getAuthInfo();

    // Lưu từng suggestion vào cơ sở dữ liệu
    return await Promise.all(
      suggestions.map((suggestion) =>
        databases.createDocument(
          DATABASE_ID,
          SUGGESTIONS_ID,
          ID.unique(),
          {
            ...suggestion, // Lưu toàn bộ dữ liệu của suggestion
          }
        )
      )
    );
  } catch (error) {
    console.error("Failed to save suggestions in database");
    throw error;
  }
}

export async function getSuggestionsByDocumentId ({
  documentId,
}: {
  documentId: string;
}) {
  try {
    const { databases } = await getAuthInfo();
    const response = await databases.listDocuments(DATABASE_ID, SUGGESTIONS_ID, [
      Query.equal("documentId", documentId),
    ]);
    return response.documents;
  } catch (error) {
    console.error("Failed to get suggestions by document id from Appwrite database", error);
    throw error;
  }
}

