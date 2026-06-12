import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma/prisma.service';
import { AUDIT_EVENT, AuditEvent } from './auditoria.events';

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(AUDIT_EVENT, { async: true })
  async handleAuditEvent(event: AuditEvent): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          empresaId:     event.empresaId,
          usuarioId:     event.usuarioId,
          usuarioNombre: event.usuarioNombre,
          accion:        event.accion,
          entidad:       event.entidad,
          entidadId:     event.entidadId,
          detalle:       event.detalle ?? undefined,
          ip:            event.ip ?? null,
        },
      });
    } catch (err) {
      this.logger.error('Error guardando audit log', err);
    }
  }

  async getLogsEmpresa(empresaId: string, page = 1, limit = 50, entidad?: string) {
    const safLimit = Math.min(limit, 100);
    const skip = (page - 1) * safLimit;
    const where = { empresaId, ...(entidad ? { entidad } : {}) };
    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { creadoEn: 'desc' },
        skip,
        take: safLimit,
        select: {
          id: true,
          usuarioNombre: true,
          accion: true,
          entidad: true,
          entidadId: true,
          detalle: true,
          ip: true,
          creadoEn: true,
        },
      }),
    ]);
    return { total, page, limit: safLimit, data };
  }

  async getLogsPorEntidad(
    empresaId: string,
    entidad: string,
    entidadId: string,
  ) {
    return this.prisma.auditLog.findMany({
      where: { empresaId, entidad, entidadId },
      orderBy: { creadoEn: 'desc' },
      take: 200,
      select: {
        id: true,
        usuarioNombre: true,
        accion: true,
        detalle: true,
        ip: true,
        creadoEn: true,
      },
    });
  }
}
