"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ValidateClientStep } from "./ValidateClientStep";
import { CreateClientStep } from "./CreateClientStep";
import { SetPasswordStep } from "./SetPasswordStep";
import Link from "next/link";
import { UserPlus, CheckCircle } from "lucide-react";

type RegisterStep = "validate" | "createClient" | "password" | "success";

interface Empresa {
  id: string;
  nombre: string;
  nit: string;
}

interface ClientData {
  id: string;
  nit: string;
  nombres: string;
  apellidos: string;
  correo?: string;
  empresas?: Empresa[]; // Empresas asociadas al cliente (solo para clientes existentes)
}

export function RegisterFlow() {
  const [step, setStep] = useState<RegisterStep>("validate");
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [nitToCreate, setNitToCreate] = useState<string>("");

  const handleClientValidated = (client: ClientData) => {
    setClientData(client);
    setStep("password");
  };

  const handleClientNotFound = (nit: string) => {
    setNitToCreate(nit);
    setStep("createClient");
  };

  const handleClientCreated = (client: ClientData) => {
    setClientData(client);
    // Cliente nuevo ya está completamente registrado (cliente + usuario + Clerk)
    // Va directo a pantalla de éxito
    setStep("success");
  };

  const handlePasswordSet = () => {
    setStep("success");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="w-full max-w-2xl">
        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur">
          <CardHeader className="text-center space-y-2 pb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-slate-800">
              Registro de Usuario
            </CardTitle>
            <CardDescription className="text-base text-slate-600">
              {step === "validate" && "Valida tu información como cliente"}
              {step === "createClient" && "Crea tu perfil de cliente"}
              {step === "password" && "Configura tu contraseña de acceso"}
              {step === "success" && "¡Registro completado!"}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            {step === "validate" && (
              <ValidateClientStep
                onClientValidated={handleClientValidated}
                onClientNotFound={handleClientNotFound}
              />
            )}

            {step === "createClient" && (
              <CreateClientStep
                nitPrecargado={nitToCreate}
                onClientCreated={handleClientCreated}
              />
            )}

            {step === "password" && clientData && (
              <SetPasswordStep
                clientData={clientData}
                onPasswordSet={handlePasswordSet}
              />
            )}

            {step === "success" && (
              <div className="text-center space-y-6">
                <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">
                  ¡Registro Exitoso!
                </h3>
                <p className="text-slate-600">
                  Tu cuenta ha sido creada correctamente. Ya puedes iniciar
                  sesión.
                </p>
                <Link
                  href="/sign-in"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
                >
                  Ir a Iniciar Sesión
                </Link>
              </div>
            )}

            <div className="text-center mt-6">
              <p className="text-sm text-slate-600">
                ¿Ya tienes una cuenta?{" "}
                <Link
                  href="/sign-in"
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Inicia sesión aquí
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
