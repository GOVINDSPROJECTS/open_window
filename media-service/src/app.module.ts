import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VideoroomModule } from './videoroom/videoroom.module';

@Module({
  imports: [VideoroomModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
