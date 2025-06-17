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
import { FormUpdateClienteProps } from "./FormUpdateCliente.type";

const searchSchema = z.object({
  searchTerm: z.string().min(1, "Ingrese NIT o nombre para buscar"),
});

const formSchema = z.object({
  nit: z.string().min(2).max(10),
  nombre: z.string().min(2).max(50),
  apellidos: z.string().min(2).max(50),
  direccion: z.string().min(10).max(50),
  telefono: z.string().min(1).max(10),
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
  nit: string;
  nombre: string;
  apellidos: string;
  direccion: string;
  telefono: string;
  email?: string;
  departamento: string;
  ciudad: string;
  estado: boolean;
}

export function FormUpdateCliente(props: FormUpdateClienteProps) {
  const { setOpenModalUpdate } = props;
  
  // Estados principales
  const [step, setStep] = useState<'search' | 'edit' | 'demo'>('search');
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [clienteActual, setClienteActual] = useState<Cliente | null>(null);
  
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
      const res = await getDepartamentos();
      const data = await res.json();
      setDepartamentos(data);
    }
    fetchDepartamentos();
  }, []);

  // Cargar ciudades cuando cambia departamento
  useEffect(() => {
    const selectedDpto = editForm.watch("departamento");
    if (selectedDpto) {
      const fetchCiudades = async () => {
        const dptoObj = departamentos.find(d => d.name === selectedDpto);
        if (dptoObj) {
          const data = await getCiudades(String(dptoObj.id));
          setCiudades(data);
        }
      };
      fetchCiudades();
    } else {
      setCiudades([]);
    }
  }, [editForm.watch("departamento"), departamentos]);

  // Función para mostrar demo del formulario
  const showDemo = () => {
    const clienteDemo: Cliente = {
      nit: "12345678",
      nombre: "Juan Carlos",
      apellidos: "Pérez González",
      direccion: "Calle 123 #45-67",
      telefono: "3012345678",
      email: "juan.perez@email.com",
      departamento: "Valle del Cauca",
      ciudad: "Cali",
      estado: true
    };

    setClienteActual(clienteDemo);
    editForm.reset({
      nit: clienteDemo.nit,
      nombre: clienteDemo.nombre,
      apellidos: clienteDemo.apellidos,
      direccion: clienteDemo.direccion,
      telefono: clienteDemo.telefono,
      email: clienteDemo.email || "",
      departamento: clienteDemo.departamento,
      ciudad: clienteDemo.ciudad,
    });

    setStep('demo');
    toast({ 
      title: "Modo Demo Activado", 
      description: "Este es un ejemplo de cómo se ve el formulario de edición"
    });
  };

  // Buscar cliente
  const onSearch = async (values: z.infer<typeof searchSchema>) => {
    setIsSearching(true);
    
    try {
      const token = await getToken();
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/clientes/${values.searchTerm}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const cliente = res.data;
      setClienteActual(cliente);
      
      // Llenar el formulario de edición
      editForm.reset({
        nit: cliente.nit,
        nombre: cliente.nombre,
        apellidos: cliente.apellidos,
        direccion: cliente.direccion,
        telefono: cliente.telefono,
        email: cliente.email || "",
        departamento: cliente.departamento,
        ciudad: cliente.ciudad,
      });

      setStep('edit');
      toast({ title: "Cliente encontrado" });
      
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        toast({
          title: "Cliente no encontrado",
          description: "¿Quieres ver un ejemplo de cómo funciona el formulario?",
          variant: "destructive",
        });
        // Ofrecer mostrar demo después de un segundo
        setTimeout(() => {
          if (step === 'search') {
            showDemo();
            }
        }, 2000);
      } else {
        toast({
          title: "Error al buscar cliente",
          variant: "destructive",
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Actualizar cliente
  const onUpdate = async (values: z.infer<typeof formSchema>) => {
    if (!clienteActual) return;
    
    // Si estamos en modo demo, no hacer llamada real
    if (step === 'demo') {
      toast({ 
        title: "Demo: Cliente actualizado", 
        description: "En modo real esto actualizaría la base de datos"
      });
      setOpenModalUpdate(false);
      return;
    }
    
    setIsUpdating(true);
    
    try {
      const token = await getToken();
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/clientes/${clienteActual.nit}`,
        values,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast({ title: "Cliente actualizado exitosamente" });
      router.refresh();
      setOpenModalUpdate(false);
      
    } catch (error) {
      toast({
        title: "Error al actualizar cliente",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Volver a búsqueda
  const handleBack = () => {
    setStep('search');
    setClienteActual(null);
    searchForm.reset();
    editForm.reset();
  };

  if (isUpdating) return <Loading title="Actualizando Cliente..." />;

  return (
    <div className="space-y-6">
      {step === 'search' ? (
        // Pantalla de búsqueda
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
            <form onSubmit={searchForm.handleSubmit(onSearch)} className="space-y-4">
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

              <div className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white" 
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

                {/* Botón para mostrar demo */}
                <Button 
                  type="button"
                  variant="outline"
                  onClick={showDemo}
                  className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <User className="w-4 h-4 mr-2" />
                  Ver Demo del Formulario
                </Button>
              </div>
            </form>
          </Form>

          {/* Mensaje informativo */}
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                  ¿No tienes clientes registrados?
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  Puedes usar el botón "Ver Demo" para probar cómo funciona el formulario de actualización, 
                  o crear tu primer cliente usando el botón "Crear Cliente".
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Pantalla de edición (real o demo)
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold flex items-center">
                  {step === 'demo' ? 'Demo: ' : ''}Editar Cliente
                  {step === 'demo' && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      DEMO
                    </span>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {clienteActual?.nombre} {clienteActual?.apellidos}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleBack} className="border-blue-200 text-blue-600 hover:bg-blue-50">
              Buscar Otro
            </Button>
          </div>

          {/* Información actual del cliente */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/10 rounded-lg p-4 space-y-2 border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium flex items-center text-blue-800 dark:text-blue-200">
              <Edit3 className="w-4 h-4 mr-2" />
              Información Actual
              {step === 'demo' && (
                <span className="ml-2 text-xs text-blue-600">(Datos de ejemplo)</span>
              )}
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-300">NIT:</span> 
                <span className="ml-1 font-mono">{clienteActual?.nit}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-300">Estado:</span> 
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                  clienteActual?.estado 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {clienteActual?.estado ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onUpdate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="nit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIT</FormLabel>
                      <FormControl>
                        <Input {...field} disabled className="bg-muted cursor-not-allowed" />
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
                        <Input {...field} className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
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
                        <Input {...field} className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
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
                        <Input {...field} className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
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
                        <Input type="email" {...field} className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
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
                        <Input {...field} className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
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
                        <select {...field} className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-background">
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
                        <select {...field} className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-background">
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
                <Button type="submit" className="px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white">
                  <Edit3 className="w-4 h-4 mr-2" />
                  {step === 'demo' ? 'Simular Actualización' : 'Actualizar Cliente'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}