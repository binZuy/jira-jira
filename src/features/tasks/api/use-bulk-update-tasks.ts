import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/rpc";

type ResponseType = InferResponseType<typeof client.api.tasks["bulk-update"]["$post"], 200>;

type RequestType = InferRequestType<typeof client.api.tasks["bulk-update"]["$post"]>;

export const useBulkUpdateTasks = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await client.api.tasks["bulk-update"]["$post"]({ json });
      if(!response.ok) {
        throw new Error("Failed to bulk update tasks");
      }
      return await response.json();
    },
    onSuccess: ({ data }) => {
      toast.success("Tasks updated");
      // Get unique workspaceIds and projectIds from the updated tasks
      const workspaceIds = [...new Set(data.map(task => task.workspaceId))];
      const projectIds = [...new Set(data.map(task => task.projectId))];
      const assigneeIds = [...new Set(data.map(task => task.assigneeId))];

      // Invalidate analytics for affected workspaces
      workspaceIds.forEach(workspaceId => {
        queryClient.invalidateQueries({ queryKey: ["project-analytics", workspaceId] });
        queryClient.invalidateQueries({ queryKey: ["workspace-analytics", workspaceId] });
      });

      // Invalidate tasks list
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      // Invalidate member tasks for affected assignees
      workspaceIds.forEach(workspaceId => {
        assigneeIds.forEach(assigneeId => {
          queryClient.invalidateQueries({ queryKey: ["member-tasks", workspaceId, assigneeId] });
        });
      });

      // Invalidate project tasks for affected projects
      workspaceIds.forEach(workspaceId => {
        projectIds.forEach(projectId => {
          queryClient.invalidateQueries({ queryKey: ["project-tasks", workspaceId, projectId] });
        });
      });
    },
    onError: ()=> {
      toast.error("Failed to update tasks");
    },
  });

  return mutation;
};
