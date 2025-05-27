"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import axios from "axios";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Loading } from "@/components/Loading";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const formSchema = z.object({
  numeroRecibo: z.string(),
  codigoCliente: z.string().min(5).max(11),
  codigoUsuario: z.string().max(50),
  valor: z.number().min(1),
  customer: z.string().min(2).max(100),
  ciudad: z.string(),
  email: z.string().email("Correo electrónico inválido"),
  tipo: z.string().optional(),
  concepto: z.string().optional(),
});

interface Cliente {
  nombres: string;
  apellidos: string;
  email: string;
  codigoCiud: string;
}

export default function FormUpdateRecaudo() {
  const { id } = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [clienteNuevo, setClienteNuevo] = useState<Cliente | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (id && typeof id === "string") {
      getRecibo();
    }
  }, [id]);

  const getRecibo = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/recibos/${id}`,
        {
          headers: {
            Authorization: localStorage.getItem("clerkUserId") || "",
          },
        }
      );
      const recibo = response.data;

      form.reset({
        numeroRecibo: recibo.id,
        codigoCliente: recibo.cliente.nit,
        valor: recibo.valor,
        customer: `${recibo.cliente.nombres} ${recibo.cliente.apellidos}`,
        ciudad: recibo.cliente.codigoCiud,
        email: recibo.cliente.email,
        codigoUsuario: recibo.vendedor?.id || "",
        tipo: recibo.tipo,
        concepto: recibo.concepto,
      });
    } catch (error) {
      console.error("Error al obtener recibo:", error);
    }
  };

  const onClickSearch = async () => {
    try {
      setIsLoading(true);
      const nit = form.getValues("codigoCliente");
      if (!nit) return;

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/clientes/${nit}`,
        {
          headers: {
            Authorization: localStorage.getItem("clerkUserId") || "",
          },
        }
      );

      const data = response.data;

      form.setValue("customer", `${data.nombres} ${data.apellidos}`);
      form.setValue("ciudad", data.codigoCiud || "");
      form.setValue("email", data.email || "");
      form.setValue("codigoUsuario", data.codigoVend || "");

      setClienteNuevo(data);
    } catch (error) {
      console.error("Error buscando cliente:", error);
      toast({ title: "Cliente no encontrado", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/recibos/${id}`,
        {
          valor: values.valor,
          tipo: values.tipo || "PAGO",
          concepto: values.concepto || "Pago de factura",
        },
        {
          headers: {
            Authorization: localStorage.getItem("clerkUserId") || "",
          },
        }
      );

      await axios.post("/api/send", {
        numeroRecibo: id,
        customer: values.customer,
        ciudad: values.ciudad,
        valor: values.valor,
        tipo: values.tipo || "PAGO",
        concepto: values.concepto || "Pago de factura",
        email: values.email,
        actualizacion: true,
      });

      toast({ title: "Recibo actualizado correctamente" });
      router.push("/recaudos");
      router.refresh();
    } catch (error) {
      console.error("Error al actualizar recibo:", error);
      toast({
        title: "Error al actualizar el recibo",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {isSubmitting && <Loading title="Actualizando Recibo" />}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-3 gap-3">
            {/* Número y búsqueda de cliente */}
            <div className="col-span-1 flex justify-between gap-x-2">
              <FormField
                control={form.control}
                name="numeroRecibo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de recibo</FormLabel>
                    <FormControl>
                      <Input disabled type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="codigoCliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIT</FormLabel>
                    <FormControl>
                      <Input placeholder="NIT del cliente" {...field} />
                    </FormControl>
                    <FormDescription>Buscar cliente por NIT</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <button type="button" onClick={onClickSearch}>
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500" />
                ) : (
                  <Search strokeWidth={3} />
                )}
              </button>
            </div>

            {/* Datos del cliente */}
            <FormField
              control={form.control}
              name="customer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <FormControl>
                    <Input disabled {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ciudad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad</FormLabel>
                  <FormControl>
                    <Input disabled {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input disabled {...field} />
                  </FormControl>
                  <FormDescription>
                    Correo al que se enviará el recibo
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="codigoUsuario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendedor</FormLabel>
                  <FormControl>
                    <Input disabled {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campos editables */}
            <FormField
              control={form.control}
              name="valor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(e.target.valueAsNumber || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de pago</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full border rounded-md p-2">
                      <option value="">Selecciona un tipo</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="consignacion">Consignación</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="concepto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concepto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Abono a factura 123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button disabled={!form.formState.isValid} type="submit">
            Actualizar
          </Button>
        </form>
      </Form>
    </div>
  );
}
