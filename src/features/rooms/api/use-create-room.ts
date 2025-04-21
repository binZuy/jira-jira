import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/rpc";

type ResponseType = InferResponseType<typeof client.api.rooms["$post"], 200>;

type RequestType = InferRequestType<typeof client.api.rooms["$post"]>;

export const useCreateRoom = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await client.api.rooms["$post"]({ json });
      if(!response.ok) {
        const errorData = await response.json();
        if ("error" in errorData) throw new Error(errorData.error);
        else throw new Error("Failed to create room");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast.success("Room created");
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return mutation;
};
