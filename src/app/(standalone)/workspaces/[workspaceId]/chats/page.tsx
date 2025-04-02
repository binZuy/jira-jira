import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
// import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { generateIDChat } from '@/lib/utils';
// import { useGetProject } from "@/features/projects/api/use-get-project";
// import { useProjectId } from "@/features/projects/hooks/use-project-id";
// import { ProjectAvatar } from "@/features/projects/components/project-avatar";
// import { TaskViewSwitcher } from "@/features/tasks/components/task-view-switcher";
// import { useChat } from '@ai-sdk/react';
import { DataStreamHandler } from "@/features/chats/components/data-stream-handler";
import { Chat } from "@/features/chats/components/chat";
import { DEFAULT_CHAT_MODEL } from "@/features/chats/libs/ai/models";

const ChatPage = async () => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

    const id = generateIDChat();
  return (
    <div className="flex flex-col gap-y-4">
        <Chat
          key={id}
          id={id}
          initialMessages={[]}
          selectedChatModel={DEFAULT_CHAT_MODEL}
          isReadonly={false}
        />
        <DataStreamHandler id={id} />
      {/* {messages.map(message => (
            <div key={message.id} className="whitespace-pre-wrap">
              {message.role === 'user' ? 'User: ' : 'AI: '}
              {message.parts.map((part, i) => {
                switch (part.type) {
                  case 'text':
                    return <div key={`${message.id}-${i}`}>{part.text}</div>;
                }
              })}
            </div>
          ))}
    
          <form onSubmit={handleSubmit}>
            <input
              className="fixed dark:bg-zinc-900 bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 dark:border-zinc-800 rounded shadow-xl"
              value={input}
              placeholder="Say something..."
              onChange={handleInputChange}
            />
          </form> */}
    </div>
  );
};
export default ChatPage;
