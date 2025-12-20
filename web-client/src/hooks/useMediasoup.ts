import { useEffect, useRef, useState } from 'react';
import * as mediasoup from 'mediasoup-client';
import { useSignaling } from '../contexts/SignalingContext';
import { useAuth } from '../contexts/AuthContext';

export const useMediasoup = (roomId: string, user: any) => {
    const { socket } = useSignaling();
    const [device, setDevice] = useState<mediasoup.types.Device | null>(null);
    const [isDeviceLoaded, setIsDeviceLoaded] = useState(false);
    const [consumers, setConsumers] = useState<any[]>([]);
    const [participants, setParticipants] = useState<any[]>([]);
    const [waitingParticipants, setWaitingParticipants] = useState<any[]>([]);
    const [status, setStatus] = useState<'connecting' | 'waiting' | 'admitted' | 'rejected'>('connecting');
    const [meetingEnded, setMeetingEnded] = useState(false);

    const producersRef = useRef<Map<string, mediasoup.types.Producer>>(new Map());
    const sendTransportRef = useRef<mediasoup.types.Transport | null>(null);
    const recvTransportRef = useRef<mediasoup.types.Transport | null>(null);
    const deviceRef = useRef<mediasoup.types.Device | null>(null);

    const [isMuted, setIsMuted] = useState(true); // Default to muted/no-audio initially
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [hasAudio, setHasAudio] = useState(false);

    const initMediasoup = async () => {
        if (!socket || !roomId) return;

        try {
            console.log('Initializing Mediasoup...');
            // 1. Get Router RTP Capabilities
            const routerRtpCapabilities = await socket.emitWithAck('getRouterRtpCapabilities', roomId);
            console.log('Router RTP Capabilities:', routerRtpCapabilities);

            const newDevice = new mediasoup.Device();
            await newDevice.load({ routerRtpCapabilities });
            setDevice(newDevice);
            deviceRef.current = newDevice;
            setIsDeviceLoaded(true);

            // 2. Create Send Transport
            if (!sendTransportRef.current) {
                console.log('Creating Send Transport...');
                const params = await socket.emitWithAck('createWebRtcTransport', roomId);
                console.log('Send Transport Params:', params);
                const sendTransport = newDevice.createSendTransport(params);

                sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                    console.log('SendTransport: connect');
                    try {
                        await socket.emitWithAck('connectWebRtcTransport', { transportId: sendTransport.id, dtlsParameters });
                        callback();
                    } catch (error: any) {
                        console.error('SendTransport connect error:', error);
                        errback(error);
                    }
                });

                sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
                    console.log('SendTransport: produce', kind);
                    try {
                        const { id } = await socket.emitWithAck('produce', {
                            transportId: sendTransport.id,
                            kind, rtpParameters, appData, roomId
                        });
                        console.log('Producer created:', id);
                        callback({ id });
                    } catch (error: any) {
                        console.error('SendTransport produce error:', error);
                        errback(error);
                    }
                });

                sendTransport.on('connectionstatechange', (state) => {
                    console.log('SendTransport state:', state);
                });

                sendTransportRef.current = sendTransport;
            }

            // 3. Create Recv Transport
            if (!recvTransportRef.current) {
                console.log('Creating Recv Transport...');
                const recvParams = await socket.emitWithAck('createWebRtcTransport', roomId);
                console.log('Recv Transport Params:', recvParams);
                const recvTransport = newDevice.createRecvTransport(recvParams);

                recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                    console.log('RecvTransport: connect');
                    try {
                        await socket.emitWithAck('connectWebRtcTransport', { transportId: recvTransport.id, dtlsParameters });
                        callback();
                    } catch (e: any) {
                        console.error('RecvTransport connect error:', e);
                        errback(e);
                    }
                });

                recvTransport.on('connectionstatechange', (state) => {
                    console.log('RecvTransport state:', state);
                });

                recvTransportRef.current = recvTransport;
            }

        } catch (error) {
            console.error('Failed to init mediasoup:', error);
        }
    };

    const initializeTransports = () => {
        initMediasoup();
    };

    useEffect(() => {
        if (!socket) return;

        // Setup Listeners
        socket.on('waitingForAdmission', () => {
            console.log('Waiting for admission...');
            setStatus('waiting');
        });

        socket.on('admitted', () => {
            console.log('Admitted to meeting!');
            setStatus('admitted');
            initializeTransports();
        });

        socket.on('denied', () => {
            console.log('Denied from meeting');
            setStatus('rejected');
            socket.disconnect();
        });

        socket.on('newProducer', async ({ producerId, producerSocketId, appData }) => {
            if (!deviceRef.current || !recvTransportRef.current) return;

            console.log('New remote producer:', producerId, appData);
            const { rtpCapabilities } = deviceRef.current;
            const { id, kind, rtpParameters } = await socket.emitWithAck('consume', {
                transportId: recvTransportRef.current.id,
                producerId, rtpCapabilities
            });

            const consumer = await recvTransportRef.current.consume({ id, producerId, kind, rtpParameters });

            // Check for duplicates before adding
            setConsumers(prev => {
                if (prev.some(c => c.id === consumer.id)) {
                    console.warn(`Duplicate consumer ${consumer.id} ignored`);
                    return prev;
                }
                return [...prev, { ...consumer, socketId: producerSocketId, appData }];
            });
            await socket.emitWithAck('resumeConsumer', { consumerId: id });
        });

        socket.on('participantList', (list: any[]) => {
            setParticipants(list);
        });

        socket.on('waitingRoomUpdate', ({ waitingParticipants }) => {
            setWaitingParticipants(waitingParticipants);
        });

        socket.on('meetingEnded', () => {
            setMeetingEnded(true);
        });

        socket.on('userLeft', ({ participantId, socketId }) => {
            console.log('User left, cleaning up consumers for participant:', participantId, socketId);
            setConsumers(prev => prev.filter(c => c.socketId !== socketId));
        });

        socket.on('producerClosed', ({ producerId }) => {
            console.log('Remote producer closed:', producerId);
            setConsumers(prev => prev.filter(c => c.producerId !== producerId));
        });

        return () => {
            if (socket) {
                socket.off('waitingForAdmission');
                socket.off('admitted');
                socket.off('denied');
                socket.off('newProducer');
                socket.off('participantList');
                socket.off('waitingRoomUpdate');
                socket.off('meetingEnded');
                socket.off('userLeft');
                socket.off('producerClosed');
            }
        };
    }, [initMediasoup, socket]);

    const closeProducer = (kind: string) => {
        const producer = producersRef.current.get(kind);
        if (producer) {
            console.log(`Closing ${kind} producer...`);
            // Explicitly stop the track to turn off hardware light
            if (producer.track) {
                try {
                    producer.track.stop();
                    console.log(`Stopped ${kind} track`);
                } catch (e) {
                    console.warn(`Error stopping ${kind} track`, e);
                }
            }
            producer.close();
            producersRef.current.delete(kind);
            // Notify server so others can close their consumers
            socket?.emit('closeProducer', { roomId, producerId: producer.id });
        } else {
            console.warn(`No ${kind} producer found to close.`);
        }

        if (kind === 'video') setIsVideoOff(true);
        if (kind === 'audio') {
            setIsMuted(true);
            setHasAudio(false);
        }
    };

    const produce = async (track: MediaStreamTrack) => {
        if (!sendTransportRef.current) return;
        try {
            if (producersRef.current.has(track.kind)) {
                console.log(`Replacing existing ${track.kind} producer`);
                closeProducer(track.kind);
            }

            console.log(`Creating new ${track.kind} producer`);
            const producer = await sendTransportRef.current.produce({ track });
            producersRef.current.set(track.kind, producer);

            if (track.kind === 'audio') {
                setIsMuted(false);
                setHasAudio(true);
            }
            if (track.kind === 'video') setIsVideoOff(false);

            producer.on('trackended', () => {
                console.log(`${track.kind} track ended`);
                closeProducer(track.kind);
            });

            return producer;
        } catch (e) {
            console.error('Produce error:', e);
        }
    };

    const toggleMute = () => {
        const audioProducer = producersRef.current.get('audio');
        if (audioProducer) {
            if (audioProducer.paused) {
                console.log('Resuming audio...');
                audioProducer.resume();
                setIsMuted(false);
            } else {
                console.log('Pausing audio...');
                audioProducer.pause();
                setIsMuted(true);
            }
        } else {
            console.warn('No audio producer found to toggle mute');
        }
    };

    const stopVideo = () => {
        closeProducer('video');
    };

    // Deprecated, use stopVideo or produce(video)
    const toggleVideo = () => {
        console.warn('toggleVideo is deprecated. Use stopVideo or produce new track.');
    };

    const admitParticipant = (participantSocketId: string) => {
        socket?.emit('admitParticipant', { participantSocketId });
    };

    const denyParticipant = (participantSocketId: string) => {
        socket?.emit('denyParticipant', { participantSocketId });
    };

    const [isSharing, setIsSharing] = useState(false);

    const shareScreen = async () => {
        if (!sendTransportRef.current) return;
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            const track = stream.getVideoTracks()[0];

            console.log('Sharing screen...');
            const producer = await sendTransportRef.current.produce({
                track,
                appData: { source: 'screen' }
            });

            producersRef.current.set('screen', producer);

            producer.on('trackended', () => {
                stopSharing();
            });

            setIsSharing(true);
        } catch (e) {
            console.error('Share screen error:', e);
        }
    };

    const stopSharing = () => {
        const screenProducer = producersRef.current.get('screen');
        if (screenProducer) {
            screenProducer.close();
            producersRef.current.delete('screen');
            setIsSharing(false);
            // Ensure track is stopped
            if (screenProducer.track) screenProducer.track.stop();
        }
    };

    return {
        isDeviceLoaded, produce, consumers, toggleMute, toggleVideo,
        isMuted, isVideoOff, participants, meetingEnded,
        waitingParticipants, admitParticipant, denyParticipant, status,
        shareScreen, stopSharing, isSharing, stopVideo, hasAudio
    };
};
