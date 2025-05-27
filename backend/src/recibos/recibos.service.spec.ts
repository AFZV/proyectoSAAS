import { Test, TestingModule } from '@nestjs/testing';
import { RecibosService } from './recibos.service';

describe('RecibosService', () => {
  let service: RecibosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecibosService],
    }).compile();

    service = module.get<RecibosService>(RecibosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
