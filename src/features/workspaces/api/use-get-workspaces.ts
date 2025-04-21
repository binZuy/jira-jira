import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/rpc";

export const useGetWorkspaces = () => {
  const query = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const response = await client.api.workspaces.$get();

      if (!response.ok) {
        const errorData = await response.json();
        if ("error" in errorData) throw new Error(errorData.error);
        else throw new Error("Failed to fetch workspaces");
      }

      const { data } = await response.json();

      return data;
    },
  });
  return query;
};
