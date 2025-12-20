import { Module } from '@nestjs/common';
import { VideoroomService } from './videoroom.service';
import { VideoroomController } from './videoroom.controller';

@Module({
  providers: [VideoroomService],
  controllers: [VideoroomController]
})
export class VideoroomModule {}
