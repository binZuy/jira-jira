import { useQuery } from "@tanstack/react-query";
//import { InferResponseType } from "hono";
import { client } from "@/lib/rpc";

//type ResponseType = InferResponseType<typeof client.api.tasks[":taskId"]["comments"]["$get"], 200>;

interface UseGetCommentsProps {
  taskId: string;
}

export const useGetComments = ({ taskId }: UseGetCommentsProps) => {
  const query = useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: async () => {
      const response = await client.api.tasks[":taskId"]["comments"]["$get"]({
        param: { taskId }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch comments");
      }

      const { data } = await response.json();
      return data;
    }
  });

  return query;
};