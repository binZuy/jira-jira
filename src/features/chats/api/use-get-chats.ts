import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/rpc";

export const useGetChats = () => {
  const query = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const response = await client.api.chats.$get();

      if (!response.ok) {
        throw new Error("Failed to fetch chats");
      }

      const { data } = await response.json();

      return data;
    },
  });
  return query;
};
