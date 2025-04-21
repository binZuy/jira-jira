import { redirect } from "next/navigation";

import { getCurrent } from "@/features/auth/queries";
import { MembersList } from "@/features/workspaces/components/members-list";

const WorkspaceIdMembersPage = async () => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");
  return (
    <div className="w-full lg:max-w-xl mx-auto">
        <div className="flex flex-col gap-y-4">
        <MembersList />
      </div>
    </div>
  );
};

export default WorkspaceIdMembersPage;
