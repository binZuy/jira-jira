"use client";

// import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWindowSize } from "usehooks-ts";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useWorkspaceId } from '@/features/workspaces/hooks/use-workspace-id';
import { SidebarToggle } from '@/features/chats/components/sidebar-toggle';
import { Button } from "@/components/ui/button";
import { PlusIcon } from "./icons";
import { useSidebar } from '@/components/ui/sidebar';
import { memo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function PureChatHeader(
//   {
//   chatId,
//   selectedModelId,
//   isReadonly,
// }: {
//   chatId: string;
//   selectedModelId: string;
//   isReadonly: boolean;
// }
) {
  const router = useRouter();
  const { open } = useSidebar();
  const workspaceId = useWorkspaceId();
  const { width: windowWidth } = useWindowSize();

  return (
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
      <SidebarToggle />
      <TooltipProvider delayDuration={0}>
        {(!open || windowWidth < 768) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="order-2 md:order-1 md:px-2 px-2 md:h-fit ml-auto md:ml-0"
              onClick={() => {
                router.push(`/workspaces/${workspaceId}/chats`);
                router.refresh();
              }}
            >
              <PlusIcon />
              <span className="md:sr-only">New Chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>
         )}
      </TooltipProvider>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader);
