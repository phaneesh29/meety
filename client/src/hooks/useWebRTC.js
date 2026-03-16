import { useRef, useEffect, useState, useCallback } from 'react';
import Peer from 'simple-peer/simplepeer.min.js';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
    ]
};

function preferOpusCodec(sdp) {
    if (!sdp || typeof sdp !== 'string') return sdp;

    const lines = sdp.split('\r\n');
    const opusPayloadTypes = [];

    for (const line of lines) {
        const match = line.match(/^a=rtpmap:(\d+) opus\//i);
        if (match) {
            opusPayloadTypes.push(match[1]);
        }
    }

    if (opusPayloadTypes.length === 0) return sdp;

    const updatedLines = lines.map(line => {
        if (!line.startsWith('m=audio ')) return line;

        const parts = line.split(' ');
        if (parts.length < 4) return line;

        const header = parts.slice(0, 3);
        const payloads = parts.slice(3);
        const opusSet = new Set(opusPayloadTypes);

        const preferred = payloads.filter(pt => opusSet.has(pt));
        const others = payloads.filter(pt => !opusSet.has(pt));

        return [...header, ...preferred, ...others].join(' ');
    });

    return updatedLines.join('\r\n');
}

export function useWebRTC(socket, roomCode) {
    const peersRef = useRef({}); // { [socketId]: Peer }
    const localStreamRef = useRef(null);
    const [localStream, setLocalStream] = useState(null);
    const [streams, setStreams] = useState([]); // Array of { id: string, stream: MediaStream, displayName: string }
    const [videoDevices, setVideoDevices] = useState([]);
    const [selectedVideoDevice, setSelectedVideoDevice] = useState(null);
    const [audioInputDevices, setAudioInputDevices] = useState([]);
    const [selectedAudioInputDevice, setSelectedAudioInputDevice] = useState('default');
    const [audioOutputDevices, setAudioOutputDevices] = useState([]);
    const [selectedAudioOutputDevice, setSelectedAudioOutputDevice] = useState('default');
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [screenStream, setScreenStream] = useState(null);
    const [screenShareError, setScreenShareError] = useState(null);

    const replaceTrackOnPeer = useCallback((peer, oldTrack, newTrack, stream, context) => {
        if (!peer || !newTrack || !stream) return;

        let replacedWithSimplePeer = false;

        if (oldTrack && typeof peer.replaceTrack === 'function') {
            try {
                peer.replaceTrack(oldTrack, newTrack, stream);
                replacedWithSimplePeer = true;
            } catch (err) {
                console.error(`Error replacing ${newTrack.kind} track on peer (${context})`, err);
            }
        }

        if (replacedWithSimplePeer) {
            return;
        }

        const pc = peer._pc;
        const senders = pc && typeof pc.getSenders === 'function' ? pc.getSenders() : [];
        const matchingSender = senders.find(sender => sender.track && sender.track.kind === newTrack.kind);

        if (matchingSender && typeof matchingSender.replaceTrack === 'function') {
            matchingSender.replaceTrack(newTrack).catch(err => {
                console.error(`Error fallback-replacing ${newTrack.kind} sender (${context})`, err);
            });
            return;
        }

        if (typeof peer.addTrack === 'function') {
            try {
                peer.addTrack(newTrack, stream);
            } catch (err) {
                console.error(`Error fallback-adding ${newTrack.kind} track (${context})`, err);
            }
        }
    }, []);

    const initializeMedia = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    frameRate: { ideal: 24, max: 30 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            const devices = await navigator.mediaDevices.enumerateDevices();
            const vDevices = devices.filter(device => device.kind === 'videoinput');
            const aInputDevices = devices.filter(device => device.kind === 'audioinput');
            const aOutputDevices = devices.filter(device => device.kind === 'audiooutput');

            setVideoDevices(vDevices);
            setAudioInputDevices(aInputDevices);
            setAudioOutputDevices(aOutputDevices);

            const currentVideoTrackId = stream.getVideoTracks()[0]?.getSettings().deviceId;
            setSelectedVideoDevice(currentVideoTrackId || vDevices[0]?.deviceId);

            const currentAudioTrackId = stream.getAudioTracks()[0]?.getSettings().deviceId;
            setSelectedAudioInputDevice(currentAudioTrackId || 'default');

            localStreamRef.current = stream;
            setLocalStream(stream);
            return stream;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            throw error;
        }
    }, []);

    const changeCamera = useCallback(async (deviceId) => {
        try {
            const constraints = {
                video: (!deviceId || deviceId === 'default') ? {
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    frameRate: { ideal: 24, max: 30 }
                } : {
                    deviceId: { exact: deviceId },
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    frameRate: { ideal: 24, max: 30 }
                }
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            const newVideoTrack = stream.getVideoTracks()[0];
            const oldVideoTrack = localStreamRef.current?.getVideoTracks()[0];

            if (!oldVideoTrack || !newVideoTrack) {
                stream.getTracks().forEach(track => track.stop());
                console.error('Error changing camera: missing video tracks');
                return;
            }

            // Preserve the disabled state
            newVideoTrack.enabled = oldVideoTrack.enabled;

            // Create and update local stream BEFORE replaceTrack
            const newStream = new MediaStream([
                ...localStreamRef.current.getAudioTracks(),
                newVideoTrack
            ]);

            localStreamRef.current = newStream;
            setLocalStream(newStream);
            setSelectedVideoDevice(deviceId);

            // Now replace tracks on all peers with updated stream
            Object.values(peersRef.current).forEach(peer => {
                replaceTrackOnPeer(peer, oldVideoTrack, newVideoTrack, newStream, 'changeCamera');
            });

            // Stop old track after successful replacement
            oldVideoTrack.stop();
        } catch (error) {
            console.error('Error changing camera:', error);
        }
    }, []);

    const changeAudioInput = useCallback(async (deviceId) => {
        try {
            const constraints = {
                audio: deviceId === 'default' ? {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } : {
                    deviceId: { exact: deviceId },
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            const newAudioTrack = stream.getAudioTracks()[0];
            const oldAudioTrack = localStreamRef.current?.getAudioTracks()[0];

            if (!oldAudioTrack || !newAudioTrack) {
                stream.getTracks().forEach(track => track.stop());
                console.error('Error changing audio input: missing audio tracks');
                return;
            }

            // Preserve the disabled state
            newAudioTrack.enabled = oldAudioTrack.enabled;

            // Create and update local stream BEFORE replaceTrack
            const newStream = new MediaStream([
                ...localStreamRef.current.getVideoTracks(),
                newAudioTrack
            ]);

            localStreamRef.current = newStream;
            setLocalStream(newStream);
            setSelectedAudioInputDevice(deviceId);

            // Now replace tracks on all peers with updated stream
            Object.values(peersRef.current).forEach(peer => {
                replaceTrackOnPeer(peer, oldAudioTrack, newAudioTrack, newStream, 'changeAudioInput');
            });

            // Stop old track after successful replacement
            oldAudioTrack.stop();
        } catch (error) {
            console.error('Error changing audio input:', error);
        }
    }, []);

    const changeAudioOutput = useCallback((deviceId) => {
        setSelectedAudioOutputDevice(deviceId);
    }, []);

    // Check if browser supports screen sharing (no side effects, pure check)
    const checkScreenShareSupport = useCallback(() => {
        const userAgent = navigator.userAgent.toLowerCase();
        const isIOS = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
        if (isIOS) {
            return { supported: false, reason: 'iOS' };
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            return { supported: false, reason: 'browser' };
        }

        return { supported: true, reason: null };
    }, []);

    // Set error message when needed (only called from effects/handlers)
    const setScreenShareErrorMessage = useCallback((reason) => {
        if (reason === 'iOS') {
            setScreenShareError('Screen sharing is not supported on iOS. Please use a desktop browser or Android Chrome.');
        } else if (reason === 'browser') {
            setScreenShareError('Screen sharing is not supported on this browser. Please use Chrome, Edge, or Firefox on desktop.');
        } else {
            setScreenShareError(null);
        }
    }, []);

    const supportsScreenShare = useCallback(() => {
        const check = checkScreenShareSupport();
        if (!check.supported) {
            setScreenShareErrorMessage(check.reason);
        }
        return check.supported;
    }, [checkScreenShareSupport, setScreenShareErrorMessage]);

    const recoverAudioTrackIfNeeded = useCallback(async () => {
        const currentAudioTrack = localStreamRef.current?.getAudioTracks()[0];
        if (currentAudioTrack && currentAudioTrack.readyState === 'live') {
            Object.values(peersRef.current).forEach(peer => {
                replaceTrackOnPeer(peer, null, currentAudioTrack, localStreamRef.current, 'recoverAudioTrack-live-sync');
            });
            return;
        }

        try {
            const audioConstraints = selectedAudioInputDevice && selectedAudioInputDevice !== 'default'
                ? {
                    deviceId: { exact: selectedAudioInputDevice },
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
                : {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                };

            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
            const newAudioTrack = audioStream.getAudioTracks()[0];
            if (!newAudioTrack) {
                audioStream.getTracks().forEach(track => track.stop());
                return;
            }

            const currentVideoTrack = localStreamRef.current?.getVideoTracks()[0];
            const newLocalStream = new MediaStream([
                ...(currentVideoTrack ? [currentVideoTrack] : []),
                newAudioTrack
            ]);

            localStreamRef.current = newLocalStream;
            setLocalStream(newLocalStream);

            Object.values(peersRef.current).forEach(peer => {
                if (!peer) return;
                replaceTrackOnPeer(peer, currentAudioTrack || null, newAudioTrack, newLocalStream, 'recoverAudioTrack-reacquire');
            });

            if (currentAudioTrack && currentAudioTrack.readyState !== 'ended') {
                currentAudioTrack.stop();
            }
        } catch (error) {
            console.error('Error recovering audio track:', error);
        }
    }, [selectedAudioInputDevice, replaceTrackOnPeer]);

    const stopScreenShare = useCallback(async (originalVideoDevice) => {
        const displayTracksToStop = screenStream ? screenStream.getTracks() : [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: originalVideoDevice ? { deviceId: { exact: originalVideoDevice } } : {
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    frameRate: { ideal: 24, max: 30 }
                }
            });
            const newVideoTrack = stream.getVideoTracks()[0];
            const currentVideoTrack = localStreamRef.current?.getVideoTracks()[0];

            if (!newVideoTrack || !currentVideoTrack) {
                stream.getTracks().forEach(track => track.stop());
                console.error('Error reverting to camera: missing video tracks');
                return;
            }

            newVideoTrack.enabled = currentVideoTrack.enabled;

            // Create and update local stream BEFORE replaceTrack
            const newLocalStream = new MediaStream([
                ...localStreamRef.current.getAudioTracks(),
                newVideoTrack
            ]);
            localStreamRef.current = newLocalStream;
            setLocalStream(newLocalStream);

            // Now replace tracks on all peers with updated stream
            Object.values(peersRef.current).forEach(peer => {
                replaceTrackOnPeer(peer, currentVideoTrack, newVideoTrack, newLocalStream, 'stopScreenShare');
            });

            // Stop old track after replacement
            currentVideoTrack.stop();
        } catch (error) {
            console.error('Error reverting to camera:', error);
        }

        await recoverAudioTrackIfNeeded();

        displayTracksToStop.forEach(track => track.stop());

        setIsScreenSharing(false);
        setScreenStream(null);
        if (socket) {
            socket.emit('screen-share-stop', roomCode);
        }
    }, [screenStream, socket, roomCode, recoverAudioTrackIfNeeded]);

    const toggleScreenShare = useCallback(async () => {
        if (!isScreenSharing) {
            // Check browser support first
            if (!supportsScreenShare()) {
                return { success: false, error: screenShareError };
            }

            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
                const screenVideoTrack = stream.getVideoTracks()[0];
                const oldVideoTrack = localStreamRef.current?.getVideoTracks()[0];

                if (!screenVideoTrack || !oldVideoTrack) {
                    stream.getTracks().forEach(track => track.stop());
                    const errorMsg = 'Failed to initialize screen share: missing video track';
                    setScreenShareError(errorMsg);
                    return { success: false, error: errorMsg };
                }

                // Create and update local stream BEFORE replaceTrack
                const newStream = new MediaStream([
                    ...localStreamRef.current.getAudioTracks(),
                    screenVideoTrack
                ]);

                localStreamRef.current = newStream;
                setLocalStream(newStream);
                setScreenStream(stream);
                setIsScreenSharing(true);
                setScreenShareError(null);

                // Now replace tracks on all peers with updated stream
                Object.values(peersRef.current).forEach(peer => {
                    replaceTrackOnPeer(peer, oldVideoTrack, screenVideoTrack, newStream, 'startScreenShare');
                });

                // Stop old track after replacement
                oldVideoTrack.stop();

                if (socket) {
                    socket.emit('screen-share-start', roomCode);
                }

                screenVideoTrack.onended = () => {
                    stopScreenShare(selectedVideoDevice);
                };

                return { success: true };
            } catch (err) {
                console.error("Error sharing screen:", err);
                const errorMsg = err.name === 'NotAllowedError' 
                    ? 'Screen share was cancelled' 
                    : 'Failed to start screen sharing';
                setScreenShareError(errorMsg);
                return { success: false, error: errorMsg };
            }
        } else {
            await stopScreenShare(selectedVideoDevice);
            return { success: true };
        }
    }, [isScreenSharing, socket, roomCode, stopScreenShare, selectedVideoDevice, screenShareError, supportsScreenShare]);

    const createPeer = useCallback((id, stream, isInitiator, displayName) => {
        const peer = new Peer({
            initiator: isInitiator,
            trickle: true,
            stream: stream,
            config: ICE_SERVERS,
            sdpTransform: preferOpusCodec
        });

        peer.on('signal', signal => {
            if (socket) {
                socket.emit('webrtc-signal', { target: id, signal });
            }
        });

        peer.on('connect', () => {
            const currentStream = localStreamRef.current;
            if (!currentStream) return;

            const currentAudioTrack = currentStream.getAudioTracks()[0];
            const currentVideoTrack = currentStream.getVideoTracks()[0];

            if (currentAudioTrack) {
                replaceTrackOnPeer(peer, null, currentAudioTrack, currentStream, 'peer-connect-audio-sync');
            }
            if (currentVideoTrack) {
                replaceTrackOnPeer(peer, null, currentVideoTrack, currentStream, 'peer-connect-video-sync');
            }
        });

        peer.on('stream', currentStream => {
            setStreams(prev => {
                const existing = prev.find(s => s.id === id);
                if (existing) {
                    return prev.map(s => s.id === id
                        ? { ...s, displayName: s.displayName || displayName, stream: currentStream }
                        : s
                    );
                }
                return [...prev, { id, displayName, stream: currentStream }];
            });
        });

        // Merge incoming track by kind to avoid dropping audio on renegotiation/reload.
        peer.on('track', (track, currentStream) => {
            setStreams(prev => {
                const existing = prev.find(s => s.id === id);

                if (!existing) {
                    const baseStream = currentStream
                        ? new MediaStream(currentStream.getTracks())
                        : new MediaStream([track]);
                    return [...prev, { id, displayName, stream: baseStream }];
                }

                const nextStream = new MediaStream();

                // Keep all non-ended tracks except same-kind track we are replacing.
                existing.stream.getTracks().forEach(existingTrack => {
                    if (existingTrack.readyState === 'ended') return;
                    if (existingTrack.kind === track.kind) return;
                    nextStream.addTrack(existingTrack);
                });

                nextStream.addTrack(track);

                // Add any missing live tracks from the current stream (e.g. audio track).
                if (currentStream) {
                    currentStream.getTracks().forEach(incomingTrack => {
                        if (incomingTrack.readyState === 'ended') return;
                        const hasKind = nextStream.getTracks().some(t => t.kind === incomingTrack.kind);
                        if (!hasKind) {
                            nextStream.addTrack(incomingTrack);
                        }
                    });
                }

                return prev.map(s => s.id === id ? { ...s, stream: nextStream } : s);
            });
        });

        peersRef.current[id] = peer;
        return peer;
    }, [socket, replaceTrackOnPeer]);

    const removePeer = useCallback((id) => {
        if (peersRef.current[id]) {
            peersRef.current[id].destroy();
            delete peersRef.current[id];
        }
        setStreams(prev => prev.filter(s => s.id !== id));
    }, []);

    useEffect(() => {
        if (!socket || !roomCode) return;

        const handleUserLeft = ({ id }) => {
            removePeer(id);
        };

        const handleSignal = ({ from, signal, displayName }) => {
            let peer = peersRef.current[from];
            if (!peer) {
                // Validate local stream exists before creating peer
                if (!localStreamRef.current) {
                    console.warn('Cannot create peer: local stream not initialized');
                    return;
                }
                peer = createPeer(from, localStreamRef.current, false, displayName);
            }
            peer.signal(signal);
        };

        socket.on('user-left', handleUserLeft);
        socket.on('webrtc-signal', handleSignal);

        return () => {
            socket.off('user-left', handleUserLeft);
            socket.off('webrtc-signal', handleSignal);
        };
    }, [socket, roomCode, createPeer, removePeer]);

    // Use to setup initial incoming users when self joins
    const joinUsers = useCallback((users) => {
        users.forEach(user => {
            createPeer(user.id, localStreamRef.current, true, user.displayName);
        });
    }, [createPeer]);

    const cleanup = useCallback(() => {
        Object.keys(peersRef.current).forEach(id => removePeer(id));
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }
    }, [removePeer]);

    return {
        localStream, streams, initializeMedia, cleanup, joinUsers,
        videoDevices, selectedVideoDevice, changeCamera,
        audioInputDevices, selectedAudioInputDevice, changeAudioInput, audioOutputDevices, selectedAudioOutputDevice, changeAudioOutput,
        isScreenSharing, toggleScreenShare, screenShareError, supportsScreenShare, checkScreenShareSupport
    };
}
