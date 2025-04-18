import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/rpc";

interface UseGetRoomsProps {
  workspaceId: string;
}
export const useGetRooms = () => {
  const query = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const response = await client.api.rooms.$get();

      if (!response.ok) {
        throw new Error("Failed to fetch rooms");
      }

      const { data } = await response.json();

      return data;
    },
  });
  return query;
};
