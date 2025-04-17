import { Message, Suggestion } from "@/lib/types/enums";
import { createClient } from "@/lib/supabase/server";
import { ArtifactKind } from "./components/artifact";

export async function getAuthInfo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }
  return { supabase, user };
}

export async function saveChat({ id, title }: { id: string; title: string }) {
  const { supabase, user } = await getAuthInfo();
  const { data, error } = await supabase
    .from("chats")
    .insert({
      id: id,
      userId: user.id,
      title,
    })
    .select()
    .single();
  if (error) {
    console.log(error);
    throw error;
  }
  return data;
}

export async function deleteChatById({ id }: { id: string }) {
  const { supabase } = await getAuthInfo();
  // Delete the chat document
  const { error } = await supabase.from("chats").delete().eq("id", id);
  if (error) {
    console.log(error);
    throw error;
  }
  console.log(`Chat with ID ${id} deleted successfully.`);

  const { error: messagesError } = await supabase
    .from("messages")
    .delete()
    .eq("chatId", id);
  if (messagesError) {
    console.log(messagesError);
    throw messagesError;
  }
  console.log(`All messages for chat ID ${id} deleted successfully.`);

  return true;
}

export async function getChatsByUserId() {
  const { supabase, user } = await getAuthInfo();
  const { data: chats, error: chatsError } = await supabase
    .from("chats")
    .select("*")
    .eq("userId", user.id)
    .order("created_at", { ascending: false });
  if (chatsError) {
    console.error("Failed to get chats by user id from database", chatsError);
    throw chatsError;
  }
  if (chats.length === 0) {
    console.error("No chats found for user id", user.id);
    return [];
  }
  return chats;
}

export async function getChatById({ id }: { id: string }) {
  const { supabase } = await getAuthInfo();
  const { data: chat, error } = await supabase
    .from("chats")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    console.error("Failed to get chat by id from database", error);
    throw error;
  }
  return chat;
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  const { supabase } = await getAuthInfo();

  const { error } = await supabase.from("messages").insert(messages);
  if (error) {
    console.error("Failed to save messages in database", error);
    throw error;
  }
  return true;
}

export async function getMessagesByChatId({ id }: { id: string }) {
  const { supabase } = await getAuthInfo();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("chatId", id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to get messages by chat id from database", error);
    throw error;
  }
  return data;
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
  const { supabase, user } = await getAuthInfo();

  const { data, error } = await supabase
    .from("documents")
    .insert({
      id: id,
      userId: user.id,
      title,
      kind,
      content,
    })
    .select()
    .single();
  if (error) {
    console.log(error);
    throw error;
  }
  return data;
}

export async function getDocumentById({ id }: { id: string }) {
  const { supabase } = await getAuthInfo();

  const { data: documents, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Failed to get document by id from Appwrite database", error);
    throw error;
  }
  const selectedDocument = documents?.[0];
  return selectedDocument;
}

export async function getDocumentsById({ id }: { id: string }) {
  const { supabase } = await getAuthInfo();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(
      "Failed to get documents by id from Appwrite database",
      error
    );
    throw error;
  }
  return data;
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  const { supabase } = await getAuthInfo();
  return await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .lt("created_at", timestamp);
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Omit<Suggestion, "userId">>;
}) {
  const { supabase } = await getAuthInfo();

  const { error } = await supabase.from("suggestions").insert(suggestions);
  if (error) {
    console.error("Failed to save suggestions in database", error);
    throw error;
  }
  return true;
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  const { supabase } = await getAuthInfo();
  const { data, error } = await supabase
    .from("suggestions")
    .select("*")
    .eq("documentId", documentId);
  if (error) {
    console.error(
      "Failed to get suggestions by document id from database",
      error
    );
    throw error;
  }
  return data;
}
