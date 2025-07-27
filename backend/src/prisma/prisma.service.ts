import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

declare global {
  // Declaramos globalThis.prisma como tipo PrismaService (no PrismaClient)
  // eslint-disable-next-line no-var
  var prisma: PrismaService | undefined;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // Solo en desarrollo: usamos instancia global
    const isDev = process.env.NODE_ENV !== 'production';

    if (isDev) {
      if (!globalThis.prisma) {
        super();
        globalThis.prisma = this;
      }

      // 💡 Importante: TypeScript necesita que retornemos el tipo `PrismaService`
      return globalThis.prisma;
    }

    // En producción, instanciación normal
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
