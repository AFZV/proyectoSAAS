"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Palette, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { catalogService } from "../../services/catalog.services";
import type { CatalogoConfig } from "../../types/catalog.types";

interface CatalogoConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_CONFIG: CatalogoConfig = {
  colorPrimario: "#2563eb",
  colorSecundario: "#f59e0b",
  bannerUrl: "",
  mensajeBienvenida: "",
  whatsappContacto: "",
  avisoDestacado: "",
  colorFondo: "#f8fafc",
  colorMarcoImagenes: "#f1f5f9",
  mostrarPrecio: true,
  mostrarStock: true,
  permitirCarrito: false,
};

// Campo color: swatch + input de texto sincronizados
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 rounded border cursor-pointer flex-shrink-0"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs"
        />
      </div>
    </div>
  );
}

// Interruptor simple (sin dependencia nueva de Radix Switch)
function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <Label className="cursor-pointer" onClick={() => onChange(!checked)}>
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export function CatalogoConfigModal({
  isOpen,
  onClose,
}: CatalogoConfigModalProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [config, setConfig] = useState<CatalogoConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    if (isOpen) fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const data = await catalogService.getCatalogoConfig(token);
      setConfig({ ...DEFAULT_CONFIG, ...data });
    } catch (error: any) {
      toast({
        title: "Error al cargar la configuración",
        description: error?.message ?? "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBannerChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No hay token de autorización");
      const { url } = await catalogService.subirBannerCatalogo(token, file);
      setConfig((prev) => ({ ...prev, bannerUrl: url }));
      toast({ title: "✅ Banner subido correctamente" });
    } catch (error: any) {
      toast({
        title: "Error al subir el banner",
        description: error?.message ?? "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setUploadingBanner(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No hay token de autorización");
      await catalogService.updateCatalogoConfig(token, {
        colorPrimario: config.colorPrimario,
        colorSecundario: config.colorSecundario,
        bannerUrl: config.bannerUrl,
        mensajeBienvenida: config.mensajeBienvenida,
        whatsappContacto: config.whatsappContacto,
        avisoDestacado: config.avisoDestacado,
        colorFondo: config.colorFondo,
        colorMarcoImagenes: config.colorMarcoImagenes,
        mostrarPrecio: config.mostrarPrecio,
        mostrarStock: config.mostrarStock,
        permitirCarrito: config.permitirCarrito,
      });
      toast({ title: "✅ Configuración guardada" });
      onClose();
    } catch (error: any) {
      toast({
        title: "Error al guardar",
        description: error?.message ?? "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-600" />
            Personalizar catálogo
          </DialogTitle>
          <DialogDescription>
            Esto define cómo se ve el catálogo público que compartes con tus
            clientes. Todos los campos son opcionales.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Colores de marca */}
            <div className="grid grid-cols-2 gap-4">
              <ColorField
                label="Color primario"
                value={config.colorPrimario}
                onChange={(v) =>
                  setConfig((prev) => ({ ...prev, colorPrimario: v }))
                }
              />
              <ColorField
                label="Color secundario"
                value={config.colorSecundario}
                onChange={(v) =>
                  setConfig((prev) => ({ ...prev, colorSecundario: v }))
                }
              />
            </div>

            {/* Colores de fondo */}
            <div className="grid grid-cols-2 gap-4">
              <ColorField
                label="Fondo de la página"
                value={config.colorFondo}
                onChange={(v) =>
                  setConfig((prev) => ({ ...prev, colorFondo: v }))
                }
              />
              <ColorField
                label="Marco de las imágenes"
                value={config.colorMarcoImagenes}
                onChange={(v) =>
                  setConfig((prev) => ({ ...prev, colorMarcoImagenes: v }))
                }
              />
            </div>
            <p className="text-xs text-muted-foreground -mt-3">
              La foto del producto se ve completa (sin recortar); este color
              rellena el espacio sobrante alrededor, como un marco.
            </p>

            {/* Banner */}
            <div className="space-y-2">
              <Label>Banner del catálogo</Label>
              {config.bannerUrl && (
                <img
                  src={config.bannerUrl}
                  alt="Banner del catálogo"
                  className="w-full h-28 object-cover rounded-md border"
                />
              )}
              <label className="flex items-center justify-center gap-2 border border-dashed rounded-md p-3 text-sm text-muted-foreground cursor-pointer hover:bg-gray-50">
                {uploadingBanner ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploadingBanner ? "Subiendo..." : "Subir imagen de banner"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleBannerChange}
                  disabled={uploadingBanner}
                />
              </label>
            </div>

            {/* Aviso destacado */}
            <div className="space-y-2">
              <Label>Aviso destacado</Label>
              <Input
                value={config.avisoDestacado}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    avisoDestacado: e.target.value,
                  }))
                }
                maxLength={160}
                placeholder="Ej: Envíos a toda Colombia · Pedido mínimo $200.000"
              />
              <p className="text-xs text-muted-foreground">
                Aparece como barra destacada arriba del catálogo.
              </p>
            </div>

            {/* Mensaje de bienvenida */}
            <div className="space-y-2">
              <Label>Mensaje de bienvenida</Label>
              <Input
                value={config.mensajeBienvenida}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    mensajeBienvenida: e.target.value,
                  }))
                }
                maxLength={140}
                placeholder="Ej: Catálogo mayorista 2026"
              />
            </div>

            {/* WhatsApp de contacto */}
            <div className="space-y-2">
              <Label>WhatsApp de contacto (para pedidos)</Label>
              <Input
                value={config.whatsappContacto}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    whatsappContacto: e.target.value,
                  }))
                }
                placeholder="Ej: 573001234567"
              />
              <p className="text-xs text-muted-foreground">
                Incluye indicativo de país, sin espacios ni símbolos.
              </p>
            </div>

            {/* Visibilidad de datos del producto */}
            <div className="border rounded-md p-3 space-y-1 bg-slate-50">
              <ToggleField
                label="Mostrar precio"
                description="Si lo desactivas, el cliente ve 'Consultar precio'."
                checked={config.mostrarPrecio ?? true}
                onChange={(v) =>
                  setConfig((prev) => ({ ...prev, mostrarPrecio: v }))
                }
              />
              <ToggleField
                label="Mostrar stock exacto"
                description="Si lo desactivas, no se muestra la cantidad disponible."
                checked={config.mostrarStock ?? true}
                onChange={(v) =>
                  setConfig((prev) => ({ ...prev, mostrarStock: v }))
                }
              />
            </div>

            {/* Modo de pedido */}
            <div className="border rounded-md p-3 bg-slate-50">
              <ToggleField
                label="Permitir carrito de pedido"
                description="Si lo activas, el cliente arma un carrito con varios productos y lo envía todo junto por WhatsApp en un solo mensaje (en vez de un mensaje por producto)."
                checked={config.permitirCarrito ?? false}
                onChange={(v) =>
                  setConfig((prev) => ({ ...prev, permitirCarrito: v }))
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || uploadingBanner}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Guardar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
