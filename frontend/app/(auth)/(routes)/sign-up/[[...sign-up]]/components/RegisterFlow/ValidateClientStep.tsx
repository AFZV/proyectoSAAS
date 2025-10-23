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
      // Llamar directamente al backend público (sin autenticación)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/clientes/public/existe?nit=${data.nit}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: "Cliente no encontrado",
            description:
              "No existe un cliente con ese NIT. Vamos a crear tu perfil.",
          });
          onClientNotFound(data.nit);
          return;
        }
        throw new Error("Error al buscar cliente");
      }

      const resultado = await response.json();

      // El backend devuelve { existe: true, cliente: {...}, tieneCuenta: boolean }
      if (resultado.existe && resultado.cliente) {
        // Si YA tiene cuenta creada, redirigir a login
        if (resultado.tieneCuenta) {
          toast({
            title: "Cuenta ya existente",
            description: `${resultado.cliente.nombre}, ya tienes una cuenta. Por favor inicia sesión.`,
            variant: "destructive",
          });

          // Redirigir al login después de 2 segundos
          setTimeout(() => {
            window.location.href = "/sign-in";
          }, 2000);
          return;
        }

        // Si NO tiene cuenta, continuar con el proceso de asignar contraseña
        toast({
          title: "Cliente encontrado",
          description: `Bienvenido ${resultado.cliente.nombre} ${resultado.cliente.apellidos}. Configura tu contraseña.`,
        });

        // Las empresas ya vienen con la estructura correcta del backend:
        // { id, nombre, nit }
        const empresasFormateadas = resultado.cliente.empresas || [];

        onClientValidated({
          id: resultado.cliente.id,
          nit: resultado.cliente.nit,
          nombres: resultado.cliente.nombre,
          apellidos: resultado.cliente.apellidos,
          correo: resultado.cliente.email,
          empresas: empresasFormateadas,
        });
      } else {
        // No debería llegar aquí, pero por seguridad
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
