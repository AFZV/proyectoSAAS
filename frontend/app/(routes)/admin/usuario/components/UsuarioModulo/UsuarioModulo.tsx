import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import React from "react";
import { UserCircle2Icon } from "lucide-react";

export function UsuarioModulo() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4">
      <Link href="/admin/usuario">
        <Card className="p-4 hover:shadow-md transition cursor-pointer rounded-2xl">
          <CardContent className="flex items-center gap-4">
            <UserCircle2Icon
              className="w-8 h-8 text-primary"
              strokeWidth={1.5}
            />
            <div>
              <h3 className="font-semibold text-lg">Usuarios</h3>
              <p className="text-sm text-muted-foreground">
                Modulo para gestion de empresas
              </p>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
