"use client";

import { useGetWorkspaces } from "@/features/workspaces/api/use-get-workspaces";
import { WorkspaceAvatar } from "@/features/workspaces/components/workspace-avatar";
import { useCreateWorkspaceModal } from "@/features/workspaces/hooks/use-create-workspace-modal";
import { useRouter } from "next/navigation";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { Plus, ChevronDown, ChevronRight, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui-vercel/dropdown-menu";
import { Button } from "@/components/ui-vercel/button";
import { Avatar, AvatarFallback } from "@/components/ui-vercel/avatar";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const WorkspaceSwitcher = () => {
  const workspaceId = useWorkspaceId();
  const router = useRouter();
  const { data: workspaces } = useGetWorkspaces();
  const { open } = useCreateWorkspaceModal();
  const [isOpen, setIsOpen] = useState(true);

  const currentWorkspace = workspaces?.documents.find(w => w.$id === workspaceId);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1 text-sm uppercase text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span>Workspace</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 w-7 p-0" 
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="space-y-1 px-1 py-1">
          {workspaces?.documents.map((workspace) => (
            <Button
              key={workspace.$id}
              variant="ghost"
              className={cn(
                "w-full justify-start px-3 py-2 text-sm text-muted-foreground transition-all hover:text-primary",
                workspace.$id === workspaceId && "bg-muted text-primary"
              )}
              onClick={() => router.push(`/workspaces/${workspace.$id}`)}
            >
              <div className="flex items-center gap-2">
                <WorkspaceAvatar
                  name={workspace.name}
                  image={workspace.imageUrl}
                  className="h-5 w-5"
                />
                <span className="truncate">{workspace.name}</span>
              </div>
            </Button>
          ))}
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start px-3 py-2 text-sm text-muted-foreground"
            onClick={open}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Workspace
          </Button>
        </div>
      </div>
    </div>
  );
};
