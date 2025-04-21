"use client";

import { JoinWorkspaceForm } from "@/features/workspaces/components/join-workspace-form";

import { PageLoader } from "@/components/page-loader";
import { PageError } from "@/components/page-error";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetWorkspaceInfo } from "@/features/workspaces/api/use-get-workspace-info";

export const WorkspaceIdJoinClient = () => {
  const workspaceId = useWorkspaceId();
  const { data: initialValues, isLoading } = useGetWorkspaceInfo({
    workspaceId,
  });

  if (isLoading) {
    return <PageLoader />;
  }
  if (!initialValues) {
    return <PageError message="Workspace not found" />;
  }

  return (
    <div className="w-full lg:max-w-xl mx-auto">
        <div className="flex flex-col gap-y-4">
        <JoinWorkspaceForm initialValues={initialValues} />
      </div>
    </div>
  );
};
