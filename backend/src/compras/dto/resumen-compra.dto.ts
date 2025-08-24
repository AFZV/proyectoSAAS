export interface ResumenCompraDto {
  logoUrl: string;
  nombreEmpresa: string;
  direccionEmpresa: string;
  telefonoEmpresa: string;
  idCompra: string;
  fechaCompra: string | Date;
  proveedorNombre: string;
  proveedorIdentificacion: string;
  proveedorTelefono: string;
  proveedorDireccion: string;
  proveedorEmail?: string;
  elaboradoPor?: string;
  items: Array<{
    nombre: string;
    codigo?: number | string | null;
    cantidad: number;
    costoUnitario: number;
    subtotal: number;
  }>;
  total: number;
}
