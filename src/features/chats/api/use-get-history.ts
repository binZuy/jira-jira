import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/rpc";

export const useGetHistory = () => {
  const query = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const response = await client.api.history.$get();

      if (!response.ok) {
        throw new Error("Failed to get history");
      }

      const { data } = await response.json();

      return data;
    },
  });
  return query;
};
