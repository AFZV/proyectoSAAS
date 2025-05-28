// components/ReciboActions.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import axios from "axios";

interface Usuario {
  usuarioId: string;
  empresaId: string;
  rol: string;
  nombreEmpresa: string;
}

import { useAuth } from "@clerk/nextjs";
export function ReciboActions({ id }: { id: string }) {
  const [admin, setAdmin] = useState<boolean>(false);
  const router = useRouter();
  const [user, setUser] = useState<Usuario>({
    usuarioId: "",
    empresaId: "",
    rol: "",
    nombreEmpresa: "",
  });
  const { userId } = useAuth();
  useEffect(() => {
    const verificarRol = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/usuario-actual`,
          {
            headers: {
              Authorization: userId ?? "",
            },
          }
        );
        const usuario = res.data;
        console.log("usuario actual:", usuario);
        setUser({ ...usuario });
        setAdmin(usuario.rol === "admin");
      } catch (err) {
        console.error("Error al verificar rol:", err);
      }
    };

    verificarRol();
  }, []);

  const handleEliminar = async () => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/recibos/${id}`);
      toast({ title: "Recibo eliminado correctamente" });
    } catch (error) {
      console.error("Error eliminando recibo:", error);
      toast({
        title: "Error al eliminar el recibo",
        variant: "destructive",
      });
    }
  };

  if (!admin) return null;

  return (
    <div className="flex justify-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              className="bg-sky-500"
              onClick={() => router.push(`/recaudos/${id}`)}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Editar</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="destructive" onClick={handleEliminar}>
              <TrashIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Eliminar</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
