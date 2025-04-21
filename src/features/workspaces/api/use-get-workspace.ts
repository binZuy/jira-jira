import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/rpc";

interface UseGetWorkspaceProps {
  workspaceId: string;
}
export const useGetWorkspace = ({ workspaceId }: UseGetWorkspaceProps) => {
  const query = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: async () => {
      const response = await client.api.workspaces[":workspaceId"].$get({
        param: { workspaceId },
      });

      if (!response.ok) {
        const errorData = await response.json();
        if ("error" in errorData) throw new Error(errorData.error);
        else throw new Error("Failed to fetch workspace");
      }

      const { data } = await response.json();

      return data;  
    },
  });
  return query;
};
