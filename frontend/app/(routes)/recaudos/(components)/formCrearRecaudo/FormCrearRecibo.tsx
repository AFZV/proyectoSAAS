"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import axios from "axios";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Loading } from "@/components/Loading";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FormCrearReciboProps } from "./FormCrearRecibo.types";
import { useUser } from "@clerk/nextjs";

const formSchema = z.object({
  codigoCliente: z.string().min(5).max(11),
  valor: z.number().min(1),
  customer: z.string(),
  ciudad: z.string(),
  email: z.string(),
  tipo: z.string(),
  concepto: z.string(),
});

export function FormCrearRecibo({
  setOpenModalCreate,
  onSuccess,
}: FormCrearReciboProps) {
  const [clienteEncontrado, setClienteEncontrado] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem("clerkUserId", user.id);
    }
  }, [user]);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigoCliente: "",
      valor: 1,
      tipo: "",
      concepto: "",
      ciudad: "",
      customer: "",
      email: "",
    },
  });

  const buscarCliente = async () => {
    const nit = form.getValues("codigoCliente");
    if (!nit) return;

    try {
      setIsLoading(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/clientes/${nit}`,
        {
          headers: {
            Authorization: localStorage.getItem("clerkUserId") || "",
          },
        }
      );

      const data = response.data;

      if (!data) {
        toast({
          variant: "destructive",
          title: `El cliente con NIT ${nit} no fue encontrado`,
        });
        return;
      }

      form.setValue("customer", `${data.nombres} ${data.apellidos}`);
      form.setValue("ciudad", data.codigoCiud || "");
      form.setValue("email", data.email || "");

      setClienteEncontrado(true);

      toast({
        title: `Cliente encontrado: ${data.nombres}`,
      });
    } catch (error) {
      console.error("Error buscando cliente:", error);
      toast({
        variant: "destructive",
        title: "Error al buscar el cliente",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/recibos`,
        {
          nit: values.codigoCliente,
          valor: values.valor,
          tipo: values.tipo,
          concepto: values.concepto,
        },
        {
          headers: {
            Authorization: localStorage.getItem("clerkUserId") || "",
          },
        }
      );

      const uuid = res.data.id;

      await axios.post("/api/send", {
        numeroRecibo: uuid,
        customer: values.customer,
        ciudad: values.ciudad,
        valor: values.valor,
        tipo: values.tipo,
        concepto: values.concepto,
        email: values.email,
      });

      toast({ title: "Recibo creado y enviado correctamente" });
      onSuccess?.();
      router.push("/recaudos");
      setOpenModalCreate(false);
    } catch (error) {
      console.error("Error al crear recibo:", error);
      toast({ title: "Error al crear el recibo", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {isSubmitting && <Loading title="Enviando recibo..." />}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {/* Buscar cliente por NIT */}
            <div className="col-span-1 flex items-end gap-2">
              <FormField
                control={form.control}
                name="codigoCliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIT del cliente</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isLoading || clienteEncontrado}
                        placeholder="Ej: 123456789"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            buscarCliente();
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Digita el NIT del cliente y haz clic en buscar.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <button type="button" onClick={buscarCliente}>
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500" />
                ) : (
                  <Search strokeWidth={3} />
                )}
              </button>
            </div>

            {clienteEncontrado && (
              <>
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="customer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente</FormLabel>
                        <FormControl>
                          <Input {...field} disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                      <FormDescription>
                        Se enviará el recibo a este correo
                      </FormDescription>
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
                        <Input {...field} disabled />
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
                        <select
                          {...field}
                          className="w-full border rounded-md p-2"
                        >
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
                          placeholder="Ej: 45000"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name="concepto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Concepto</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Descripción..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}
          </div>

          {clienteEncontrado && (
            <Button disabled={!form.formState.isValid} type="submit">
              Crear Recibo
            </Button>
          )}
        </form>
      </Form>
    </div>
  );
}
