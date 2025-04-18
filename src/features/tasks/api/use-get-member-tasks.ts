import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface UseGetMemberTasksProps {
  workspaceId: string;
  memberId: string;
}

export const useGetMemberTasks = ({ workspaceId, memberId }: UseGetMemberTasksProps) => {
  const query = useQuery({
    queryKey: ["member-tasks", workspaceId, memberId],
    queryFn: async () => {
      const response = await client.api.tasks.$get({
        query: { 
          workspaceId,
          assigneeId: memberId
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch member tasks");
      }

      const { data } = await response.json();
      return data;
    },
  });
  return query;
}; 