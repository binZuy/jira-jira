import { snakeCaseToTitleCase } from "@/lib/utils";
import { TaskStatus } from "@/lib/types/enums";

import {
  CircleCheckIcon,
  CircleDashedIcon,
  CircleDotIcon,
  CircleDotDashedIcon,
  PlusIcon,
  CircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateTaskModal } from "../hooks/use-create-task-modal";
import { Badge } from "@/components/ui/badge";

interface KanbanColumnHeaderProps {
  board: TaskStatus;
  taskCount: number;
}

const statusIconMap: Record<TaskStatus, React.ReactNode> = {
  [TaskStatus.TODO]: <CircleIcon className="size-[18px] text-red-400" />,
  [TaskStatus.IN_PROGRESS]: (
    <CircleDotDashedIcon className="size-[18px] text-yellow-400" />
  ),
  [TaskStatus.DONE]: (
    <CircleCheckIcon className="size-[18px] text-emerald-400" />
  ),
  [TaskStatus.OUT_OF_SERVICE]: (
    <CircleDashedIcon className="size-[18px] text-blue-400" />
  ),
  [TaskStatus.DO_NOT_DISTURB]: (
    <CircleDotIcon className="size-[18px] text-pink-400" />
  ),
  [TaskStatus.READY_FOR_INSPECTION]: (
    <CircleDotIcon className="size-[18px] text-green-400" />
  ),
};

export const KanbanColumnHeader = ({
  board,
  taskCount,
}: KanbanColumnHeaderProps) => {
  const { open } = useCreateTaskModal();

  const icon = statusIconMap[board];

  return (
    <div className="px-2 py-1.5 flex items-center justify-between">
      <div className="flex items-center gap-x-2">
        {icon}
        <h2 className="text-sm font-medium">{snakeCaseToTitleCase(board)}</h2>
        <Badge variant={board} className="text-[10px]">
          {taskCount}
        </Badge>
      </div>
      <Button onClick={open} variant="ghost" size="icon" className="size-5">
        <PlusIcon className="size-4 text-neutral-500" />
      </Button>
    </div>
  );
};
