"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw } from "lucide-react";
import { ClienteCartera } from "../ListCartera/ListCartera.types";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";

const searchSchema = z.object({
  searchTerm: z.string().min(1, "Ingrese NIT o nombre para buscar"),
});

export function BuscarClienteCartera({
  onClienteSeleccionado,
}: {
  onClienteSeleccionado: (cliente: ClienteCartera) => void;
}) {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [isSearching, setIsSearching] = useState(false);

  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
  });

  const onSubmit = async (values: z.infer<typeof searchSchema>) => {
    setIsSearching(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/clientes/getByFilter/${values.searchTerm}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Cliente no encontrado");

      const clientes = await response.json();
      const cliente = Array.isArray(clientes) ? clientes[0] : clientes;

      if (!cliente) throw new Error("Cliente no encontrado");

      const clienteCartera: ClienteCartera = {
        id: cliente.id,
        nit: cliente.nit,
        nombre: cliente.nombre,
        apellidos: cliente.apellidos,
        telefono: cliente.telefono,
        email: cliente.email,
        ciudad: cliente.ciudad,
        balance: 0, // puede actualizarse luego
        usuario: cliente.usuarioId || "",
      };

      onClienteSeleccionado(clienteCartera);
      toast({
        title: "Cliente cargado",
        description: `${cliente.nombre} ${cliente.apellidos}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="w-5 h-5 text-muted-foreground" />
        <Input
          {...form.register("searchTerm")}
          placeholder="Buscar por NIT o nombre"
          className="flex-1"
        />
      </div>

      <Button
        type="submit"
        disabled={isSearching}
        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
      >
        {isSearching ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Buscando...
          </>
        ) : (
          <>
            <Search className="w-4 h-4 mr-2" />
            Buscar Cliente
          </>
        )}
      </Button>
    </form>
  );
}
