// src/empresa-config/empresa-config.service.ts
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsuarioPayload } from 'src/types/usuario-payload';
import { UpdateEmpresaConfigDto } from './dto/update-empresa-config.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { emitirAudit } from 'src/auditoria/auditoria.helper';
import { AuditAccion, AuditEntidad } from 'src/auditoria/auditoria.events';

@Injectable()
export class EmpresaConfigService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2
  ) {}

  async obtener(usuario: UsuarioPayload) {
    if (!usuario) throw new BadRequestException('no permitido');

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: usuario.empresaId },
      select: { notaFactura: true },
    });
    if (!empresa) throw new BadRequestException('empresa no encontrada');

    return { notaFactura: empresa.notaFactura ?? '' };
  }

  async actualizar(usuario: UsuarioPayload, dto: UpdateEmpresaConfigDto) {
    if (!usuario) throw new BadRequestException('no permitido');
    if (usuario.rol !== 'admin') {
      throw new UnauthorizedException('usuario no autorizado');
    }

    const actualizada = await this.prisma.empresa.update({
      where: { id: usuario.empresaId },
      data: { notaFactura: dto.notaFactura ?? '' },
      select: { notaFactura: true },
    });

    emitirAudit(
      this.eventEmitter,
      usuario,
      AuditAccion.ACTUALIZAR,
      AuditEntidad.EMPRESA,
      usuario.empresaId,
      { notaFactura: actualizada.notaFactura }
    );

    return { notaFactura: actualizada.notaFactura ?? '' };
  }
}
