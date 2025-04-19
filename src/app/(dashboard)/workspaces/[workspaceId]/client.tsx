"use client";

import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useCreateProjectModal } from "@/features/projects/hooks/use-create-project-modal";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useCreateTaskModal } from "@/features/tasks/hooks/use-create-task-modal";
import { useGetWorkspaceAnalytics } from "@/features/workspaces/api/use-get-workspace-analytics";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetMemberTasks } from "@/features/tasks/api/use-get-member-tasks";
import { formatDistanceToNow } from "date-fns";
import { PageLoader } from "@/components/page-loader";
import { PageError } from "@/components/page-error";
import { Analytics } from "@/components/analytics";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PlusIcon, CalendarIcon, ArrowRight, ListChecksIcon, FolderKanban, UserIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Project, Member, Task, MemberRole, TaskStatus } from "@/lib/types/enums";

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
    </Card>
  );
};

interface ProjectCardProps {
  id: string;
  name: string;
  imageUrl?: string;
  workspaceId: string;
}

function ProjectCard({ id, name, workspaceId }: ProjectCardProps) {
  const { data: tasksData } = useGetTasks({ workspaceId, projectId: id });
  console.log("tasksData", tasksData);
  const taskCount = tasksData?.length || 0;
  const completedTasks = tasksData?.filter((task) => task.status === TaskStatus.DONE).length || 0;
  const completionRate = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;

  return (
    <Link href={`/workspaces/${workspaceId}/projects/${id}`} className="block">
      <Card className="h-full transition-all duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{name}</CardTitle>
          <div className="h-4 w-4 text-muted-foreground">
            <FolderKanban className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{taskCount}</div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Tasks</p>
            <div className="text-xs text-muted-foreground">{completionRate}% complete</div>
          </div>
          <div className="mt-2 w-full bg-muted/30 rounded-full h-1.5 overflow-hidden">
            <div className="h-full rounded-full bg-muted-foreground" style={{ width: `${completionRate}%` }}></div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface ProjectsListProps {
  data: Project[];
  total: number;
}
export const ProjectsList = ({ data, total }: ProjectsListProps) => {
  const workspaceId = useWorkspaceId();
  const { open: createProject } = useCreateProjectModal();
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Projects</CardTitle>
            <Badge variant="outline" className="bg-muted">
              {total}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={createProject}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Project
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <FolderKanban className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No projects found. Create your first project to get started!</p>
            <Button onClick={createProject} variant="outline" size="sm">
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </div>
        ) : (
          <div className="flex overflow-x-auto pb-2 -mx-2 px-2 gap-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-x-visible scrollbar-hide hover:scrollbar-default">
            {data.slice(0, 4).map((project) => (
              <div key={project.id} className="min-w-[240px] md:min-w-0">
                <ProjectCard
                  id={project.id}
                  name={project.name}
                  imageUrl={project.imageUrl}
                  workspaceId={workspaceId}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface MemberCardProps {
  userId: string;
  name: string;
  email: string;
  role: string;
  workspaceId: string;
}

function MemberCard({ userId, name, role, workspaceId }: MemberCardProps) {
  const { data: tasksData } = useGetMemberTasks({ workspaceId, memberId: userId });
  const taskCount = tasksData?.length || 0;

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <Link href={`/workspaces/${workspaceId}/tasks`}>
      <Card className="h-full transition-all duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{name}</CardTitle>
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{taskCount}</div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Tasks</p>
            <Badge variant={role === MemberRole.ADMIN ? "default" : "outline"}>
              {role}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface MembersListProps {
  data: Member[];
  total: number;
}
export const MembersList = ({ data, total }: MembersListProps) => {
  const workspaceId = useWorkspaceId();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Members</CardTitle>
            <Badge variant="outline" className="bg-muted">
              {total}
            </Badge>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/workspaces/${workspaceId}/members`}>
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <UserIcon className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No members found. Invite team members to collaborate!</p>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/workspaces/${workspaceId}/members`}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Invite Members
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex overflow-x-auto pb-2 -mx-2 px-2 gap-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-x-visible scrollbar-hide hover:scrollbar-default">
            {data.slice(0, 4).map((member) => (
              <div key={member.id} className="min-w-[240px] md:min-w-0">
                <MemberCard
                  userId={member.userId}
                  name={member.name}
                  email={member.email}
                  role={member.role}
                  workspaceId={workspaceId}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
