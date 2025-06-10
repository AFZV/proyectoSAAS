"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Building } from "lucide-react";

interface LogoProps {
  logoUrl?: string;
  empresaName?: string;
}

export function Logo({ logoUrl, empresaName }: LogoProps) {
  const router = useRouter();

  return (
    <div
      className="flex items-center p-6 cursor-pointer group transition-all duration-200 hover:bg-muted/50"
      onClick={() => router.push("/")}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {/* Logo o ícono fallback */}
        <div className="relative flex-shrink-0">
          {logoUrl ? (
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted ring-2 ring-primary/10 group-hover:ring-primary/20 transition-all duration-200">
              <Image
                src={logoUrl}
                alt="Logo"
                width={40}
                height={40}
                className="w-full h-full object-cover"
                priority
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-200">
              <Building className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
          )}
        </div>

        {/* Nombre de la empresa */}
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors duration-200">
            {empresaName || "Panel Recaudos"}
          </h1>
          <p className="text-xs text-muted-foreground">
            Sistema de gestión
          </p>
        </div>
      </div>

      {/* Indicador visual */}
      <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity duration-200" />
    </div>
  );
}