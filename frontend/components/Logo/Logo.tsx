"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

interface LogoProps {
  logoUrl?: string;
  empresaName?: string;
}

export function Logo({ logoUrl, empresaName }: LogoProps) {
  const router = useRouter();
  return (
    <div
      className="min-h-20 h-20 flex items-center px-6 border-b cursor-pointer gap-2"
      onClick={() => router.push("/")}
    >
      <Image
        src={logoUrl || "/logo.svg"}
        alt="logo"
        width={40}
        height={40}
        className="rounded-full object-cover"
        priority
      />
      <h1 className="font-bold text-l text-center text-blue-600">
        {empresaName}
      </h1>
    </div>
  );
}
