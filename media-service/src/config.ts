import { types } from 'mediasoup';
import * as os from 'os';

export const config = {
    mediasoup: {
        numWorkers: Object.keys(os.cpus()).length,
        worker: {
            logLevel: 'warn',
            logTags: [
                'info',
                'ice',
                'dtls',
                'rtp',
                'srtp',
                'rtcp',
            ] as types.WorkerLogTag[],
            rtcMinPort: 10000,
            rtcMaxPort: 10100, // Small range for dev
        },
        router: {
            mediaCodecs: [
                {
                    kind: 'audio',
                    mimeType: 'audio/opus',
                    clockRate: 48000,
                    channels: 2,
                },
                {
                    kind: 'video',
                    mimeType: 'video/VP8',
                    clockRate: 90000,
                    parameters: {
                        'x-google-start-bitrate': 1000,
                    },
                },
                {
                    kind: 'video',
                    mimeType: 'video/H264',
                    clockRate: 90000,
                    parameters: {
                        'packetization-mode': 1,
                        'profile-level-id': '4d0032',
                        'level-asymmetry-allowed': 1,
                        'x-google-start-bitrate': 1000,
                    },
                },
            ] as types.RtpCodecCapability[],
        },
        webRtcTransport: {
            listenIps: [
                {
                    ip: '0.0.0.0',
                    announcedIp: '172.22.32.1', // Local LAN IP for dev
                },
            ] as types.TransportListenInfo[],
            initialAvailableOutgoingBitrate: 1000000,
        },
    },
};
