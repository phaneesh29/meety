import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/react';
import { apiRequest } from '../lib/api';

export function useRooms() {
    const { getToken } = useAuth();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRooms() {
            const token = await getToken();
            const data = await apiRequest('GET', '/api/rooms', token);
            setRooms(data.rooms);
            setLoading(false);
        }
        fetchRooms();
    }, []);

    const createRoom = useCallback(async () => {
        const token = await getToken();
        const data = await apiRequest('POST', '/api/rooms', token);
        setRooms((prev) => [data.room, ...prev]);
        return data.room;
    }, [getToken]);

    const deleteRoom = useCallback(async (roomCode) => {
        const token = await getToken();
        await apiRequest('DELETE', `/api/rooms/${roomCode}`, token);
        setRooms((prev) => prev.filter((r) => r.roomCode !== roomCode));
    }, [getToken]);

    return { rooms, loading, createRoom, deleteRoom };
}
