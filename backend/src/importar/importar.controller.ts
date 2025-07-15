import { Controller } from '@nestjs/common';
import { ImportarService } from './importar.service';

@Controller('importar')
export class ImportarController {
  constructor(private readonly importarService: ImportarService) {}
}
