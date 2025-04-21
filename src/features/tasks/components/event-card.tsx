import { Project, TaskStatus, Member } from "@/lib/types/enums";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "@/features/members/components/members-avatar";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useRouter } from "next/navigation";

interface EventCardProps {
  title: string;
  assignee: Member;
  project: Project;
  status: TaskStatus;
  id: string;
}

const statusColorMap: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: "border-l-rose-500",
  [TaskStatus.IN_PROGRESS]: "border-l-amber-500", 
  [TaskStatus.DONE]: "border-l-emerald-500",
  [TaskStatus.DO_NOT_DISTURB]: "border-l-purple-500",
  [TaskStatus.OUT_OF_SERVICE]: "border-l-slate-500",
  [TaskStatus.READY_FOR_INSPECTION]: "border-l-sky-500",
};
export const EventCard = ({
  title,
  assignee,
  project,
  status,
  id,
}: EventCardProps) => {
  const workspaceId = useWorkspaceId();
  const router = useRouter();

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    router.push(`/wokrspaces/${workspaceId}/tasks/${id}`);
  };

  return (
    <div className="px-2">
      <div
        onClick={onClick}
        className={cn(
          "p-1.5 text-xs bg-white text-primary border rounded-md border-l-4 flex flex-col gap-y-1.5 cursor-pointer hover:opacity-75 transition w-full max-w-full overflow-hidden",
          statusColorMap[status]
        )}
      >
        <p className="truncate">{title}</p>
        <div className="flex items-center gap-x-1 min-w-0">
          <MemberAvatar name={assignee?.name} className="shrink-0" />
          <div className="size-1 rounded-full bg-neutral-300 shrink-0" />
          <ProjectAvatar 
            name={project?.name} 
            image={project?.imageUrl} 
            className="shrink-0"
          />
        </div>
      </div>
    </div>
  );
};
