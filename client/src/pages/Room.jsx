import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/react';
import { useSocket } from '../hooks/useSocket';
import AnalyticsModal from '../components/AnalyticsModal';
import { BarChart2, Send } from 'lucide-react';
import { apiRequest } from '../lib/api';

export default function RoomPage() {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const { socket, isConnected } = useSocket();
    const { user } = useUser();
    const { getToken } = useAuth();

    const [joined, setJoined] = useState(false);
    const [roomInfo, setRoomInfo] = useState(null);
    const [error, setError] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [showAnalytics, setShowAnalytics] = useState(false);
    
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [typingUsers, setTypingUsers] = useState([]);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, notifications]);

    useEffect(() => {
        async function fetchMessages() {
            try {
                const token = await getToken();
                const data = await apiRequest('GET', `/api/rooms/${roomCode}/messages`, token);
                // Map the api data to our internal state structure
                const formattedMessages = data.messages.map(m => ({
                    id: m.id,
                    message: m.message,
                    sender: m.sender,
                    createdAt: m.createdAt,
                    isSelf: m.clerkId === user?.id
                }));
                setMessages(formattedMessages);
            } catch (err) {
                console.error("Failed to fetch messages", err);
            }
        }
        if (user) {
            fetchMessages();
        }
    }, [roomCode, getToken, user]);

    useEffect(() => {
        if (!socket || !isConnected) return;

        // Try to join the room
        socket.emit('join-room', roomCode, (response) => {
            if (response.success) {
                setJoined(true);
                setRoomInfo(response.room);
            } else {
                setError(response.error || 'Failed to join room');
            }
        });

        // Listen for others joining/leaving
        const onUserJoined = ({ displayName }) => {
            setNotifications(prev => [...prev, `${displayName} joined`]);
        };

        const onUserLeft = ({ displayName }) => {
            setNotifications(prev => [...prev, `${displayName} left`]);
        };

        const onChatReceived = (messageData) => {
            setMessages(prev => [...prev, messageData]);
        };

        const onUserTyping = ({ displayName, isTyping }) => {
            setTypingUsers(prev => {
                if (isTyping) {
                    if (prev.includes(displayName)) return prev;
                    return [...prev, displayName];
                } else {
                    return prev.filter(name => name !== displayName);
                }
            });
        };

        socket.on('user-joined', onUserJoined);
        socket.on('user-left', onUserLeft);
        socket.on('chat-received', onChatReceived);
        socket.on('user-typing', onUserTyping);

        return () => {
            socket.off('user-joined', onUserJoined);
            socket.off('user-left', onUserLeft);
            socket.off('chat-received', onChatReceived);
            socket.off('user-typing', onUserTyping);
            socket.emit('leave-room', roomCode);
        };
    }, [socket, isConnected, roomCode]);

    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        if (!socket) return;

        socket.emit('typing-start', roomCode);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing-stop', roomCode);
        }, 1500);
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket) return;
        
        socket.emit('chat-message', roomCode, newMessage.trim());
        setNewMessage("");
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        socket.emit('typing-stop', roomCode);
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <h1 className="text-2xl font-semibold text-red-500">Error</h1>
                <p className="text-sm">{error}</p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="text-sm text-gray-500 hover:text-gray-800 underline"
                >
                    Back to dashboard
                </button>
            </div>
        );
    }

    if (!joined) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-sm text-gray-500">Connecting to room...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-[60vh] p-6 max-w-4xl mx-auto">
            <header className="flex items-center justify-between mb-8 pb-4 border-b">
                <div>
                    <h1 className="text-2xl font-semibold">Meeting Room</h1>
                    <p className="text-sm text-gray-500 font-mono mt-1">{roomCode}</p>
                </div>
                <div className="flex items-center gap-3">
                    {roomInfo?.createdBy === user?.id && (
                        <button
                            onClick={() => setShowAnalytics(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors font-medium"
                        >
                            <BarChart2 className="w-4 h-4" />
                            Analytics
                        </button>
                    )}
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors font-medium"
                    >
                        Leave Room
                    </button>
                </div>
            </header>

            <div className="flex flex-1 gap-6 min-h-0 bg-white">
                {/* Chat Section */}
                <div className="flex-1 flex flex-col bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                    <div className="p-4 bg-white border-b">
                        <h3 className="font-medium text-slate-700">Room Chat</h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 ? (
                            <p className="text-center text-sm text-slate-400 mt-10">No messages yet. Start the conversation!</p>
                        ) : (
                            messages.map((msg, i) => (
                                <div key={msg.id || i} className={`flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-baseline gap-2 mb-1 px-1">
                                        <span className="text-xs font-medium text-slate-600">
                                            {msg.isSelf ? 'You' : msg.sender}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm ${msg.isSelf ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'}`}>
                                        {msg.message}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex flex-col gap-2 relative">
                        {typingUsers.length > 0 && (
                            <div className="absolute -top-6 left-4 text-xs text-slate-500 italic">
                                {typingUsers.length === 1 
                                    ? `${typingUsers[0]} is typing...` 
                                    : `${typingUsers.join(', ')} are typing...`}
                            </div>
                        )}
                        <div className="flex gap-2 w-full">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={handleTyping}
                                placeholder="Type a message..."
                                className="flex-1 px-4 py-2 bg-slate-100 border-transparent rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm outline-none transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="p-2 ml-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </form>
                </div>

                {/* Activity Log Section */}
                <div className="w-64 flex flex-col bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-white border-b">
                        <h3 className="font-medium text-slate-700">Activity Log</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {notifications.length === 0 ? (
                            <p className="text-sm text-slate-400">No activity yet. Waiting for others to join...</p>
                        ) : (
                            notifications.map((note, i) => (
                                <div key={i} className="px-3 py-2 bg-white rounded-lg shadow-sm border border-slate-100 text-xs text-slate-600 font-medium">
                                    {note}
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            </div>
            
            {showAnalytics && <AnalyticsModal roomCode={roomCode} onClose={() => setShowAnalytics(false)} />}
        </div>
    );
}
