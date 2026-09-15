import { Module } from '@nestjs/common';
import { EmpresaConfigController } from './empresa-config.controller';
import { EmpresaConfigService } from './empresa-config.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EmpresaConfigController],
  providers: [EmpresaConfigService],
})
export class EmpresaConfigModule {}
