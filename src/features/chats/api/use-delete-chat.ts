import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/rpc";

type ResponseType = InferResponseType<typeof client.api.chat[":chatId"]["$delete"], 200>;

type RequestType = InferRequestType<typeof client.api.chat[":chatId"]["$delete"]>;

export const useDeleteChat = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param }) => {
      const response = await client.api.chat[":chatId"]["$delete"]({ param });
      if(!response.ok) {
        throw new Error("Failed to delete chat");
      }
      return await response.json();
    },
    onSuccess: ({data}) => {
      toast.success("Chat deleted");
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      queryClient.invalidateQueries({ queryKey: ["chat", data["$id"]] });
    },
    onError: ()=> {
      toast.error("Failed to delete chat");
    },
  });

  return mutation;
};
