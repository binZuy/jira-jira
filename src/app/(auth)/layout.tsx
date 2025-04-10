"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";

import { usePathname } from "next/navigation";
import Link from "next/link";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  const pathname = usePathname();
  const isSignIn = pathname === "/sign-in";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40">
      <div className="w-full max-w-md">
          {children}
        </div>
      </div>
  );
};

export default AuthLayout;
