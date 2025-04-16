"use client";

import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useCreateProjectModal } from "@/features/projects/hooks/use-create-project-modal";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useCreateTaskModal } from "@/features/tasks/hooks/use-create-task-modal";
import { useGetWorkspaceAnalytics } from "@/features/workspaces/api/use-get-workspace-analytics";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";

import { formatDistanceToNow } from "date-fns";
import { PageLoader } from "@/components/page-loader";
import { PageError } from "@/components/page-error";
import { Analytics } from "@/components/analytics";
import { Button } from "@/components/ui/button";
import { PlusIcon, CalendarIcon, SettingsIcon, ListChecksIcon } from "lucide-react";
import { DottedSeparator } from "@/components/dotted-separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Project, Member, Task } from "@/lib/types/enums";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { MemberAvatar } from "@/features/members/components/members-avatar";

export const WorkspaceIdClient = () => {
  const workspaceId = useWorkspaceId();

  const { data: analytics, isLoading: isLoadingAnalytics } =
    useGetWorkspaceAnalytics({ workspaceId });
  const { data: tasks, isLoading: isLoadingTasks } = useGetTasks({
    workspaceId,
  });
  const { data: projects, isLoading: isLoadingProjects } = useGetProjects({
    workspaceId,
  });
  const { data: members, isLoading: isLoadingMembers } = useGetMembers({
    workspaceId,
  });

  const isLoading =
    isLoadingAnalytics ||
    isLoadingTasks ||
    isLoadingProjects ||
    isLoadingMembers;
  if (isLoading) {
    return <PageLoader />;
  }
  if (!analytics || !tasks || !projects || !members) {
    return <PageError message="Failed to load workspace data" />;
  }
  return (
    <div className="h-full flex flex-col space-y-4">
      <Analytics data={analytics} />
      <ProjectsList data={projects} total={projects.length} />
      <MembersList data={members} total={members.length} />
      <TasksList data={tasks} total={tasks.length} />
    </div>
  );
};

interface TasksListProps {
  data: Task[];
  total: number;
}
export const TasksList = ({ data, total }: TasksListProps) => {
  const workspaceId = useWorkspaceId();
  const { open: createTask } = useCreateTaskModal();
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Recent Tasks</CardTitle>
            <Badge variant="outline" className="bg-muted">
              {total}
            </Badge>
          </div>
          <Button onClick={createTask} variant="outline" size="sm">
            <PlusIcon className="mr-2 h-4 w-4" />
            Create Task
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <ListChecksIcon className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No tasks found. Create your first task to get started!
            </p>
            <Button onClick={createTask} variant="outline" size="sm">
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {data.slice(0, 4).map((task) => (
              <Link
                key={task.id}
                href={`/workspaces/${workspaceId}/tasks/${task.id}`}
              >
                <Card className="shadow-none hover:bg-muted/50 transition">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium truncate">{task.name}</p>
                    <div className="text-xs text-muted-foreground flex items-center mt-2">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      <span className="truncate">
                        {formatDistanceToNow(new Date(task.dueDate))}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            <Button variant="outline" className="w-full" size="sm" asChild>
              <Link href={`/workspaces/${workspaceId}/tasks`}>
                View All Tasks
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
      {/* <CardFooter>
        <Button variant="muted" className="mt-4 w-full" asChild>
          <Link href={`/workspaces/${workspaceId}/tasks`}>Show All</Link>
        </Button>
      </CardFooter> */}
    </Card>
  );
};

interface ProjectsListProps {
  data: Project[];
  total: number;
}
export const ProjectsList = ({ data, total }: ProjectsListProps) => {
  const workspaceId = useWorkspaceId();
  const { open: createProject } = useCreateProjectModal();
  return (
    <div className="flex flex-col gap-y-4 col-span-1">
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">Projects ({total})</p>
          <Button variant="secondary" size="icon" onClick={createProject}>
            <PlusIcon className="size-4 text-neutral-400" />
          </Button>
        </div>

        <DottedSeparator className="my-4" />
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.map((project) => (
            <li key={project.id}>
              <Link href={`/workspaces/${workspaceId}/tasks/${project.id}`}>
                <Card className=" shadow-none rounded-lg hover:opacity-75 transition">
                  <CardContent className="p-4 flex items-center gap-x-2.5">
                    <ProjectAvatar
                      className="size-12"
                      fallbackClassName="text-lg"
                      name={project.name}
                      image={project.imageUrl}
                    />
                    <p className="text-lg font-medium truncate">
                      {project.name}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
          <li className="text-sm text-muted-foreground text-center hidden">
            No projects found
          </li>
        </ul>
      </div>
    </div>
  );
};

interface MembersListProps {
  data: Member[];
  total: number;
}
export const MembersList = ({ data, total }: MembersListProps) => {
  const workspaceId = useWorkspaceId();

  return (
    <div className="flex flex-col gap-y-4 col-span-1">
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">Members ({total})</p>
          <Button variant="secondary" size="icon" asChild>
            <Link href={`/workspaces/${workspaceId}/members`}>
              <SettingsIcon className="size-4 text-neutral-400" />
            </Link>
          </Button>
        </div>

        <DottedSeparator className="my-4" />
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((member) => (
            <li key={member.id}>
              <Link href={`/workspaces/${workspaceId}/tasks/${member.id}`}>
                <Card className=" shadow-none rounded-lg overflow-hidden">
                  <CardContent className="p-3 flex items-center gap-x-2">
                    <MemberAvatar className="size-12" name={member.name} />
                    <div className="flex flex-col items-center overflow-hidden">
                      <p className="text-lg font-medium line-clamp-1">
                        {member.name}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {member.email}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
          <li className="text-sm text-muted-foreground text-center hidden">
            No members found
          </li>
        </ul>
      </div>
    </div>
  );
};
