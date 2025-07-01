"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UserCircle2Icon,
  Mail,
  MapPin,
  Phone,
  MailOpen,
  UserCog2Icon,
  CheckCircle,
  XCircle,
  Building2Icon,
} from "lucide-react";
import { Usuario } from "../ListUsuarios/columns";

interface Props {
  open: boolean;
  onClose: () => void;
  usuario: Usuario | null;
}

export function UsuarioDetalleModal({ open, onClose, usuario }: Props) {
  if (!usuario) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle2Icon className="w-5 h-5 text-blue-600" />
            Detalles del Usuario
          </DialogTitle>
          <DialogDescription>
            Información completa de <strong>{usuario.id}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-foreground">
          <div>
            <p>
              <strong>Codigo:</strong> {usuario.codigo}
            </p>
            <p>
              <strong>Nombre:</strong> {usuario.nombre}
            </p>
            <p>
              <strong>Apellido:</strong> {usuario.apellidos}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <strong>Telefono:</strong> {usuario.telefono}
            </div>
            <div className="flex items-center gap-2">
              <MailOpen className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <p>
                {" "}
                <strong>Correo:</strong> {usuario.correo}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <UserCog2Icon className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <p>
                <strong>Rol:</strong> {usuario.rol}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Building2Icon className="w-4 h-4 text-muted-foreground" />
            <span>{usuario.empresa.nombreComercial}</span>
          </div>

          <div>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                usuario.estado === "activo"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {usuario.estado === "activo" ? (
                  <CheckCircle className="text-green-500" />
                ) : (
                  <XCircle className="text-red-500" />
                )}
                <span>{usuario.estado}</span>
              </div>
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
