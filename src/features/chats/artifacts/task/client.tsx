import { Artifact } from "@/features/chats/components/create-artifact";
// import { Task } from "@/features/tasks/types";
import { TaskViewSwitcher } from "@/features/tasks/components/task-view-switcher";
import { TaskOverview } from "@/features/tasks/components/task-overview";
import { TaskDescription } from "@/features/tasks/components/task-description";
import { TaskComments } from "@/features/tasks/components/task-comments";
import { useGetTask } from "@/features/tasks/api/use-get-task";
import { Loader } from "lucide-react";
import { getWorkspaceId } from "@/lib/utils";

interface TaskArtifactMetadata {
  taskId?: string;
  view?: "table" | "kanban" | "calendar";
  mode?: "view" | "edit";
  workspaceId?: string;
}

export const taskArtifact = new Artifact<'task', TaskArtifactMetadata>({
  kind: 'task',
  description: "A task management artifact that allows viewing and managing tasks in different views.",
  
  initialize: async ({ setMetadata }) => {
    const workspaceId = getWorkspaceId();
    // Initialize with default metadata
    setMetadata({
      view: "table",
      mode: "view",
      workspaceId
    });
  },

  onStreamPart: ({ streamPart, setMetadata }) => {
    if (streamPart.type === "task-create") {
      setMetadata((metadata) => ({
        ...metadata,
        taskId: streamPart.content as string,
        view: "table",
      }));
    }
    if (streamPart.type === "task-update") {
      setMetadata((metadata) => ({
        ...metadata,
        taskId: streamPart.content as string,
      }));
    }
    if (streamPart.type === "task-delete") {
      setMetadata((metadata) => ({
        ...metadata,
        taskId: undefined,
        view: "table",
      }));
    }
    if (streamPart.type === "task-search") {
      setMetadata((metadata) => ({
        ...metadata,
        view: "kanban",
      }));
    }
    if (streamPart.type === "view-update") {
      setMetadata((metadata) => ({
        ...metadata,
        view: streamPart.content as "table" | "kanban" | "calendar",
      }));
    }
    if (streamPart.type === "mode-update") {
      setMetadata((metadata: TaskArtifactMetadata) => ({
        ...metadata,
        mode: streamPart.content as "view" | "edit",
      }));
    }
  },

  content: function TaskContent({
    isLoading,
    metadata,
  }) {
    const { taskId, workspaceId } = metadata;
    const { data: task, isLoading: isLoadingTask } = useGetTask({ taskId: taskId || "" });

    if (isLoading || isLoadingTask) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader className="size-5 animate-spin text-muted-foreground" />
        </div>
      );
    }

    // If we have a specific task ID, show task details
    if (taskId && task) {
      return (
        <div className="flex flex-col gap-4 p-4">
          <TaskOverview task={task} />
          <TaskDescription task={task} />
          <TaskComments taskId={task.$id} />
        </div>
      );
    }

    // Otherwise show the task view switcher
    if (workspaceId) {
      return (
        <div className="h-full">
          <TaskViewSwitcher />
        </div>
      );
    }

    return <div>Please select a workspace to view tasks</div>;
  },

  actions: [
    {
      icon: <span>📋</span>,
      description: "Switch to table view",
      onClick: ({ setMetadata }) => {
        setMetadata((metadata) => ({
          ...metadata,
          view: "table",
        }));
      },
    },
    {
      icon: <span>📊</span>,
      description: "Switch to kanban view",
      onClick: ({ setMetadata }) => {
        setMetadata((metadata) => ({
          ...metadata,
          view: "kanban",
        }));
      },
    },
    {
      icon: <span>📅</span>,
      description: "Switch to calendar view",
      onClick: ({ setMetadata }) => {
        setMetadata((metadata) => ({
          ...metadata,
          view: "calendar",
        }));
      },
    },
  ],

  toolbar: [
    {
      icon: <span>➕</span>,
      description: "Create new task",
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: "user",
          content: "Create a new task",
        });
      },
    },
    {
      icon: <span>🔍</span>,
      description: "Search tasks",
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: "user",
          content: "Search for tasks",
        });
      },
    },
  ],
});
