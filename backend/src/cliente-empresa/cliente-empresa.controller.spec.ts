import { Test, TestingModule } from '@nestjs/testing';
import { ClienteEmpresaController } from './cliente-empresa.controller';

describe('ClienteEmpresaController', () => {
  let controller: ClienteEmpresaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClienteEmpresaController],
    }).compile();

    controller = module.get<ClienteEmpresaController>(ClienteEmpresaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
