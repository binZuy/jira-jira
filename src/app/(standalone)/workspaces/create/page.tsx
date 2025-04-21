import { getCurrent } from "@/features/auth/queries";
import { CreateWorkspaceForm } from "@/features/workspaces/components/create-workspace-form";

import { redirect } from "next/navigation";

const WorkspaceCreatePage = async () => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  return (
    <div className="w-full lg:max-w-xl mx-auto">
      <div className="flex flex-col gap-y-4">
        <CreateWorkspaceForm />
      </div>
    </div>
  );
};

export default WorkspaceCreatePage;
