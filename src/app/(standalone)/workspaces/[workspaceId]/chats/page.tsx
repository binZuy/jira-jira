import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
// import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { generateID } from '@/lib/utils';
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

  const id = generateID();
  
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
    </div>
  );
};
export default ChatPage;
