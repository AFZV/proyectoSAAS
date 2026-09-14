import { Module } from '@nestjs/common';
import { CatalogoPublicoController } from './catalogo-publico.controller';
import { ProductosModule } from 'src/productos/productos.module';

@Module({
  imports: [ProductosModule],
  controllers: [CatalogoPublicoController],
})
export class CatalogoPublicoModule {}
