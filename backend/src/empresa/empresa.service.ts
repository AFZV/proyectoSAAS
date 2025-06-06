import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { UsuarioPayload } from 'src/types/usuario-payload';

@Injectable()
export class EmpresaService {
  constructor(private prisma: PrismaService) {}

  // Crear una empresa
  async create(data: CreateEmpresaDto) {
    return this.prisma.empresa.create({
      data: { ...data, estado: 'activa' },
    });
  }

  // Obtener todas las empresas
  async findAll() {
    return this.prisma.empresa.findMany();
  }

  // Obtener una empresa por su ID
  async findOne(id: string) {
    const empresa = await this.prisma.empresa.findUnique({ where: { id } });
    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }
    return empresa;
  }

  // Actualizar una empresa por su ID
  async update(id: string, data: UpdateEmpresaDto) {
    return this.prisma.empresa.update({
      where: { id },
      data,
    });
  }

  // Cambiar estado (activa ↔ inactiva)
  async CambiarEstado(id: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id },
    });

    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    const nuevoEstado = empresa.estado === 'activa' ? 'inactiva' : 'activa';

    return this.prisma.empresa.update({
      where: { id },
      data: { estado: nuevoEstado },
    });
  }
}
