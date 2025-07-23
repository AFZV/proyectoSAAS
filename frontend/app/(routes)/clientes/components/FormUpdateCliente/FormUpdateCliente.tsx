"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
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
import { Search, RefreshCw, User, Edit3, AlertCircle } from "lucide-react";

import { getDepartamentos } from "@/lib/getDepartamentos";
import { getCiudades } from "@/lib/getCiudades";
import { Loading } from "@/components/Loading";

const searchSchema = z.object({
  searchTerm: z.string().min(1, "Ingrese NIT o nombre para buscar"),
});

const formSchema = z.object({
  nit: z.string().min(2).max(20),
  nombre: z.string().min(2).max(50),
  apellidos: z.string().min(2).max(50),
  direccion: z.string().min(10).max(100),
  telefono: z.string().min(1).max(15),
  email: z.string().email("Correo inválido").max(50).optional(),
  departamento: z.string().min(1),
  ciudad: z.string().min(1),
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
  nombre: string;
  apellidos: string;
  direccion?: string;
  telefono: string;
  email?: string;
  departamento?: string;
  ciudad: string;
  estado?: boolean;
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
  // Estados principales
  const [step, setStep] = useState<"search" | "edit">(
    clienteInicial ? "edit" : "search"
  );
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [clienteActual, setClienteActual] = useState<Cliente | null>(
    clienteInicial || null
  );

  // Estados para ubicación
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);

  const { getToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Formulario de búsqueda
  const searchForm = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
  });

  // Formulario de edición
  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
  });

  // Cargar departamentos al iniciar
  useEffect(() => {
    async function fetchDepartamentos() {
      try {
        const res = await getDepartamentos();
        const data = await res.json();
        setDepartamentos(data);
      } catch (error) {
        console.error("Error al cargar departamentos:", error);
      }
    }
    fetchDepartamentos();
  }, []);

  // Si hay cliente inicial, llenar el formulario
  useEffect(() => {
    if (clienteInicial) {
      editForm.reset({
        nit: clienteInicial.nit,
        nombre: clienteInicial.nombre,
        apellidos: clienteInicial.apellidos,
        direccion: clienteInicial.direccion || "",
        telefono: clienteInicial.telefono,
        email: clienteInicial.email || "",
        departamento: clienteInicial.departamento || "",
        ciudad: clienteInicial.ciudad,
      });
      setStep("edit");
    }
  }, [clienteInicial, editForm]);

  // Cargar ciudades cuando cambia departamento
  useEffect(() => {
    const selectedDpto = editForm.watch("departamento");
    if (selectedDpto) {
      const fetchCiudades = async () => {
        const dptoObj = departamentos.find((d) => d.name === selectedDpto);
        if (dptoObj) {
          try {
            const data = await getCiudades(String(dptoObj.id));
            setCiudades(data);
          } catch (error) {
            console.error("Error al cargar ciudades:", error);
          }
        }
      };
      fetchCiudades();
    } else {
      setCiudades([]);
    }
  }, [editForm.watch("departamento"), departamentos]);

  // 🔍 BUSCAR CLIENTE - CORREGIDO CON ENDPOINT CORRECTO
  const onSearch = async (values: z.infer<typeof searchSchema>) => {
    setIsSearching(true);

    console.log("🔍 Iniciando búsqueda con término:", values.searchTerm);

    try {
      const token = await getToken();
      console.log("🔑 Token obtenido:", token ? "Sí" : "No");

      if (!token) {
        throw new Error("No se pudo obtener el token de autenticación");
      }

      // 🎯 USAR EL ENDPOINT CORRECTO
      const url = `${process.env.NEXT_PUBLIC_API_URL}/clientes/getByFilter/${values.searchTerm}`;
      console.log("🌐 URL de búsqueda:", url);

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("📡 Response status:", response.status);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Cliente no encontrado");
        } else {
          const errorText = await response.text();
          throw new Error(`Error ${response.status}: ${errorText}`);
        }
      }

      const clientes = await response.json();
      console.log("📋 Clientes encontrados:", clientes);

      // Verificar si se encontraron clientes
      if (!clientes || clientes.length === 0) {
        toast({
          title: "Cliente no encontrado",
          description: "No se encontró ningún cliente con ese NIT o nombre",
          variant: "destructive",
        });
        return;
      }

      // Si solo hay un cliente, seleccionarlo directamente
      const cliente = Array.isArray(clientes) ? clientes[0] : clientes;
      seleccionarCliente(cliente);
    } catch (error: any) {
      console.error("❌ Error al buscar cliente:", error);

      toast({
        title: "Cliente no encontrado",
        description:
          error.message || "No se encontró ningún cliente con ese criterio",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Función para seleccionar un cliente específico
  const seleccionarCliente = (cliente: Cliente) => {
    setClienteActual(cliente);

    // Llenar el formulario de edición con los datos del cliente
    editForm.reset({
      nit: cliente.nit,
      nombre: cliente.nombre,
      apellidos: cliente.apellidos,
      direccion: cliente.direccion || "",
      telefono: cliente.telefono,
      email: cliente.email || "",
      departamento: cliente.departamento || "",
      ciudad: cliente.ciudad,
    });

    setStep("edit");
    toast({
      title: "Cliente encontrado",
      description: `${cliente.nombre} ${cliente.apellidos}`,
    });
  };

  // 🔄 ACTUALIZAR CLIENTE - CORREGIDO PARA USAR ID
  const onUpdate = async (values: z.infer<typeof formSchema>) => {
    if (!clienteActual) return;

    setIsUpdating(true);

    try {
      const token = await getToken();

      if (!token) {
        throw new Error("No se pudo obtener el token de autenticación");
      }

      console.log("🔄 Actualizando cliente:", clienteActual);
      console.log("📝 Datos a actualizar:", values);

      // 🎯 USAR EL ID DEL CLIENTE, NO EL NIT
      const clienteId = clienteActual.id;

      if (!clienteId) {
        throw new Error("No se encontró el ID del cliente para actualizar");
      }

      const url = `${process.env.NEXT_PUBLIC_API_URL}/clientes/${clienteId}`;
      console.log("🌐 URL de actualización (con ID):", url);

      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      console.log("📡 Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error response:", errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const clienteActualizado = await response.json();
      console.log("✅ Cliente actualizado:", clienteActualizado);

      toast({
        title: "Cliente actualizado exitosamente",
        description: `${values.nombre} ${values.apellidos} ha sido actualizado`,
      });

      // Cerrar modal y refrescar
      setOpenModalUpdate(false);
      if (onSuccess) {
        onSuccess();
      }
      router.refresh();
    } catch (error: any) {
      console.error("❌ Error al actualizar cliente:", error);

      toast({
        title: "Error al actualizar cliente",
        description: error.message || "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Volver a búsqueda (solo si no hay cliente inicial)
  const handleBack = () => {
    if (clienteInicial) {
      setOpenModalUpdate(false);
      return;
    }

    setStep("search");
    setClienteActual(null);
    searchForm.reset();
    editForm.reset();
  };

  if (isUpdating) return <Loading title="Actualizando Cliente..." />;

  return (
    <div className="space-y-6">
      {step === "search" ? (
        // Pantalla de búsqueda (solo si no hay cliente inicial)
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-md">
              <Search className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Buscar Cliente</h3>
            <p className="text-sm text-muted-foreground">
              Ingrese el NIT o nombre del cliente para buscarlo
            </p>
          </div>

          <Form {...searchForm}>
            <form
              onSubmit={searchForm.handleSubmit(onSearch)}
              className="space-y-4"
            >
              <FormField
                control={searchForm.control}
                name="searchTerm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIT o Nombre del Cliente</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          {...field}
                          placeholder="Ej: 12345678 o Juan Pérez"
                          className="pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-blue-500/25"
                disabled={isSearching}
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Buscar Cliente
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
      ) : (
        // Pantalla de edición
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div>
                <h3 className="text-lg font-semibold flex items-center">
                  Editar Cliente
                </h3>
                <p className="text-sm text-muted-foreground">
                  {clienteActual?.nombre} {clienteActual?.apellidos}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
            >
              {clienteInicial ? "Cancelar" : "Buscar Otro"}
            </Button>
          </div>

          {/* Información actual del cliente */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/10 rounded-lg p-4 space-y-2 border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium flex items-center text-blue-800 dark:text-blue-200">
              <Edit3 className="w-4 h-4 mr-2" />
              Información Actual
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  NIT:
                </span>
                <span className="ml-1 font-mono">{clienteActual?.nit}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  Estado:
                </span>
                <span
                  className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    clienteActual?.estado ?? true
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                  }`}
                >
                  {clienteActual?.estado ?? true ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
          </div>

          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onUpdate)}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="nit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIT</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled
                          className="bg-muted cursor-not-allowed"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => {
                            // Solo permitir números
                            const value = e.target.value.replace(/\D/g, "");
                            field.onChange(value);
                          }}
                          className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombres</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="apellidos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellidos</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          {...field}
                          className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="direccion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="departamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md"
                        >
                          <option value="">Seleccione un departamento</option>
                          {departamentos.map((dep) => (
                            <option key={dep.id} value={dep.name}>
                              {dep.name}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="ciudad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md"
                        >
                          <option value="">Seleccione una ciudad</option>
                          {ciudades.map((ciudad) => (
                            <option key={ciudad.id} value={ciudad.name}>
                              {ciudad.name}
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
                  className="px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-blue-500/25"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Actualizar Cliente
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}
