import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/react';
import { io } from 'socket.io-client';

export function useSocket() {
    const { getToken } = useAuth();
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        let active = true;
        let newSocket;

        async function connect() {
            const token = await getToken();
            if (!active) return;
            
            newSocket = io(import.meta.env.VITE_API_URL || '', { 
                auth: { token },
                transports: ['websocket', 'polling'] 
            });
            
            newSocket.on('connect', () => {
                console.log('socket connected:', newSocket.id);
                setIsConnected(true);
            });
            
            newSocket.on('disconnect', (reason) => {
                console.log('socket disconnected:', reason);
                setIsConnected(false);
            });
            
            newSocket.on('connect_error', (err) => {
                console.error('socket error:', err.message);
                setIsConnected(false);
            });

            setSocket(newSocket);
        }

        connect();

        return () => {
            active = false;
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, [getToken]);

    return { socket, isConnected };
}
