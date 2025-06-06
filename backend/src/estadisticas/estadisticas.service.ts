import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
//import { UsuarioPayload } from 'src/types/usuario-payload';

@Injectable()
export class EstadisticasService {
  constructor(private prisma: PrismaService) {}
  // async bajoStock(usuario: UsuarioPayload) {
  //   if (!usuario) throw new Error('Usuario no encontrado');

  //   const { codigo: usuarioId, empresaId, rol } = usuario;
  // }

  ///estadosticas de productos con poco movimientos

  // estadisticas de clientes que pasan mas de 90 dias sin comprar
  //  ofrecer incentivos a clientes para que pidan y enviarles el catalogo

  //productos mas vendidos

  //cobros por vendedor por mes
}
