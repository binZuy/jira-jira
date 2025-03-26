import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";

type ResponseType = InferResponseType<typeof client.api.tasks[":taskId"]["comments"]["$post"], 200>;
type RequestType = InferRequestType<typeof client.api.tasks[":taskId"]["comments"]["$post"]>;

export const useCreateComment = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json, param }) => {
      const response = await client.api.tasks[":taskId"]["comments"]["$post"]({ 
        json, 
        param 
      });
      
      if(!response.ok) {
        throw new Error("Failed to create comment");
      }
      return await response.json();
    },
    onSuccess: ({ data }) => {
      toast.success("Comment added");
      queryClient.invalidateQueries({ 
        queryKey: ["task-comments", data.taskId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["task-logs", data.taskId] 
      });

    },
    onError: () => {
      toast.error("Failed to add comment");
    }
  });

  return mutation;
};