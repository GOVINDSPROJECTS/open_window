import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SignalingGateway } from './signaling.gateway';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [
        ConfigModule,
        ClientsModule.register([
            {
                name: 'MEDIA_SERVICE',
                transport: Transport.TCP,
                options: {
                    host: '127.0.0.1',
                    port: 3006,
                },
            },
        ]),
    ],
    providers: [SignalingGateway],
})
export class SignalingModule { }
