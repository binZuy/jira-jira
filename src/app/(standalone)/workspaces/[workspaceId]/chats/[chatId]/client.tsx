"use client";

import { DataStreamHandler } from "@/features/chats/components/data-stream-handler";
import { Chat } from "@/features/chats/components/chat";
import { useChatId } from "@/features/chats/hooks/use-chat-id";
import { useGetChat } from "@/features/chats/api/use-get-chat";
import { PageLoader } from "@/components/page-loader";
import { PageError } from "@/components/page-error";
import { UIMessage } from "ai";
import { Message } from "@/lib/types/enums";
import { DEFAULT_CHAT_MODEL } from "@/features/chats/libs/ai/models";

export const ChatIdClient = () => {
 // const { messages, input, handleInputChange, handleSubmit } = useChat();
  const chatId = useChatId();
  // const id = generateID();
  const { data, isLoading: isLoadingChat } = useGetChat({ chatId });

  if (isLoadingChat) {
    return <PageLoader />;
  }
  if (!data) {
    return <PageError message="Chat not found" />;
  }

  function convertToUIMessages(messages: Array<Message>): Array<UIMessage> {
    return messages.map((message) => ({
      ...message,
      id: message.id,
      parts: message.parts as UIMessage['parts'],
      role: message.role as UIMessage['role'],
      content: message.content as UIMessage['content'],
    }));
  }

  return (
    <div className="flex flex-col gap-y-4">
     <Chat
          id={data.chat.id}
          initialMessages={convertToUIMessages(data.messages)}
          selectedChatModel={DEFAULT_CHAT_MODEL}
          isReadonly={false}
        />
        <DataStreamHandler id={data.chat.id} />
    </div>
  );
};
