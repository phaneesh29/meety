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
                if (peer && typeof peer.replaceTrack === 'function') {
                    try {
                        peer.replaceTrack(oldVideoTrack, newVideoTrack, newStream);
                    } catch (err) {
                        console.error('Error replacing video track on peer:', err);
                    }
                }
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
                if (peer && typeof peer.replaceTrack === 'function') {
                    try {
                        peer.replaceTrack(oldAudioTrack, newAudioTrack, newStream);
                    } catch (err) {
                        console.error('Error replacing audio track on peer:', err);
                    }
                }
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

    const stopScreenShare = useCallback(async (originalVideoDevice) => {
        if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop());
        }

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
                if (peer && typeof peer.replaceTrack === 'function') {
                    try {
                        peer.replaceTrack(currentVideoTrack, newVideoTrack, newLocalStream);
                    } catch (err) {
                        console.error('Error replacing video track on peer:', err);
                    }
                }
            });

            // Stop old track after replacement
            currentVideoTrack.stop();
        } catch (error) {
            console.error('Error reverting to camera:', error);
        }

        setIsScreenSharing(false);
        setScreenStream(null);
        if (socket) {
            socket.emit('screen-share-stop', roomCode);
        }
    }, [screenStream, socket, roomCode]);

    const toggleScreenShare = useCallback(async () => {
        if (!isScreenSharing) {
            // Check browser support first
            if (!supportsScreenShare()) {
                return { success: false, error: screenShareError };
            }

            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
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
                    if (peer && typeof peer.replaceTrack === 'function') {
                        try {
                            peer.replaceTrack(oldVideoTrack, screenVideoTrack, newStream);
                        } catch (err) {
                            console.error('Error replacing video track on peer during screen share:', err);
                        }
                    }
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
            config: ICE_SERVERS
        });

        peer.on('signal', signal => {
            if (socket) {
                socket.emit('webrtc-signal', { target: id, signal });
            }
        });

        peer.on('stream', currentStream => {
            setStreams(prev => {
                const existing = prev.find(s => s.id === id);
                if (existing) {
                    return prev;
                }
                return [...prev, { id, displayName, stream: currentStream }];
            });
        });

        // Listen for track replacement events from remote peer
        peer.on('track', (track, currentStream) => {
            setStreams(prev => prev.map(s => {
                if (s.id === id) {
                    // Clone stream to trigger React re-render and reassign srcObject
                    return { ...s, stream: new MediaStream(currentStream.getTracks()) };
                }
                return s;
            }));
        });

        peersRef.current[id] = peer;
        return peer;
    }, [socket]);

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
