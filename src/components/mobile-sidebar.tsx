"use client";

import {useEffect, useState} from "react";
import { MenuIcon } from "lucide-react";

import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Sidebar } from "./sidebar";
import { usePathname } from "next/navigation";

export const MobileSidebar = () => {
    const [ isOpen, setIsOpen ] = useState(false);
    const pathname= usePathname();
    
    useEffect(()=> {
        setIsOpen(false);
    }, [pathname]);
  return (
    <Sheet modal={false} open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
      <Button variant="outline" size="icon" className="md:hidden">
           <MenuIcon className="h-5 w-5" />
           <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-[280px]">
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
};
