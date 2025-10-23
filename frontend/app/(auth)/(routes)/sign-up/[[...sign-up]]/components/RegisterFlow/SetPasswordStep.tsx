"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, User, Building2, Eye, EyeOff } from "lucide-react";

const passwordSchema = z
  .object({
    empresaId: z.string().min(1, "Debe seleccionar una empresa"),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
      .regex(/[a-z]/, "Debe contener al menos una minúscula")
      .regex(/[0-9]/, "Debe contener al menos un número")
      .regex(
        /[^A-Za-z0-9]/,
        "Debe contener al menos un carácter especial (#, @, !, etc.)"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

interface Empresa {
  id: string;
  nombre: string;
  nit: string;
}

interface SetPasswordStepProps {
  clientData: {
    id: string;
    nit: string;
    nombres: string;
    apellidos: string;
    correo?: string;
    empresas?: Array<{
      id: string;
      nombre: string;
      nit: string;
    }>;
  };
  onPasswordSet: () => void;
}

export function SetPasswordStep({
  clientData,
  onPasswordSet,
}: SetPasswordStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>(
    clientData.empresas || []
  );
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      // Si solo hay 1 empresa, preseleccionarla automáticamente
      empresaId:
        clientData.empresas?.length === 1 ? clientData.empresas[0].id : "",
    },
  });

  // Ya no necesitamos cargar empresas, las recibimos del clientData
  // useEffect eliminado

  const onSubmit = async (data: PasswordFormData) => {
    setIsLoading(true);

    try {
      // Cliente existente: solo asignar password
      const endpoint = `${process.env.NEXT_PUBLIC_API_URL}/auth/public/cliente-existente/asignar-password`;
      const payload = {
        nit: clientData.nit,
        empresaId: data.empresaId,
        password: data.password,
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al crear cuenta");
      }

      const resultado = await response.json();

      toast({
        title: "¡Cuenta creada exitosamente!",
        description: `Usuario ${resultado.usuario.username} creado correctamente`,
      });

      onPasswordSet();
    } catch (error: any) {
      console.error("Error creando usuario:", error);

      // Manejo de errores específicos
      if (error.message?.includes("pwned")) {
        toast({
          title: "Contraseña insegura",
          description:
            "Esta contraseña ha sido filtrada en brechas de seguridad. Usa una contraseña más segura.",
          variant: "destructive",
        });
      } else if (error.message?.includes("email")) {
        toast({
          title: "Email ya registrado",
          description: "Este email ya está en uso. Intenta iniciar sesión.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description:
            typeof error === "string"
              ? error
              : error.message || "No se pudo crear la cuenta",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Información del cliente */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold text-blue-900">Cliente Validado</h4>
        </div>
        <div className="space-y-1 text-sm text-blue-700">
          <p>
            <strong>Nombre:</strong> {clientData.nombres} {clientData.apellidos}
          </p>
          <p>
            <strong>NIT:</strong> {clientData.nit}
          </p>
          {clientData.correo && (
            <p>
              <strong>Correo:</strong> {clientData.correo}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Selector de Empresa */}
        <div className="space-y-2">
          <Label
            htmlFor="empresaId"
            className="text-sm font-medium text-slate-700"
          >
            Empresa <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
            <select
              id="empresaId"
              {...register("empresaId")}
              disabled={isLoading || empresas.length === 0}
              className="w-full border border-slate-200 bg-slate-50 pl-10 pr-3 py-2 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                {empresas.length === 0
                  ? "No tienes empresas asociadas"
                  : "Selecciona una empresa"}
              </option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nombre}
                </option>
              ))}
            </select>
          </div>
          {errors.empresaId && (
            <p className="text-sm text-red-600">{errors.empresaId.message}</p>
          )}
          {empresas.length === 0 ? (
            <p className="text-xs text-red-500">
              ⚠️ No tienes empresas asociadas. Contacta con tu vendedor.
            </p>
          ) : empresas.length === 1 ? (
            <p className="text-xs text-green-600">
              ✓ Empresa preseleccionada automáticamente
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Selecciona la empresa con la que trabajas
            </p>
          )}
        </div>

        {/* Contraseña */}
        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-sm font-medium text-slate-700"
          >
            Contraseña
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              {...register("password")}
              disabled={isLoading}
              className="pl-10 pr-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          )}
          <p className="text-xs text-slate-500">
            Mínimo 8 caracteres: mayúscula, minúscula, número y carácter
            especial
          </p>
        </div>

        {/* Confirmar Contraseña */}
        <div className="space-y-2">
          <Label
            htmlFor="confirmPassword"
            className="text-sm font-medium text-slate-700"
          >
            Confirmar Contraseña
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              {...register("confirmPassword")}
              disabled={isLoading}
              className="pl-10 pr-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-red-600">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading || empresas.length === 0}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creando cuenta...
            </>
          ) : (
            "Crear Cuenta"
          )}
        </Button>
      </form>
    </div>
  );
}
