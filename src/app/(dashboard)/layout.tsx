import { Sidebar } from "@/components/sidebar";
import { Navbar } from "@/components/navbar";

import { CreateWorkspaceModal } from "@/features/workspaces/components/create-workspace-modal";
import { CreateProjectModal } from "@/features/projects/components/create-project-modal";
import { CreateTaskModal } from "@/features/tasks/components/create-task-modal";
import { EditTaskModal } from "@/features/tasks/components/edit-task-modal";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col">
      <CreateWorkspaceModal />
      <CreateProjectModal />
      <CreateTaskModal />
      <EditTaskModal />
      <Navbar />
      <div className="flex flex-1">
        <div className="hidden md:block w-[220px] flex-shrink-0">
          <Sidebar />
        </div>
        <main className="flex-1 p-3 md:p-6 overflow-x-hidden w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
