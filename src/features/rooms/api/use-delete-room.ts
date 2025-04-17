import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/rpc";

type ResponseType = InferResponseType<typeof client.api.rooms[":roomId"]["$delete"], 200>;

type RequestType = InferRequestType<typeof client.api.rooms[":roomId"]["$delete"]>;

export const useDeleteRoom = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param }) => {
      const response = await client.api.rooms[":roomId"]["$delete"]({ param });
      if(!response.ok) {
        throw new Error("Failed to delete room");
      }
      return await response.json();
    },
    onSuccess: ({data}) => {
      toast.success("Room deleted");
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["room", data.id] });
    },
    onError: ()=> {
      toast.error("Failed to delete room");
    },
  });

  return mutation;
};
