"use client";

import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui-vercel/avatar";
import { Button } from "@/components/ui-vercel/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui-vercel/dropdown-menu";
import { Separator } from "@/components/ui-vercel/separator";
import { Loader } from "lucide-react";
import { useLogout } from "@/features/auth/api/use-logout";
import { useCurrent } from "@/features/auth/api/use-current";

export const User = () => {
  const router = useRouter();
  const { mutate: logout } = useLogout();
  const { data: user, isLoading } = useCurrent();

  if (isLoading) {
    return (
      <div className="mt-auto border-t p-4">
        <div className="h-8 w-8 rounded-full flex items-center justify-center bg-neutral-200 border-neutral-300">
          <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const { name, email } = user;
  const avatarFallback = name
    ? name.charAt(0).toUpperCase()
    : email.charAt(0).toUpperCase() ?? "U";

  return (
    <div className="mt-auto border-t px-2 py-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-start px-2 h-auto py-2">
            <Avatar className="h-8 w-8 mr-3">
              <AvatarFallback>{avatarFallback}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start gap-0.5 min-w-0">
              <span className="text-sm font-medium truncate w-full">
                {name || "User"}
              </span>
              <span className="text-xs text-muted-foreground truncate w-full">
                {email || "No email"}
              </span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuItem onClick={() => router.push("/profile")}>
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            Settings
          </DropdownMenuItem>
          <Separator className="my-1" />
          <DropdownMenuItem onClick={() => logout()}>
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default User; 