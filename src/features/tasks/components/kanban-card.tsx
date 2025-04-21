import { MoreHorizontal } from "lucide-react";
import { Task, Priority } from "@/lib/types/enums";
import { TaskActions } from "./task-actions";
import { DottedSeparator } from "@/components/dotted-separator";
import { MemberAvatar } from "@/features/members/components/members-avatar";
import { TaskDate } from "./task-date";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { snakeCaseToTitleCase } from "@/lib/utils";

// Priority styling
const priorityStyles: Record<Priority, string> = {
  [Priority.HIGH]: "bg-red-100 text-red-700 border-red-200",
  [Priority.MEDIUM]: "bg-orange-100 text-orange-700 border-orange-200",
  [Priority.LOW]: "bg-blue-100 text-blue-700 border-blue-200",
};

interface KanbanCardProps {
  task: Task;
}

export const KanbanCard = ({ task }: KanbanCardProps) => {
  return (
    <div className="bg-white p-2.5 mb-1.5 rounded shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-x-2">
        <div>
          <div className="flex items-center gap-x-2 mb-1">
            <p className="text-sm font-medium line-clamp-2">{task.name}</p>
            <div className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${priorityStyles[task.priority]}`}>
              {snakeCaseToTitleCase(task.priority)}
            </div>
          </div>
        </div>
        <TaskActions id={task.id} projectId={task.projectId}>
          <MoreHorizontal className="size-[18px] stroke-1 shrink-0 text-neutral-700 hover:opacity-75 transition" />
        </TaskActions>
      </div>
      <DottedSeparator />
      <div className="flex items-center gap-x-1.5">
        <MemberAvatar name={task.assignee.name}
        fallbackClassName="text-[10px]"/>
        <div className="size-1 rounded-full bg-neutral-300"/>
        <TaskDate value={task.dueDate} className="text-xs"/>
      </div>
      <div className="flex items-center gap-x-1.5">
        <ProjectAvatar
        name={task.projects.name}
        image={task.projects.imageUrl}
        fallbackClassName="text-[10px]" />
        <span className="text-xs font-medium">{task.projects.name}</span>
      </div>
    </div>
  );
};
