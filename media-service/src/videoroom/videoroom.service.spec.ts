import { Test, TestingModule } from '@nestjs/testing';
import { VideoroomService } from './videoroom.service';

describe('VideoroomService', () => {
  let service: VideoroomService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VideoroomService],
    }).compile();

    service = module.get<VideoroomService>(VideoroomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
