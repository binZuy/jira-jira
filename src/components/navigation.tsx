"use client";

import {
  GoHome,
  GoHomeFill,
  GoCheckCircle,
  GoCheckCircleFill,
} from "react-icons/go";
import { BotMessageSquare, SettingsIcon, UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { usePathname } from "next/navigation";
import Link from "next/link";

const routes = [
  { label: "Home", href: "", icon: GoHome, activeIcon: GoHomeFill },
  {
    label: "My Tasks",
    href: "/tasks",
    icon: GoCheckCircle,
    activeIcon: GoCheckCircleFill,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: SettingsIcon,
    activeIcon: SettingsIcon,
  },
  {
    label: "Members",
    href: "/members",
    icon: UsersIcon,
    activeIcon: UsersIcon,
  },
  {
    label: "AI Chats",
    href: "/chats",
    icon: BotMessageSquare,
    activeIcon: BotMessageSquare,
  }
];

export const Navigation = () => {
  const workspaceId = useWorkspaceId();
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {routes.map((item) => {
        const fullHref = `/workspaces/${workspaceId}${item.href}`;
        const isActive = pathname === fullHref;
        const Icon = isActive ? item.activeIcon : item.icon;

        return (
          <Link
            key={item.href}
            href={fullHref}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:text-primary",
              isActive && "bg-muted text-primary"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
