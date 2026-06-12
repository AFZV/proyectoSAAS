export class AuditEvent {
  empresaId: string;
  usuarioId: string;
  usuarioNombre: string;
  accion: AuditAccion;
  entidad: AuditEntidad;
  entidadId: string;
  detalle?: Record<string, any>;
  ip?: string;
}

export enum AuditAccion {
  CREAR         = 'CREAR',
  ACTUALIZAR    = 'ACTUALIZAR',
  ELIMINAR      = 'ELIMINAR',
  CAMBIO_ESTADO = 'CAMBIO_ESTADO',
  REVISAR       = 'REVISAR',
  SUBIR_ARCHIVO = 'SUBIR_ARCHIVO',
}

export enum AuditEntidad {
  PEDIDO       = 'Pedido',
  RECIBO       = 'Recibo',
  PRODUCTO     = 'Producto',
  CLIENTE      = 'Cliente',
  USUARIO      = 'Usuario',
  EMPRESA      = 'Empresa',
  INVENTARIO   = 'Inventario',
  FACTURA_PROV = 'FacturaProveedor',
  PAGO_PROV    = 'PagoProveedor',
}

export const AUDIT_EVENT = 'audit.log';
