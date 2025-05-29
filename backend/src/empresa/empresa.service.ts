import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@Injectable()
export class EmpresaService {
  constructor(private prisma: PrismaService) {}

  // Verificar si el usuario es superadmin
  private async verificarSuperadmin(userId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { codigo: userId },
    });

    console.log('estoy hay en usuario en el backend:', usuario);

    if (!usuario || usuario.rol !== 'superadmin') {
      throw new ForbiddenException('Acceso denegado: no es superadmin');
    }
  }

  async create(data: CreateEmpresaDto, userId: string) {
    await this.verificarSuperadmin(userId);
    //return this.prisma.empresa.create({ data });
  }

  async findAll(userId: string) {
    await this.verificarSuperadmin(userId);
    return this.prisma.empresa.findMany();
  }

  async findOne(id: string, userId: string) {
    await this.verificarSuperadmin(userId);
    const empresa = await this.prisma.empresa.findUnique({ where: { id } });
    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }
    return empresa;
  }

  async update(id: string, data: UpdateEmpresaDto, userId: string) {
    await this.verificarSuperadmin(userId);
    return this.prisma.empresa.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, userId: string) {
    await this.verificarSuperadmin(userId);
    return this.prisma.empresa.delete({ where: { id } });
  }
}
