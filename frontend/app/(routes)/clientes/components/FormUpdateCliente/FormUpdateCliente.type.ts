import { Dispatch, SetStateAction } from "react";

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

export type FormUpdateClienteProps = {
  setOpenModalUpdate: Dispatch<SetStateAction<boolean>>;
  clienteInicial?: Cliente; // Nuevo prop opcional
};

export type { Cliente };