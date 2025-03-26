import { useQuery } from "@tanstack/react-query";
//import { InferResponseType } from "hono";
import { client } from "@/lib/rpc";

//type ResponseType = InferResponseType<typeof client.api.tasks[":taskId"]["logs"]["$get"]>;

interface UseGetLogsProps {
  taskId: string;
}

export const useGetLogs = ({ taskId }: UseGetLogsProps) => {
  const query = useQuery({
    queryKey: ["task-logs", taskId],
    queryFn: async () => {
      const response = await client.api.tasks[":taskId"]["logs"]["$get"]({
        param: { taskId }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch task logs");
      }

      const { data } = await response.json();
      return data;
    }
  });

  return query;
};