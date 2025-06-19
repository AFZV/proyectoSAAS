"use client";

import { Empresa } from "../ListEmpresas/columns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Mail, MapPin, Phone } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  empresa: Empresa | null;
}

export function EmpresaDetallesModal({ open, onClose, empresa }: Props) {
  if (!empresa) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Detalles de la Empresa
          </DialogTitle>
          <DialogDescription>
            Información completa de <strong>{empresa.nombreComercial}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-foreground">
          {/* Logo si existe */}
          {empresa.logoUrl && (
            <div className="flex justify-center">
              <img
                src={empresa.logoUrl}
                alt="Logo de empresa"
                className="w-20 h-20 rounded-full border object-cover"
              />
            </div>
          )}

          <div>
            <p>
              <strong>NIT:</strong> {empresa.nit}
            </p>
            <p>
              <strong>Razón Social:</strong> {empresa.razonSocial}
            </p>
            <p>
              <strong>Nombre Comercial:</strong> {empresa.nombreComercial}
            </p>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div>
              <p>
                <strong>Dirección:</strong> {empresa.direccion}
              </p>
              <p>
                {empresa.ciudad}, {empresa.departamento}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span>{empresa.correo}</span>
          </div>

          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span>{empresa.telefono}</span>
          </div>

          <div>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                empresa.estado === "activa"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
              }`}
            >
              {empresa.estado === "activa" ? "Activa" : "Inactivo"}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
