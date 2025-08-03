"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Edit3 } from "lucide-react";

import { getDepartamentos } from "@/lib/getDepartamentos";
import { getCiudades } from "@/lib/getCiudades";
import { Loading } from "@/components/Loading";

const formSchema = z.object({
  nit: z
    .string()
    .min(5, "NIT debe tener al menos 5 dígitos")
    .max(20, "NIT no puede tener más de 20 dígitos"),
  rasonZocial: z.string().min(2).max(100).optional(),
  nombre: z.string().min(2, "Nombre debe tener al menos 2 caracteres").max(50),
  apellidos: z
    .string()
    .min(2, "Apellidos debe tener al menos 2 caracteres")
    .max(100),
  direccion: z
    .string()
    .min(10, "Dirección debe tener al menos 10 caracteres")
    .max(100),
  telefono: z.string().min(7, "Teléfono debe tener al menos 7 dígitos").max(15),
  email: z.string().email("Correo inválido").max(50),
  vendedor: z.string(),
  departamento: z.string().min(1, "Debe seleccionar un departamento"),
  ciudad: z.string().min(1, "Debe seleccionar una ciudad"),
});

interface Departamento {
  id: number;
  name: string;
}

interface Ciudad {
  id: number;
  name: string;
}

interface Cliente {
  id?: string;
  nit: string;
  rasonZocial?: string;
  nombre: string;
  apellidos: string;
  direccion?: string;
  telefono: string;
  email?: string;
  departamento?: string; // Nombre en la BD
  ciudad: string; // Nombre en la BD
  estado?: boolean;
  vendedorId?: string;
}

interface VendedorCliente {
  id: string;
  nombre: string;
}

interface FormUpdateClienteProps {
  setOpenModalUpdate: (open: boolean) => void;
  clienteInicial?: Cliente;
  onSuccess?: () => void;
}

export function FormUpdateCliente({
  setOpenModalUpdate,
  clienteInicial,
  onSuccess,
}: FormUpdateClienteProps) {
  console.log("cliente que llega a update:", clienteInicial);
  const [isUpdating, setIsUpdating] = useState(false);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [vendedores, setVendedores] = useState<VendedorCliente[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const { getToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
  });

  // ✅ Cargar vendedores
  useEffect(() => {
    async function fetchVendedores() {
      try {
        const token = await getToken();
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/clientes/vendedores`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();
        setVendedores([data]);
      } catch (error) {
        console.error("Error al cargar vendedores:", error);
      }
    }
    fetchVendedores();
  }, []);

  // ✅ Cargar departamentos y ciudades iniciales
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);

        // 1. Departamentos
        const depRes = await getDepartamentos();
        const depData = await depRes.json();
        setDepartamentos(depData);

        // 2. Si hay cliente, buscar IDs
        let departamentoId = "";
        let ciudadId = "";
        let citiesData: Ciudad[] = [];

        if (clienteInicial) {
          const depMatch = depData.find(
            (d: Departamento) =>
              d.name.toLowerCase() ===
              (clienteInicial.departamento || "").toLowerCase()
          );

          if (depMatch) {
            departamentoId = depMatch.id.toString();
            citiesData = await getCiudades(departamentoId);
            setCiudades(citiesData);

            const ciudadMatch = citiesData.find(
              (c) =>
                c.name.toLowerCase() ===
                (clienteInicial.ciudad || "").toLowerCase()
            );
            if (ciudadMatch) ciudadId = ciudadMatch.id.toString();
          }

          // 3. Reset con datos
          editForm.reset({
            nit: clienteInicial.nit,
            rasonZocial: clienteInicial.rasonZocial || "",
            nombre: clienteInicial.nombre,
            apellidos: clienteInicial.apellidos,
            direccion: clienteInicial.direccion || "",
            telefono: clienteInicial.telefono,
            email: clienteInicial.email || "",
            vendedor: clienteInicial.vendedorId || "",
            departamento: departamentoId,
            ciudad: ciudadId,
          });
        }
      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [clienteInicial]);

  // ✅ Cargar ciudades cuando cambia departamento
  useEffect(() => {
    const selectedDepId = editForm.watch("departamento");
    if (selectedDepId) {
      const fetchCiudades = async () => {
        try {
          const data = await getCiudades(selectedDepId);
          setCiudades(data);
        } catch (error) {
          console.error("Error al cargar ciudades:", error);
        }
      };
      fetchCiudades();
    } else {
      setCiudades([]);
    }
  }, [editForm.watch("departamento")]);

  // ✅ Actualizar cliente
  const onUpdate = async (values: z.infer<typeof formSchema>) => {
    if (!clienteInicial) return;
    setIsUpdating(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("No se pudo obtener token");

      const clienteId = clienteInicial.id;
      if (!clienteId) throw new Error("No se encontró ID del cliente");

      const url = `${process.env.NEXT_PUBLIC_API_URL}/clientes/${clienteId}`; ////
      const { vendedor, departamento, ciudad, ...rest } = values;

      // ✅ Convertir IDs a nombres
      const departamentoNombre =
        departamentos.find((d) => d.id.toString() === departamento)?.name || "";
      const ciudadNombre =
        ciudades.find((c) => c.id.toString() === ciudad)?.name || "";

      const payload = {
        ...rest,
        usuarioId: vendedor,
        departamento: departamentoNombre,
        ciudad: ciudadNombre,
      };

      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      toast({
        title: "Cliente actualizado",
        description: `${values.nombre} ${values.apellidos} fue actualizado`,
      });

      setOpenModalUpdate(false);
      if (onSuccess) onSuccess();
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error al actualizar cliente",
        description: error.message || "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (loadingData) return <Loading title="Cargando datos del cliente..." />;
  if (isUpdating) return <Loading title="Actualizando Cliente..." />;

  return (
    <div className="space-y-6">
      <Form {...editForm}>
        <form onSubmit={editForm.handleSubmit(onUpdate)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NIT */}
            <FormField
              control={editForm.control}
              name="nit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIT</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-muted" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Razón Social */}
            <FormField
              control={editForm.control}
              name="rasonZocial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razón Social</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nombres */}
            <FormField
              control={editForm.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombres</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Apellidos */}
            <FormField
              control={editForm.control}
              name="apellidos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellidos</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={editForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Teléfono */}
            <FormField
              control={editForm.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dirección */}
            <FormField
              control={editForm.control}
              name="direccion"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Vendedor */}
            <FormField
              control={editForm.control}
              name="vendedor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendedor</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full border rounded-md">
                      <option value="">Seleccione un vendedor</option>
                      {vendedores.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nombre}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Departamento */}
            <FormField
              control={editForm.control}
              name="departamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Departamento</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full border rounded-md">
                      <option value="">Seleccione un departamento</option>
                      {departamentos.map((d) => (
                        <option key={d.id} value={d.id.toString()}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ciudad */}
            <FormField
              control={editForm.control}
              name="ciudad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full border rounded-md">
                      <option value="">Seleccione una ciudad</option>
                      {ciudades.map((c) => (
                        <option key={c.id} value={c.id.toString()}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-center pt-4">
            <Button
              type="submit"
              className="px-8 bg-blue-600 text-white hover:bg-blue-700"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Actualizar Cliente
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
