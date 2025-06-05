import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Usuario } from "./usuario.types";
import { UsuarioActions } from "./UsuarioActions";
import { useAuth } from "@clerk/nextjs";
import { FormCrearUsuario } from "../components/FormCrearUsuario/FormCrearUsuario";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
export function UsuarioTable() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [openModalCreate, setOpenModalCreate] = useState(false);
  const { getToken } = useAuth();

  // ✅ Mueve esta función fuera del useEffect
  const fetchUsuarios = async () => {
    try {
      const token = await getToken();
      if (token) {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/usuario/all`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        setUsuarios(data);
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    }
  };

  useEffect(() => {
    fetchUsuarios(); // 👈 úsala aquí también
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Lista de Usuarios</h2>
        <Button onClick={() => setOpenModalCreate(true)}>
          + Crear Usuario
        </Button>
      </div>

      {/* ✅ Aquí ya no da error */}
      <Dialog open={openModalCreate} onOpenChange={setOpenModalCreate}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Crear Usuario</DialogTitle>
          </DialogHeader>
          <FormCrearUsuario
            setOpenModalUsuarioCreate={setOpenModalCreate}
            refetchUsuarios={fetchUsuarios}
          />
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Correo</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usuarios.map((usuario) => (
            <TableRow key={usuario.id}>
              <TableCell>
                {usuario.nombre} {usuario.apellidos}
              </TableCell>
              <TableCell>{usuario.correo}</TableCell>
              <TableCell>{usuario.rol}</TableCell>
              <TableCell>{usuario.estado}</TableCell>
              <TableCell>
                <UsuarioActions
                  usuario={usuario}
                  refetchUsuarios={fetchUsuarios}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
