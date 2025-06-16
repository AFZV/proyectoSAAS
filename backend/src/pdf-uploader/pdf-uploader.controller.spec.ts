import { Test, TestingModule } from '@nestjs/testing';
import { PdfUploaderController } from './pdf-uploader.controller';

describe('PdfUploaderController', () => {
  let controller: PdfUploaderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PdfUploaderController],
    }).compile();

    controller = module.get<PdfUploaderController>(PdfUploaderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
