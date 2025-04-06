"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  const pathname = usePathname();
  const isSignIn = pathname === "/sign-in";

  return (
    <main className="bg-neutral-100 min-h-screen">
      <div className="mx-auto max-w-screen-2xl p-4">
        <nav className="flex justify-center items-center py-4">
          <Link href="/">
            <Image src="/logo.svg" height={56} width={156} alt="Logo" />
          </Link>
        </nav>
        <div className="flex flex-col items-center justify-center pt-4 md:pt-14">
          <div className="w-full max-w-[500px]">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
};

export default AuthLayout;
