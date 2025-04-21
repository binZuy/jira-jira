import { Separator } from "./ui/separator";
import { Navigation } from "./navigation";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { Projects } from "./projects";
import { User } from "./user";

export const Sidebar = () => {
  return (
    <aside className="h-full bg-neutral-100 p-4 w-full flex flex-col">
      <div className="flex-1 flex-col">
        <Separator />
        <WorkspaceSwitcher />
        <Separator className="my-2 mx-2" />
        <Navigation />
        <Separator />
        <Projects />
      </div>
      <User />
    </aside>
  );
};
