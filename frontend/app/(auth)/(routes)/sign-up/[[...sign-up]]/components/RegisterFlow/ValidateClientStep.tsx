"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2 } from "lucide-react";

const validateSchema = z.object({
  nit: z.string().min(1, "El NIT es requerido"),
});

type ValidateFormData = z.infer<typeof validateSchema>;

interface ValidateClientStepProps {
  onClientValidated: (client: {
    id: string;
    nit: string;
    nombres: string;
    apellidos: string;
    correo?: string;
    empresas?: Array<{ id: string; nombre: string }>;
  }) => void;
  onClientNotFound: (nit: string) => void;
}

export function ValidateClientStep({
  onClientValidated,
  onClientNotFound,
}: ValidateClientStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ValidateFormData>({
    resolver: zodResolver(validateSchema),
  });

  const onSubmit = async (data: ValidateFormData) => {
    setIsLoading(true);

    try {
      // Historia 2: Llamar endpoint público para validar NIT (sin autenticación)
      const response = await fetch(`/api/clientes/exists?nit=${data.nit}`);

      if (!response.ok) {
        throw new Error("Error al validar NIT");
      }

      const result = await response.json();

      if (result.exists && result.cliente) {
        const cliente = result.cliente;

        // Extraer empresas del cliente
        const empresas = cliente.empresas?.map((ce: any) => ({
          id: ce.empresa.id,
          nombre: ce.empresa.nombreComercial,
        })) || [];

        toast({
          title: "Cliente encontrado",
          description: `Bienvenido ${cliente.nombre} ${cliente.apellidos}`,
        });

        // Si el NIT existe → Historia 3: Asignar contraseña
        onClientValidated({
          id: cliente.id,
          nit: cliente.nit,
          nombres: cliente.nombre,
          apellidos: cliente.apellidos,
          correo: cliente.email,
          empresas,
        });
      } else {
        // Si el NIT NO existe → Historia 4: Alta de cliente nuevo
        toast({
          title: "Cliente no encontrado",
          description: "Vamos a crear tu perfil de cliente",
        });
        onClientNotFound(data.nit);
      }
    } catch (error) {
      console.error("Error validando cliente:", error);
      toast({
        title: "Error",
        description: "No se pudo validar el cliente. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="nit" className="text-sm font-medium text-slate-700">
          NIT del Cliente
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            id="nit"
            type="text"
            placeholder="Ingresa tu NIT"
            {...register("nit")}
            disabled={isLoading}
            className="pl-10 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {errors.nit && (
          <p className="text-sm text-red-600">{errors.nit.message}</p>
        )}
        <p className="text-xs text-slate-500">
          Ingresa el NIT registrado de tu empresa para continuar
        </p>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Buscando cliente...
          </>
        ) : (
          <>
            <Search className="w-4 h-4 mr-2" />
            Validar Cliente
          </>
        )}
      </Button>
    </form>
  );
}
