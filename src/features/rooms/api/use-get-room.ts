import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/rpc";

interface UseGetRoomProps {
  roomId: string;
}
export const useGetRoom = ({ roomId }: UseGetRoomProps) => {
  const query = useQuery({
    queryKey: ["room", roomId],
    queryFn: async () => {
      const response = await client.api.rooms[":roomId"].$get({
        param: { roomId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch room");
      }

      const { data } = await response.json();

      return data;
    },
  });
  return query;
};
