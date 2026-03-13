import { useRef, useEffect, useState, useCallback } from 'react';
import Peer from 'simple-peer/simplepeer.min.js';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

export function useWebRTC(socket, roomCode) {
    const peersRef = useRef({}); // { [socketId]: Peer }
    const localStreamRef = useRef(null);
    const [localStream, setLocalStream] = useState(null);
    const [streams, setStreams] = useState([]); // Array of { id: string, stream: MediaStream, displayName: string }
    const [videoDevices, setVideoDevices] = useState([]);
    const [selectedVideoDevice, setSelectedVideoDevice] = useState(null);

    const initializeMedia = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            const vDevices = devices.filter(device => device.kind === 'videoinput');
            setVideoDevices(vDevices);
            
            const currentTrackId = stream.getVideoTracks()[0]?.getSettings().deviceId;
            setSelectedVideoDevice(currentTrackId || vDevices[0]?.deviceId);

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
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: deviceId } }
            });

            const newVideoTrack = stream.getVideoTracks()[0];
            const oldVideoTrack = localStreamRef.current?.getVideoTracks()[0];

            if (oldVideoTrack && newVideoTrack) {
                // Preserve the disabled state
                newVideoTrack.enabled = oldVideoTrack.enabled;

                Object.values(peersRef.current).forEach(peer => {
                    // replaceTrack is available in simple-peer
                    peer.replaceTrack(oldVideoTrack, newVideoTrack, localStreamRef.current);
                });
                
                oldVideoTrack.stop();
                
                const newStream = new MediaStream([
                    ...localStreamRef.current.getAudioTracks(),
                    newVideoTrack
                ]);
                
                localStreamRef.current = newStream;
                setLocalStream(newStream);
                setSelectedVideoDevice(deviceId);
            }
        } catch (error) {
            console.error('Error changing camera:', error);
        }
    }, []);

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

    return { localStream, streams, initializeMedia, cleanup, joinUsers, videoDevices, selectedVideoDevice, changeCamera };
}
