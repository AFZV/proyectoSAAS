import { Module } from '@nestjs/common';
import { ImportarService } from './importar.service';
import { ImportarController } from './importar.controller';

@Module({
  controllers: [ImportarController],
  providers: [ImportarService],
})
export class ImportarModule {}
