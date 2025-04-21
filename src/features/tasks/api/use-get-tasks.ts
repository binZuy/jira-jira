import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/rpc";
import { TaskStatus, Priority } from "@/lib/types/enums";

interface UseGetTasksProps {
  workspaceId: string;
  projectId?: string | null;
  status?: TaskStatus | null;
  priority?: Priority | null;
  assigneeId?: string | null;
  search?: string | null;
  dueDate?: string | null;
}
export const useGetTasks = ({
  workspaceId,
  projectId,
  search,
  status,
  priority,
  assigneeId,
  dueDate,
}: UseGetTasksProps) => {
  const query = useQuery({
    queryKey: [
      "tasks",
      workspaceId,
      projectId,
      status,
      priority,
      search,
      assigneeId,
      dueDate,
    ],
    queryFn: async () => {
      const response = await client.api.tasks.$get({
        query: {
          workspaceId,
          projectId: projectId ?? undefined,
          status: status ?? undefined,
          priority: priority ?? undefined,
          assigneeId: assigneeId ?? undefined,
          search: search ?? undefined,
          dueDate: dueDate ?? undefined
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        if ("error" in errorData) throw new Error(errorData.error);
        else throw new Error("Failed to fetch tasks");
      }

      const { data } = await response.json();

      return data;
    },
  });
  return query;
};
