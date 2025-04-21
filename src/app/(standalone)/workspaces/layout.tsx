"use client";

import { UserButton } from "@/features/auth/components/user-button";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/features/chats/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Zap } from "lucide-react";

interface StandAloneLayoutProps {
  children: React.ReactNode;
}

const StandAloneLayout = ({ children }: StandAloneLayoutProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isAIMode, setIsAIMode] = useState(true);
  
  // Update AI mode based on route
  useEffect(() => {
    // Check if we're in a chat route
    setIsAIMode(pathname.includes('/chats'));
  }, [pathname]);
  
  return (
    <div className="bg-neutral-100 min-h-screen">
      <div className="mx-auto max-w-screen-2xl">
        <nav className="flex justify-between items-center h-16">
          <div className="opacity-0">Logo</div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center rounded-md border bg-muted/20">
              <Button
                variant={isAIMode ? "primary" : "ghost"}
                size="sm"
                className={`h-8 px-3 ${isAIMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                onClick={() => {
                  setIsAIMode(true);
                  if (!pathname.includes('/chats')) {
                    // Navigate to chats route
                    const workspaceId = pathname.split('/').filter(segment => segment !== '')[1];
                    router.push(`/workspaces/${workspaceId}/chats`);
                  }
                }}
              >
                <Zap className="h-4 w-4 mr-1.5 md:mr-2" />
                <span className="text-xs md:text-sm">Boost AI</span>
              </Button>
              <Button
                variant={!isAIMode ? "primary" : "ghost"}
                size="sm"
                className={`h-8 px-3 ${!isAIMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                onClick={() => {
                  setIsAIMode(false);
                  if (pathname.includes('/chats')) {
                    // Navigate to workspace route without /chats
                    const workspaceId = pathname.split('/').filter(segment => segment !== 'chats' && segment !== '')[1];
                    router.push(`/workspaces/${workspaceId}`);
                  }
                }}
              >
                <LayoutDashboard className="h-4 w-4 mr-1.5 md:mr-2" />
                <span className="text-xs md:text-sm">Classic</span>
              </Button>
            </div>
            <UserButton />
          </div>
        </nav>
        <SidebarProvider defaultOpen={false}>
          <AppSidebar />
          <SidebarInset>
            {children}
          </SidebarInset>
        </SidebarProvider>
      </div>
    </div>
  );
};

export default StandAloneLayout;
