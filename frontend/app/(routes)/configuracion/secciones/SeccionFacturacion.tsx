"use client";

// Sección "Facturación" del panel de configuración. Cada sección es autocontenida (carga y
// guarda su propio pedazo de configuración) — ver ConfiguracionClient.tsx para cómo se registra.
import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SeccionFacturacion() {
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [notaFactura, setNotaFactura] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/empresa-config`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) {
          const data = await res.json();
          setNotaFactura(data.notaFactura ?? "");
        }
      } catch (error: any) {
        toast({
          title: "Error al cargar la configuración",
          description: error?.message ?? "Inténtalo de nuevo.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardar = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No hay token de autorización");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/empresa-config`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ notaFactura }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "No se pudo guardar");
      }
      toast({ title: "✅ Configuración guardada" });
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

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="border rounded-lg p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-sm">Nota en el PDF de pedidos</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Aparece al final del PDF de cada pedido, solo si escribes algo
            aquí. Útil para condiciones de pago propias de tu empresa, ej:
            &ldquo;Pagando antes de 8 días, 5% de descuento&rdquo;.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notaFactura">Texto de la nota</Label>
          <textarea
            id="notaFactura"
            value={notaFactura}
            onChange={(e) => setNotaFactura(e.target.value)}
            maxLength={600}
            placeholder="Ej: Pagando antes de 8 días, 5% de descuento. Después de 30 días se cobran intereses de mora."
            className="w-full min-h-24 rounded-md border border-input bg-background p-3 text-sm"
          />
          <p className="text-xs text-muted-foreground text-right">
            {notaFactura.length}/600
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={guardar}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
