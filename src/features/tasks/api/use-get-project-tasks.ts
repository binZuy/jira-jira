import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";
import { TaskStatus } from "@/lib/types/enums";

interface UseGetProjectTasksProps {
  workspaceId: string;
  projectId: string;
}

export const useGetProjectTasks = ({ workspaceId, projectId }: UseGetProjectTasksProps) => {
  const query = useQuery({
    queryKey: ["project-tasks", workspaceId, projectId],
    queryFn: async () => {
      const response = await client.api.tasks.$get({
        query: { 
          workspaceId,
          projectId
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch project tasks");
      }

      const { data } = await response.json();
      
      // Calculate completion rate
      const totalTasks = data.length;
      const completedTasks = data.filter((task) => task.status === TaskStatus.DONE).length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...data,
        completionRate
      };
    },
  });
  return query;
}; 