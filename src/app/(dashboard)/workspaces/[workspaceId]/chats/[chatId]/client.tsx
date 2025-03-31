"use client";

import { generateIDChat } from "@/lib/utils";
// import { useGetProject } from "@/features/projects/api/use-get-project";
// import { useProjectId } from "@/features/projects/hooks/use-project-id";
// import { ProjectAvatar } from "@/features/projects/components/project-avatar";
// import { TaskViewSwitcher } from "@/features/tasks/components/task-view-switcher";
import { useChat } from "@ai-sdk/react";
import { DataStreamHandler } from "@/features/chats/components/data-stream-handler";
import { Chat } from "@/features/chats/components/chat";
import { useChatId } from "@/features/chats/hooks/use-chat-id";
import { useGetChat } from "@/features/chats/api/use-get-chat";
import { PageLoader } from "@/components/page-loader";
import { PageError } from "@/components/page-error";
import { UIMessage } from "ai";
import { Message } from "@/features/chats/types";
import { DEFAULT_CHAT_MODEL } from "@/features/chats/libs/ai/models";

export const ChatIdClient = () => {
 // const { messages, input, handleInputChange, handleSubmit } = useChat();
  const chatId = useChatId();
  const id = generateIDChat();

  const { data: chat, isLoading: isLoadingChat } = useGetChat({ chatId });

  if (isLoadingChat) {
    return <PageLoader />;
  }
  if (!chat) {
    return <PageError message="Chat not found" />;
  }

  function convertToUIMessages(messages: Array<Message>): Array<UIMessage> {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts as UIMessage['parts'],
      role: message.role as UIMessage['role'],
      // Note: content will soon be deprecated in @ai-sdk/react
      content: '',
      createdAt: message.createdAt
    }));
  }

  return (
    <div className="flex flex-col gap-y-4">
     <Chat
          id={chat.id}
          initialMessages={convertToUIMessages(chat.messages)}
          selectedChatModel={DEFAULT_CHAT_MODEL}
          isReadonly={false}
        />
        <DataStreamHandler id={id} />
    </div>
  );
};
