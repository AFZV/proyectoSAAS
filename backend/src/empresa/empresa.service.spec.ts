import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EmpresaService } from './empresa.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

// Mock de PrismaService
const mockPrismaService = {
  empresa: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

// Mock de CloudinaryService
const mockCloudinaryService = {};

describe('EmpresaService', () => {
  let service: EmpresaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmpresaService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
      ],
    }).compile();

    service = module.get<EmpresaService>(EmpresaService);

    // Limpiar mocks entre cada test
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debe crear una empresa correctamente', async () => {
      const dto = {
        nit: '123456789',
        razonSocial: 'Empresa Test',
        nombreComercial: 'Test S.A.',
        direccion: 'Calle 123',
        telefono: '3001234567',
        departamento: 'antioquia',
        ciudad: 'medellín',
        correo: 'test@empresa.com',
        logoUrl: 'https://example.com/logo.png',
      };

      const empresaCreada = { id: 'uuid-1', ...dto, estado: 'activa' };
      mockPrismaService.empresa.create.mockResolvedValue(empresaCreada);

      const result = await service.create(dto);

      expect(result).toEqual({ empresa: empresaCreada });
      expect(mockPrismaService.empresa.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('debe retornar todas las empresas', async () => {
      const empresas = [
        { id: '1', razonSocial: 'Empresa 1' },
        { id: '2', razonSocial: 'Empresa 2' },
      ];
      mockPrismaService.empresa.findMany.mockResolvedValue(empresas);

      const result = await service.findAll();

      expect(result).toEqual(empresas);
    });
  });

  describe('findOne', () => {
    it('debe retornar una empresa por su ID', async () => {
      const empresa = { id: 'uuid-1', razonSocial: 'Empresa Test' };
      mockPrismaService.empresa.findUnique.mockResolvedValue(empresa);

      const result = await service.findOne('uuid-1');

      expect(result).toEqual(empresa);
      expect(mockPrismaService.empresa.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
      });
    });

    it('debe lanzar NotFoundException si la empresa no existe', async () => {
      mockPrismaService.empresa.findUnique.mockResolvedValue(null);

      await expect(service.findOne('uuid-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('debe actualizar una empresa', async () => {
      const empresaActualizada = {
        id: 'uuid-1',
        razonSocial: 'Nombre Actualizado',
      };
      mockPrismaService.empresa.update.mockResolvedValue(empresaActualizada);

      const result = await service.update('uuid-1', {
        razonSocial: 'Nombre Actualizado',
      });

      expect(result).toEqual(empresaActualizada);
      expect(mockPrismaService.empresa.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: { razonSocial: 'Nombre Actualizado' },
      });
    });
  });

  describe('CambiarEstado', () => {
    it('debe cambiar de activa a inactiva', async () => {
      const empresa = { id: 'uuid-1', estado: 'activa' };
      const empresaActualizada = { id: 'uuid-1', estado: 'inactiva' };

      mockPrismaService.empresa.findUnique.mockResolvedValue(empresa);
      mockPrismaService.empresa.update.mockResolvedValue(empresaActualizada);

      const result = await service.CambiarEstado('uuid-1');

      expect(result.estado).toBe('inactiva');
      expect(mockPrismaService.empresa.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: { estado: 'inactiva' },
      });
    });

    it('debe cambiar de inactiva a activa', async () => {
      const empresa = { id: 'uuid-1', estado: 'inactiva' };
      const empresaActualizada = { id: 'uuid-1', estado: 'activa' };

      mockPrismaService.empresa.findUnique.mockResolvedValue(empresa);
      mockPrismaService.empresa.update.mockResolvedValue(empresaActualizada);

      const result = await service.CambiarEstado('uuid-1');

      expect(result.estado).toBe('activa');
    });

    it('debe lanzar NotFoundException si la empresa no existe', async () => {
      mockPrismaService.empresa.findUnique.mockResolvedValue(null);

      await expect(service.CambiarEstado('uuid-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('dataHeader', () => {
    it('debe retornar estadísticas para superadmin', async () => {
      mockPrismaService.empresa.count
        .mockResolvedValueOnce(10) // totalEmpresas
        .mockResolvedValueOnce(7); // totalActivas

      const usuario = { rol: 'superadmin' } as any;
      const result = await service.dataHeader(usuario);

      expect(result).toEqual({
        totalEmpresas: 10,
        totalActivas: 7,
        totalInactivas: 3,
      });
    });

    it('debe lanzar error si el usuario no es superadmin', async () => {
      const usuario = { rol: 'admin' } as any;

      await expect(service.dataHeader(usuario)).rejects.toThrow();
    });

    it('debe lanzar BadRequestException si no hay usuario', async () => {
      await expect(service.dataHeader(null as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
