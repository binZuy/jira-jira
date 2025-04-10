import { Navigation } from "./navigation";
import { WorkspaceSwitcher } from "./workspace-switcher";
import {Projects} from "./projects";
import { Separator } from "@/components/ui-vercel/separator";
import { User } from "./user";

export const Sidebar = () => {
  return (
    <div className="flex h-full w-full flex-col border-r bg-muted/40">
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium">
          <Navigation />
          <Separator className="my-2 mx-2" />
          <Projects />
          <Separator />
          <WorkspaceSwitcher />
        </nav>
      </div>

      {/* User section */}
      <div className="mt-auto border-t p-4">
        <User />
      </div>
    </div>
  );
};
