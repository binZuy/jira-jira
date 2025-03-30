"use client";

// import { useGetProject } from "@/features/projects/api/use-get-project";
// import { useProjectId } from "@/features/projects/hooks/use-project-id";
// import { ProjectAvatar } from "@/features/projects/components/project-avatar";
// import { TaskViewSwitcher } from "@/features/tasks/components/task-view-switcher";

import { useChat } from '@ai-sdk/react';

// import { PageLoader } from "@/components/page-loader";
// import { PencilIcon } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import Link from "next/link";
// import { PageError } from "@/components/page-error";
// import { useGetProjectAnalytics } from "@/features/projects/api/use-get-project-analytics";
// import { Analytics } from "@/components/analytics";

export const ChatClient = () => {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

//   if (isLoading) {
//     return <PageLoader />;
//   }
//   if (!project) {
//     return <PageError message="Project not found" />;
//   }
  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map(message => (
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
      </form>
    </div>
  );
}