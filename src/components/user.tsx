"use client";
 
 import { useRouter } from "next/navigation";
 import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
 import { Avatar, AvatarFallback } from "@/components/ui/avatar";
 import { Button } from "@/components/ui/button";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 import { Separator } from "@/components/ui/separator";
 import { Loader } from "lucide-react";
 import { useLogout } from "@/features/auth/api/use-logout";
 import { useCurrent } from "@/features/auth/api/use-current";
 
 export const User = () => {
   const router = useRouter();
   const workspaceId = useWorkspaceId();
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
 
   const avatarFallback = user.user_metadata.name
     ? user.user_metadata.name.charAt(0).toUpperCase()
     : user.user_metadata.email.charAt(0).toUpperCase() ?? "U";
 
   return (
     <div className="mt-auto border-t">
       <DropdownMenu>
         <DropdownMenuTrigger asChild>
           <Button variant="ghost" className="w-full justify-start px-2 h-auto py-2">
             <Avatar className="h-8 w-8">
               <AvatarFallback>{avatarFallback}</AvatarFallback>
             </Avatar>
             <div className="flex flex-col items-start gap-0.5 min-w-0">
               <span className="text-sm font-medium truncate w-full">
                 {user.user_metadata.name || "User"}
               </span>
               <span className="text-xs text-muted-foreground truncate w-full">
                 {user.user_metadata.email || "No email"}
               </span>
             </div>
           </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end" className="w-[200px]">
           <DropdownMenuItem onClick={() => router.push(`/workspaces/${workspaceId}/profile`)}>
             Profile
           </DropdownMenuItem>
           <DropdownMenuItem onClick={() => router.push(`/workspaces/${workspaceId}/settings`)}>
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