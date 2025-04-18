import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/rpc";

type ResponseType = InferResponseType<typeof client.api.rooms[":roomId"]["$patch"], 200>;

type RequestType = InferRequestType<typeof client.api.rooms[":roomId"]["$patch"]>;

export const useUpdateRoom = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json, param }) => {
      const response = await client.api.rooms[":roomId"]["$patch"]({ json, param });
      if(!response.ok) {
        throw new Error("Failed to update room");
      }
      return await response.json();
    },
    onSuccess: ({data}) => {
      toast.success("Room updated");

      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["room", data.id] });
    },
    onError: ()=> {
      toast.error("Failed to update room");
    },
  });

  return mutation;
};
