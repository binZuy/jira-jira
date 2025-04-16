"use client";

import { RiAddCircleFill } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { FolderKanban, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useCreateProjectModal } from "@/features/projects/hooks/use-create-project-modal";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";

export const Projects = () => {
  const [projectsOpen, setProjectsOpen] = useState(true);
  const workspaceId = useWorkspaceId();
  const { open } = useCreateProjectModal();
  const { data } = useGetProjects({ workspaceId });
  const pathname = usePathname();
  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1 text-sm uppercase text-muted-foreground">
          <FolderKanban className="h-4 w-4" />
          <span>Projects</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setProjectsOpen(!projectsOpen)}
        >
          {projectsOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          projectsOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="space-y-1 px-1 py-1">
          {data?.map((project) => {
            const href = `/workspaces/${workspaceId}/projects/${project.id}`;
            const isActive = pathname === href;

            return (
              <Link
                key={project.$id}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:text-primary",
                  isActive && "bg-muted text-primary"
                )}
              >
                <ProjectAvatar image={project.imageUrl} name={project.name} />
                <span className="truncate">{project.name}</span>
              </Link>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-3 py-2 text-sm text-muted-foreground"
            onClick={open}
          >
            <RiAddCircleFill className="mr-2 h-4 w-4" />
            Add Project
          </Button>
        </div>
      </div>
    </div>
  );
};
