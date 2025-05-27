"use client";
import React, { useEffect, useState } from "react";
import { CardEstadoPedido } from "../../components/CardEstadoPedido";
import { useParams } from "next/navigation";
import {
  BoxesIcon,
  FileCheckIcon,
  TruckIcon,
  ClipboardList,
  PackageX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loading } from "@/components/Loading";
import { formatFecha } from "@/utils/fechas";

interface Estado {
  estado: string;
  fecha: string; // ya formateada con formatFecha
  id: string;
  pedidoId: string;
}

export default function EstadoPedidoPage() {
  const { id } = useParams();
  const [estados, setEstados] = useState<Estado[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  console.log("estados en estados:", estados);

  useEffect(() => {
    if (id) {
      getEstadoPedido();
    }
  }, [id]);

  async function getEstadoPedido(): Promise<void> {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/pedido/${id}`);
      const data = await response.json();

      if (!Array.isArray(data) || !data.length) {
        toast({
          title: "Pedido no encontrado",
          variant: "destructive",
        });
      } else {
        const formateado = data.map((e: Estado) => ({
          ...e,
          fecha: formatFecha(e.fecha),
        }));
        setEstados(formateado);
        toast({
          title: "Pedido Encontrado",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Error al obtener el pedido:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const getFechaEstado = (nombre: string): string | undefined => {
    return estados.find((e) => e.estado === nombre)?.fecha;
  };

  const estadoAlcanzado = (nombre: string): boolean => {
    return estados.some((e) => e.estado === nombre);
  };

  if (isLoading) {
    return <Loading title="Cargando Pedido" />;
  }

  if (!estados.length) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center">
        <PackageX className="h-20 w-20 text-muted-foreground" />
        <h2 className="mt-6 text-2xl font-semibold">Pedido no encontrado</h2>
        <p className="mt-2 text-center text-muted-foreground">
          No pudimos encontrar información para el pedido con ID: {id}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col items-center justify-center">
      <div className="pb-20">
        <h2 className="text-center text-2xl font-semibold">
          Estado del pedido {id}
        </h2>
      </div>
      <div className="flex gap-6 text-center">
        <CardEstadoPedido
          icono={ClipboardList}
          titulo="Pedido Generado"
          descripcion="El pedido ha sido creado exitosamente y está pendiente de ser separado o procesado por el equipo logístico."
          fecha={getFechaEstado("generado")}
          colorIcono="#53576b"
          completado={estadoAlcanzado("generado")}
        />
        <CardEstadoPedido
          icono={BoxesIcon}
          titulo="Pedido Separado"
          descripcion="El pedido ha sido preparado y apartado. Está listo para ser facturado y enviado al cliente."
          fecha={getFechaEstado("separado")}
          colorIcono="#ad9a6f"
          completado={estadoAlcanzado("separado")}
        />
        <CardEstadoPedido
          icono={FileCheckIcon}
          titulo="Pedido Facturado"
          descripcion="Se ha generado la factura correspondiente al pedido. El documento está disponible y listo para su revisión o envío."
          fecha={getFechaEstado("facturado")}
          colorIcono="#201FF0"
          completado={estadoAlcanzado("facturado")}
        />
        <CardEstadoPedido
          icono={TruckIcon}
          titulo="Pedido Enviado"
          descripcion="El pedido ha sido entregado al transportador o enviado al cliente. Está en camino o ya fue recibido."
          fecha={getFechaEstado("enviado")}
          colorIcono="black"
          completado={estadoAlcanzado("enviado")}
        />
      </div>
    </div>
  );
}
