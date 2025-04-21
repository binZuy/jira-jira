"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Menu, Zap } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { useState, useEffect } from "react";
import { UserButton } from "@/features/auth/components/user-button";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAIMode, setIsAIMode] = useState(true);
  
  // Update AI mode based on route
  useEffect(() => {
    // Check if we're in a chat route
    setIsAIMode(pathname.includes('/chats'));
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-2 border-b bg-background px-3 md:px-6">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[280px]">
          <Sidebar />
        </SheetContent>
      </Sheet>
      
      {/* Left section - empty for balance */}
      <div className="flex-1"></div>
      
      {/* Right section - Mode Toggle and User Button */}
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
                const workspaceId = pathname.split('/').pop();
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
                const workspaceId = pathname.split('/').filter(segment => segment !== 'chats')[1];
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
    </header>
  );
}
