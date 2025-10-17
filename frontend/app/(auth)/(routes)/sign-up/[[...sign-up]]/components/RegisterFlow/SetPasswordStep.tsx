"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSignUp } from "@clerk/nextjs";
import { Loader2, Lock, Mail, User, Building2 } from "lucide-react";

const passwordSchema = z
  .object({
    email: z.string().email("Email inválido"),
    empresaId: z.string().optional(), // Opcional para nuevos clientes sin empresas
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
      .regex(/[a-z]/, "Debe contener al menos una minúscula")
      .regex(/[0-9]/, "Debe contener al menos un número"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

interface SetPasswordStepProps {
  clientData: {
    id: string;
    nit: string;
    nombres: string;
    apellidos: string;
    correo?: string;
    empresas?: Array<{ id: string; nombre: string }>;
  };
  onPasswordSet: () => void;
}

export function SetPasswordStep({
  clientData,
  onPasswordSet,
}: SetPasswordStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useSignUp();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      email: clientData.correo || "",
    },
  });

  const onSubmit = async (data: PasswordFormData) => {
    if (!signUp) return;

    // Validar que si hay empresas disponibles, se haya seleccionado una
    const hasEmpresas = clientData.empresas && clientData.empresas.length > 0;
    if (hasEmpresas && !data.empresaId) {
      toast({
        title: "Empresa requerida",
        description: "Debes seleccionar una empresa para continuar",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Historia 3 y 4: Crear usuario en Clerk
      const clerkUser = await signUp.create({
        emailAddress: data.email,
        password: data.password,
        firstName: clientData.nombres,
        lastName: clientData.apellidos,
        unsafeMetadata: {
          clienteId: clientData.id,
          nit: clientData.nit,
          rol: "CLIENTE",
          ...(data.empresaId && { empresaId: data.empresaId }),
        },
      });

      // Solo llamar al backend si hay una empresa seleccionada (Historia 3)
      // Para clientes nuevos sin empresa (Historia 4), solo crear en Clerk por ahora
      if (data.empresaId) {
        const response = await fetch("/api/auth/client/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clerkUserId: clerkUser.createdUserId,
            email: data.email,
            clienteId: clientData.id,
            empresaId: data.empresaId,
            rol: "CLIENTE",
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Error al completar el registro en BD");
        }
      }

      // Preparar verificación de email
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      toast({
        title: "Cuenta creada",
        description: data.empresaId 
          ? "Se ha enviado un código de verificación a tu email"
          : "Tu cuenta ha sido creada. Un administrador debe asignarte a una empresa.",
      });

      onPasswordSet();
    } catch (error: any) {
      console.error("Error creando usuario:", error);

      if (error.errors?.[0]?.code === "form_identifier_exists") {
        toast({
          title: "Email ya registrado",
          description: "Este email ya está en uso. Intenta iniciar sesión.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description:
            error.message || error.errors?.[0]?.message || "No se pudo crear la cuenta",
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
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              {...register("email")}
              disabled={isLoading}
              className="pl-10 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Historia 3: Selección de empresa (solo si hay empresas disponibles) */}
        {clientData.empresas && clientData.empresas.length > 0 && (
          <div className="space-y-2">
            <Label
              htmlFor="empresaId"
              className="text-sm font-medium text-slate-700"
            >
              Empresa *
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 z-10 pointer-events-none" />
              <Select
                onValueChange={(value) => setValue("empresaId", value)}
                disabled={isLoading}
              >
                <SelectTrigger className="pl-10 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="Selecciona tu empresa" />
                </SelectTrigger>
                <SelectContent>
                  {clientData.empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {errors.empresaId && (
              <p className="text-sm text-red-600">{errors.empresaId.message}</p>
            )}
            <p className="text-xs text-slate-500">
              Selecciona la empresa a la que perteneces
            </p>
          </div>
        )}

        {/* Mensaje para clientes nuevos sin empresas */}
        {(!clientData.empresas || clientData.empresas.length === 0) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm text-yellow-800">
              <strong>Nota:</strong> Tu cuenta será creada sin empresa asignada.
              Un administrador deberá asignarte a una empresa antes de que puedas
              acceder al sistema completo.
            </p>
          </div>
        )}

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
              type="password"
              placeholder="••••••••"
              {...register("password")}
              disabled={isLoading}
              className="pl-10 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          )}
          <p className="text-xs text-slate-500">
            Mínimo 8 caracteres, una mayúscula, una minúscula y un número
          </p>
        </div>

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
              type="password"
              placeholder="••••••••"
              {...register("confirmPassword")}
              disabled={isLoading}
              className="pl-10 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-red-600">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
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
