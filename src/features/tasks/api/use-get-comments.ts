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
        const errorData = await response.json();
        if ("error" in errorData) throw new Error(errorData.error);     
        else throw new Error("Failed to fetch comments");
      }

      const { data } = await response.json();
      return data;
    }
  });

  return query;
};