import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AUDIT_EVENT,
  AuditAccion,
  AuditEntidad,
  AuditEvent,
} from './auditoria.events';
import { UsuarioPayload } from 'src/types/usuario-payload';

export function emitirAudit(
  emitter: EventEmitter2,
  usuario: UsuarioPayload,
  accion: AuditAccion,
  entidad: AuditEntidad,
  entidadId: string,
  detalle?: Record<string, any>,
  ip?: string,
) {
  const event: AuditEvent = {
    empresaId: usuario.empresaId,
    usuarioId: usuario.id,
    usuarioNombre: usuario.nombre,
    accion,
    entidad,
    entidadId,
    detalle,
    ip,
  };
  emitter.emit(AUDIT_EVENT, event);
}
