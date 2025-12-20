import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { VideoroomService } from './videoroom.service';

@Controller()
export class VideoroomController {
    constructor(private readonly videoroomService: VideoroomService) { }

    @MessagePattern({ cmd: 'getRouterRtpCapabilities' })
    async getRouterRtpCapabilities(@Payload() roomId: string) {
        const router = await this.videoroomService.getRouter(roomId);
        return router.rtpCapabilities;
    }

    @MessagePattern({ cmd: 'createWebRtcTransport' })
    async createWebRtcTransport(@Payload() roomId: string) {
        return this.videoroomService.createWebRtcTransport(roomId);
    }

    @MessagePattern({ cmd: 'connectWebRtcTransport' })
    async connectWebRtcTransport(@Payload() data: { transportId: string; dtlsParameters: any }) {
        return this.videoroomService.connectWebRtcTransport(data.transportId, data.dtlsParameters);
    }

    @MessagePattern({ cmd: 'produce' })
    async produce(@Payload() data: { transportId: string; kind: any; rtpParameters: any; appData: any }) {
        return this.videoroomService.produce(data.transportId, data.kind, data.rtpParameters, data.appData);
    }

    @MessagePattern({ cmd: 'consume' })
    async consume(@Payload() data: { transportId: string; producerId: string; rtpCapabilities: any }) {
        return this.videoroomService.consume(data.transportId, data.producerId, data.rtpCapabilities);
    }

    @MessagePattern({ cmd: 'resumeConsumer' })
    async resumeConsumer(@Payload() consumerId: string) {
        return this.videoroomService.resumeConsumer(consumerId);
    }
}

