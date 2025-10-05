import { Module } from '@nestjs/common';
import { FacturasProveedorService } from './facturas-proveedor.service';
import { FacturasProveedorController } from './facturas-proveedor.controller';

@Module({
  controllers: [FacturasProveedorController],
  providers: [FacturasProveedorService],
})
export class FacturasProveedorModule {}
