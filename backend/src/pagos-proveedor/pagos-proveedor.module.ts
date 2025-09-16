import { Module } from '@nestjs/common';
import { PagosProveedorService } from './pagos-proveedor.service';
import { PagosProveedorController } from './pagos-proveedor.controller';

@Module({
  controllers: [PagosProveedorController],
  providers: [PagosProveedorService],
})
export class PagosProveedorModule {}
