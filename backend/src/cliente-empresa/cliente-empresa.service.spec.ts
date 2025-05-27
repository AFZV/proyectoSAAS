import { Test, TestingModule } from '@nestjs/testing';
import { ClienteEmpresaService } from './cliente-empresa.service';

describe('ClienteEmpresaService', () => {
  let service: ClienteEmpresaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClienteEmpresaService],
    }).compile();

    service = module.get<ClienteEmpresaService>(ClienteEmpresaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
