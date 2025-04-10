"use client";

import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Menu, Zap } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "./sidebar"
import { useState } from "react"

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isAIMode, setIsAIMode] = useState(true)

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


    </header>
  )
}
