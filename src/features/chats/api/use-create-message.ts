import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/rpc";

type ResponseType = InferResponseType<typeof client.api.chats[":chatId"]["$post"], 200>;

type RequestType = InferRequestType<typeof client.api.chats[":chatId"]["$post"]>;

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await client.api.chats[":chatId"]["$post"]({ json });
      if(!response.ok) {
        throw new Error("Failed to create message");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast.success("Message created");
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
    onError: ()=> {
      toast.error("Failed to create messages");
    },
  });

  return mutation;
};