import { Injectable, OnModuleInit } from '@nestjs/common';
import * as mediasoup from 'mediasoup';
import { config } from '../config';

@Injectable()
export class VideoroomService implements OnModuleInit {
    private worker: mediasoup.types.Worker;
    private routers: Map<string, mediasoup.types.Router> = new Map();
    private transports: Map<string, mediasoup.types.WebRtcTransport> = new Map();
    private transportRoom: Map<string, string> = new Map(); // transportId -> roomId
    private producers: Map<string, mediasoup.types.Producer> = new Map();
    private consumers: Map<string, mediasoup.types.Consumer> = new Map();

    async onModuleInit() {
        this.worker = await mediasoup.createWorker({
            ...config.mediasoup.worker,
            logLevel: config.mediasoup.worker.logLevel as mediasoup.types.WorkerLogLevel,
            logTags: config.mediasoup.worker.logTags as mediasoup.types.WorkerLogTag[],
        });

        this.worker.on('died', () => {
            console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', this.worker.pid);
            setTimeout(() => process.exit(1), 2000);
        });
    }

    async getRouter(roomId: string) {
        if (!this.routers.has(roomId)) {
            const router = await this.worker.createRouter({ mediaCodecs: config.mediasoup.router.mediaCodecs });
            this.routers.set(roomId, router);
        }
        const router = this.routers.get(roomId);
        if (!router) throw new Error('Router not found');
        return router;
    }

    async createWebRtcTransport(roomId: string) {
        const router = await this.getRouter(roomId);
        const transport = await router.createWebRtcTransport(config.mediasoup.webRtcTransport);

        this.transports.set(transport.id, transport);
        this.transportRoom.set(transport.id, roomId);

        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        };
    }

    async connectWebRtcTransport(transportId: string, dtlsParameters: any) {
        const transport = this.transports.get(transportId);
        if (!transport) throw new Error(`Transport ${transportId} not found`);
        await transport.connect({ dtlsParameters });
        return { connected: true };
    }

    async produce(transportId: string, kind: mediasoup.types.MediaKind, rtpParameters: mediasoup.types.RtpParameters, appData: any = {}) {
        const transport = this.transports.get(transportId);
        if (!transport) throw new Error(`Transport ${transportId} not found`);

        const producer = await transport.produce({ kind, rtpParameters, appData });
        this.producers.set(producer.id, producer);

        return { id: producer.id };
    }

    async consume(transportId: string, producerId: string, rtpCapabilities: mediasoup.types.RtpCapabilities) {
        const transport = this.transports.get(transportId);
        if (!transport) throw new Error(`Transport ${transportId} not found`);

        const producer = this.producers.get(producerId);
        if (!producer) throw new Error(`Producer ${producerId} not found`);

        if (!config.mediasoup.router.mediaCodecs) {
            throw new Error('Media Codecs not defined');
        }

        const roomId = this.transportRoom.get(transportId);
        if (!roomId) throw new Error(`Room not found for transport ${transportId}`);
        const router = await this.getRouter(roomId);

        if (!router.canConsume({ producerId, rtpCapabilities })) {
            throw new Error('Cannot consume');
        }

        const consumer = await transport.consume({
            producerId,
            rtpCapabilities,
            paused: true,
        });

        this.consumers.set(consumer.id, consumer);

        return {
            id: consumer.id,
            producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
        };
    }

    async resumeConsumer(consumerId: string) {
        const consumer = this.consumers.get(consumerId);
        if (!consumer) throw new Error(`Consumer ${consumerId} not found`);
        await consumer.resume();
        return { resumed: true };
    }
}


