import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/react';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { useLogout } from '../hooks/useLogout';
import AnalyticsModal from '../components/AnalyticsModal';
import { BarChart2, Send, Mic, MicOff, Video, VideoOff, MessageSquare, Users, PhoneOff, Copy, Check, Settings, X, ChevronUp, ChevronDown, User, LogOut, LayoutDashboard } from 'lucide-react';
import { apiRequest } from '../lib/api';

const VideoPlayer = ({ stream, isLocal, displayName, muted, isVideoOff, audioOutputDevice }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream && !isVideoOff) {
            videoRef.current.srcObject = stream;
        }
    }, [stream, isVideoOff]);
    
    useEffect(() => {
        if (videoRef.current && typeof videoRef.current.setSinkId === 'function' && audioOutputDevice) {
            videoRef.current.setSinkId(audioOutputDevice === 'default' ? '' : audioOutputDevice)
                .catch(err => console.error("Error setting audio output device:", err));
        }
    }, [audioOutputDevice]);

    return (
        <div className="relative bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden flex items-center justify-center h-full w-full border border-white/10 shadow-2xl transition-all duration-300 hover:border-white/20 group">
            {isVideoOff ? (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-white/10 text-indigo-300 flex items-center justify-center font-bold text-4xl sm:text-6xl shadow-2xl backdrop-blur-xl">
                    {displayName.charAt(0).toUpperCase()}
                </div>
            ) : (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal || muted}
                    className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
                />
            )}
            <div className={`absolute bottom-4 left-4 ${isVideoOff ? 'bg-transparent text-gray-300' : 'bg-black/60 text-white backdrop-blur-md border border-white/10'} px-4 py-2 rounded-xl text-sm font-semibold transition-all group-hover:scale-105`}>
                {displayName} {isLocal && '(You)'}
            </div>
        </div>
    );
};

export default function RoomPage() {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const { socket, isConnected } = useSocket();
    const { user } = useUser();
    const { getToken } = useAuth();
    const { logout, isLoading: isLoggingOut } = useLogout();
    const { 
        localStream, streams, initializeMedia, cleanup, joinUsers, 
        videoDevices, selectedVideoDevice, changeCamera,
        audioInputDevices, selectedAudioInputDevice, changeAudioInput,
        audioOutputDevices, selectedAudioOutputDevice, changeAudioOutput
    } = useWebRTC(socket, roomCode);

    const [joined, setJoined] = useState(false);
    const [roomInfo, setRoomInfo] = useState(null);
    const [error, setError] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [sidebarTab, setSidebarTab] = useState('chat'); // 'chat' or 'people'
    const [copied, setCopied] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const profileDropdownRef = useRef(null);
    
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [typingUsers, setTypingUsers] = useState([]);
    const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const sidebarStateRef = useRef({ isOpen: false, tab: 'chat' });

    useEffect(() => {
        sidebarStateRef.current = { isOpen: isSidebarOpen, tab: sidebarTab };
        if (isSidebarOpen && sidebarTab === 'chat') {
            setHasUnreadMessages(false);
        }
    }, [isSidebarOpen, sidebarTab]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, notifications]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
                setIsProfileDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
        let mounted = true;
        
        async function setup() {
            try {
                await initializeMedia();
            } catch (err) {
                // Ignore media error or show permission warning
                console.error("No media devices");
            }
            if (!socket || !isConnected || !mounted) return;

            // Try to join the room
            socket.emit('join-room', roomCode, (response) => {
                if (response.success) {
                    setJoined(true);
                    setRoomInfo(response.room);
                    if (response.users) {
                        joinUsers(response.users);
                    }
                } else {
                    setError(response.error || 'Failed to join room');
                }
            });
        }
        
        if (socket && isConnected) {
            setup();
        }

        if (!socket) return;

        // Listen for others joining/leaving
        const onUserJoined = ({ displayName, id }) => {
            setNotifications(prev => [...prev, `${displayName} joined`]);
        };

        const onUserLeft = ({ displayName }) => {
            setNotifications(prev => [...prev, `${displayName} left`]);
        };

        const onChatReceived = (messageData) => {
            setMessages(prev => [...prev, messageData]);
            if (!sidebarStateRef.current.isOpen || sidebarStateRef.current.tab !== 'chat') {
                setHasUnreadMessages(true);
            }
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
            mounted = false;
            socket.off('user-joined', onUserJoined);
            socket.off('user-left', onUserLeft);
            socket.off('chat-received', onChatReceived);
            socket.off('user-typing', onUserTyping);
            socket.emit('leave-room', roomCode);
            cleanup();
        };
    }, [socket, isConnected, roomCode, initializeMedia, cleanup, joinUsers]);

    const toggleAudio = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
            setIsAudioMuted(!localStream.getAudioTracks()[0]?.enabled);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
            setIsVideoMuted(!localStream.getVideoTracks()[0]?.enabled);
        }
    };

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

    const handleCopyUrl = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
            <div className="flex items-center justify-center min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black text-white relative overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
                <div className="flex flex-col items-center gap-6 z-10 glass-clerk p-12 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl">
                    <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-indigo-500 border-t-transparent shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                    <p className="text-lg font-medium text-gray-300 tracking-wide">Joining secure room...</p>
                </div>
            </div>
        );
    }

    const participants = [
        { id: 'local', displayName: user?.firstName || 'You' },
        ...streams.map(s => ({ id: s.id, displayName: s.displayName }))
    ];

    // Calculate grid classes based on number of participants (max 4)
    const getGridClass = (count) => {
        if (count === 1) return 'grid-cols-1 grid-rows-1';
        if (count === 2) return 'grid-cols-2 grid-rows-1';
        if (count === 3 || count === 4) return 'grid-cols-2 grid-rows-2';
        return 'grid-cols-2 grid-rows-2';
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black font-sans overflow-hidden relative">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            
            <div className="flex flex-1 overflow-hidden p-2 sm:p-4 gap-4 relative z-10">
                {/* Floating Top Info Overlay */}
                <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-20 flex items-center gap-3 bg-white/5 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 shadow-2xl transition-all">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-sm font-semibold text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                        title="Back to Dashboard"
                    >
                        <LayoutDashboard className="w-5 h-5text-indigo-400" />
                        <span className="hidden sm:inline tracking-wide">Dashboard</span>
                    </button>
                    
                    <div className="h-5 w-[2px] bg-white/10 mx-2 rounded-full"></div>
                    
                    <div className="relative" ref={profileDropdownRef}>
                        <button
                            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                            className="flex items-center gap-2 hover:bg-white/10 p-1 pr-2 rounded-full transition-colors focus:outline-none"
                        >
                            <img 
                                src={user?.imageUrl} 
                                alt="Profile" 
                                className="w-8 h-8 rounded-full border-2 border-white/20 object-cover bg-indigo-500/20 shadow-md"
                            />
                            <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform duration-300 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isProfileDropdownOpen && (
                            <div className="absolute left-0 mt-3 w-64 bg-slate-900/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="px-4 py-4 border-b border-white/10 mb-2 flex items-center gap-4">
                                    <img 
                                        src={user?.imageUrl} 
                                        alt="Profile" 
                                        className="w-12 h-12 rounded-full border-2 border-indigo-500/50 shadow-lg"
                                    />
                                    <div className="flex flex-col truncate">
                                        <span className="text-[15px] font-semibold text-white truncate">{user?.fullName || user?.firstName || 'User'}</span>
                                        <span className="text-xs text-gray-400 truncate mt-0.5">{user?.primaryEmailAddress?.emailAddress}</span>
                                    </div>
                                </div>
                                
                                <button
                                    onClick={() => navigate('/profile')}
                                    className="w-full text-left px-5 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-all flex items-center gap-3 font-medium"
                                >
                                    <User className="w-4 h-4 text-indigo-400" />
                                    Manage Profile
                                </button>
                                
                                <button
                                    onClick={() => {
                                        setIsProfileDropdownOpen(false);
                                        logout();
                                    }}
                                    disabled={isLoggingOut}
                                    className="w-full text-left px-5 py-3 text-sm text-red-400 hover:bg-white/10 hover:text-red-300 transition-all flex items-center gap-3 font-medium disabled:opacity-50"
                                >
                                    <LogOut className="w-4 h-4" />
                                    {isLoggingOut ? 'Signing out...' : 'Sign out'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Video Grid Section */}
                <div className={`flex-1 grid gap-4 transition-all duration-300 ${getGridClass(participants.length)}`}>
                    {localStream && (
                        <div className="w-full h-full min-h-0">
                            <VideoPlayer 
                                stream={localStream} 
                                isLocal={true} 
                                displayName={user?.firstName || 'You'}
                                muted={isAudioMuted}
                                isVideoOff={isVideoMuted}
                            />
                        </div>
                    )}
                    {streams.map(remote => (
                        <div key={remote.id} className="w-full h-full min-h-0">
                            <VideoPlayer
                                stream={remote.stream}
                                isLocal={false}
                                displayName={remote.displayName}
                                muted={false}
                                isVideoOff={false}
                                audioOutputDevice={selectedAudioOutputDevice}
                            />
                        </div>
                    ))}
                </div>

                {/* Right Sidebar: Chat & People */}
                {isSidebarOpen && (
                    <div className="absolute inset-y-4 right-4 z-30 md:static w-80 md:w-80 flex flex-col bg-slate-900/80 backdrop-blur-3xl rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 border border-white/10">
                        <div className="p-2 border-b border-white/10 flex gap-2">
                            <button 
                                onClick={() => setSidebarTab('chat')}
                                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${sidebarTab === 'chat' ? 'bg-white/10 text-indigo-400 shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                Chat
                            </button>
                            <button 
                                onClick={() => setSidebarTab('people')}
                                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${sidebarTab === 'people' ? 'bg-white/10 text-indigo-400 shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                People
                            </button>
                            {/* Close sidebar button for mobile overlay */}
                            <button 
                                onClick={() => setIsSidebarOpen(false)}
                                className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        {sidebarTab === 'chat' ? (
                            <>
                                <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scroll">
                                    {messages.length === 0 ? (
                                        <div className="h-full flex items-center justify-center">
                                            <div className="text-center bg-white/5 p-6 rounded-2xl border border-white/10">
                                                <MessageSquare className="w-8 h-8 text-indigo-400 mx-auto mb-3 opacity-50" />
                                                <p className="text-sm text-gray-400 font-medium">Messages are saved in the database.</p>
                                                <p className="text-xs text-gray-500 mt-1">Start the conversation!</p>
                                            </div>
                                        </div>
                                    ) : (
                                        messages.map((msg, i) => (
                                            <div key={msg.id || i} className={`flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'}`}>
                                                <div className="flex items-baseline gap-2 mb-1 px-1">
                                                    <span className="text-[13px] font-semibold text-gray-300">
                                                        {msg.isSelf ? 'You' : msg.sender}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 font-medium tracking-wide">
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-[14px] leading-relaxed shadow-md backdrop-blur-md ${
                                                    msg.isSelf 
                                                    ? 'bg-indigo-500/80 text-white rounded-tr-sm border border-indigo-400/50' 
                                                    : 'bg-white/10 text-gray-100 rounded-tl-sm border border-white/10'}`}>
                                                    {msg.message}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                <form onSubmit={handleSendMessage} className="p-3 bg-black/40 backdrop-blur-xl border-t border-white/10">
                                    {typingUsers.length > 0 && (
                                        <div className="text-[11px] text-indigo-300 font-medium mb-2 px-2 animate-pulse">
                                            {typingUsers.length === 1 
                                                ? `${typingUsers[0]} is typing...` 
                                                : `${typingUsers.join(', ')} are typing...`}
                                        </div>
                                    )}
                                    <div className="flex gap-2 w-full bg-white/5 p-1.5 rounded-2xl border border-white/10 focus-within:border-indigo-500/50 focus-within:bg-white/10 transition-all shadow-inner">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={handleTyping}
                                            placeholder="Type a message..."
                                            className="flex-1 px-3 py-2 bg-transparent text-[14px] text-white outline-none placeholder-gray-500 font-medium"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim()}
                                            className="p-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-indigo-500 transition-all"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-8 custom-scroll">
                                <div>
                                    <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-4">In call ({participants.length})</h4>
                                    <div className="space-y-4">
                                        {participants.map(p => (
                                            <div key={p.id} className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/5">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold shadow-lg">
                                                    {p.displayName.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-[15px] font-semibold text-gray-200">{p.displayName}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4">Activity Log</h4>
                                    <div className="space-y-3">
                                        {notifications.length === 0 ? (
                                            <p className="text-[13px] text-gray-500 font-medium italic">No recent activity</p>
                                        ) : (
                                            notifications.map((note, i) => (
                                                <div key={i} className="text-[13px] text-gray-400 flex items-center gap-3 bg-white/5 px-3 py-2 rounded-lg">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-500/50 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                                                    <span className="font-medium">{note}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Controls Bar */}
            <div className="h-20 sm:h-[88px] bg-black/40 backdrop-blur-2xl flex items-center justify-between px-4 sm:px-8 border-t border-white/10 z-20">
                <div className="flex flex-1 text-white text-sm">
                    <div className="flex items-center gap-4 bg-white/5 rounded-2xl px-4 py-2 hover:bg-white/10 transition-colors border border-white/5">
                        <span className="font-bold text-[16px] hidden sm:block tracking-wide">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className="w-[2px] h-4 bg-white/20 hidden sm:block rounded-full"></div>
                        <span className="font-mono text-indigo-300 break-words max-w-[100px] sm:max-w-none truncate">{roomCode}</span>
                        <button
                            onClick={handleCopyUrl}
                            className="p-1.5 ml-1 text-gray-400 hover:text-white bg-white/5 hover:bg-white/20 rounded-lg transition-all shrink-0"
                            title="Copy meeting info"
                        >
                            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
                    <div className="relative flex items-center group shadow-lg">
                        <button
                            onClick={toggleAudio}
                            className={`p-3 sm:p-4 rounded-l-2xl pr-3 flex items-center justify-center transition-all duration-300 ${
                                isAudioMuted 
                                ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                                : 'bg-white/10 hover:bg-white/20 text-white border border-white/5'
                            }`}
                            title={isAudioMuted ? "Turn on microphone" : "Turn off microphone"}
                        >
                            {isAudioMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </button>
                        <button
                            onClick={() => setShowSettings(true)}
                            className={`p-3 sm:p-4 rounded-r-2xl pl-2 flex items-center justify-center transition-all duration-300 border-l border-black/30 ${
                                isAudioMuted 
                                ? 'bg-red-500 hover:bg-red-600 text-white' 
                                : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                            title="Audio options"
                        >
                            <ChevronUp className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <div className="relative flex items-center group shadow-lg">
                        <button
                            onClick={toggleVideo}
                            className={`p-3 sm:p-4 rounded-l-2xl pr-3 flex items-center justify-center transition-all duration-300 ${
                                isVideoMuted 
                                ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                                : 'bg-white/10 hover:bg-white/20 text-white border border-white/5'
                            }`}
                            title={isVideoMuted ? "Turn on camera" : "Turn off camera"}
                        >
                            {isVideoMuted ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                        </button>
                        <button
                            onClick={() => setShowSettings(true)}
                            className={`p-3 sm:p-4 rounded-r-2xl pl-2 flex items-center justify-center transition-all duration-300 border-l border-black/30 ${
                                isVideoMuted 
                                ? 'bg-red-500 hover:bg-red-600 text-white' 
                                : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                            title="Camera options"
                        >
                            <ChevronUp className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-6 sm:px-8 py-3 sm:py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl transition-all duration-300 flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] hover:-translate-y-1"
                        title="Leave call"
                    >
                        <PhoneOff className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex flex-1 justify-end gap-2 sm:gap-4 text-white">
                    {roomInfo?.createdBy === user?.id && (
                        <button
                            onClick={() => setShowAnalytics(true)}
                            className="p-3 sm:p-4 rounded-2xl bg-white/5 hover:bg-white/20 transition-all duration-300 border border-transparent hover:border-white/10"
                            title="Analytics"
                        >
                            <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-300" />
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (sidebarTab !== 'people') setSidebarTab('people');
                            setIsSidebarOpen(!isSidebarOpen || sidebarTab !== 'people');
                        }}
                        className={`p-3 sm:p-4 rounded-2xl transition-all duration-300 border border-transparent ${isSidebarOpen && sidebarTab === 'people' ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-white/5 hover:bg-white/20 hover:border-white/10'}`}
                        title="Show everyone"
                    >
                        <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    <button
                        onClick={() => {
                            if (sidebarTab !== 'chat') setSidebarTab('chat');
                            setIsSidebarOpen(!isSidebarOpen || sidebarTab !== 'chat');
                        }}
                        className={`relative p-3 sm:p-4 rounded-2xl transition-all duration-300 border border-transparent ${isSidebarOpen && sidebarTab === 'chat' ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-white/5 hover:bg-white/20 hover:border-white/10'}`}
                        title="Chat with everyone"
                    >
                        <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                        {hasUnreadMessages && (
                            <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 border-2 border-[#1e293b] rounded-full animate-pulse"></span>
                        )}
                    </button>
                </div>
            </div>
            
            {showAnalytics && <AnalyticsModal roomCode={roomCode} onClose={() => setShowAnalytics(false)} />}
            
            {showSettings && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-4 transition-all">
                    <div className="bg-slate-900/80 backdrop-blur-3xl rounded-3xl w-full max-w-lg border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h2 className="text-xl font-bold text-white tracking-wide">Device Settings</h2>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-8">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Microphone (Input)</h3>
                                    <button 
                                        onClick={() => changeAudioInput('default')}
                                        className="text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-500/20 hover:bg-indigo-500/40 px-3 py-1.5 rounded-lg transition-all border border-indigo-500/30"
                                    >
                                        System Default
                                    </button>
                                </div>
                                {audioInputDevices.length > 0 ? (
                                    <select
                                        className="w-full bg-white/5 border border-white/10 text-white text-sm font-medium rounded-xl p-4 outline-none focus:border-indigo-500 focus:bg-white/10 transition-all cursor-pointer appearance-none shadow-inner"
                                        value={selectedAudioInputDevice || 'default'}
                                        onChange={(e) => changeAudioInput(e.target.value)}
                                    >
                                        <option value="default" className="bg-slate-900">Default</option>
                                        {audioInputDevices.map((device, index) => (
                                            <option key={device.deviceId} value={device.deviceId} className="bg-slate-900">
                                                {device.label || `Microphone ${index + 1}`}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-sm text-gray-400 p-4 bg-white/5 rounded-xl border border-white/5">No microphones found.</p>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Speaker (Output)</h3>
                                    <button 
                                        onClick={() => changeAudioOutput('default')}
                                        className="text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-500/20 hover:bg-indigo-500/40 px-3 py-1.5 rounded-lg transition-all border border-indigo-500/30"
                                    >
                                        System Default
                                    </button>
                                </div>
                                {audioOutputDevices.length > 0 ? (
                                    <select
                                        className="w-full bg-white/5 border border-white/10 text-white text-sm font-medium rounded-xl p-4 outline-none focus:border-indigo-500 focus:bg-white/10 transition-all cursor-pointer appearance-none shadow-inner"
                                        value={selectedAudioOutputDevice || 'default'}
                                        onChange={(e) => changeAudioOutput(e.target.value)}
                                    >
                                        <option value="default" className="bg-slate-900">Default</option>
                                        {audioOutputDevices.map((device, index) => (
                                            <option key={device.deviceId} value={device.deviceId} className="bg-slate-900">
                                                {device.label || `Speaker ${index + 1}`}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-sm text-gray-400 p-4 bg-white/5 rounded-xl border border-white/5">No speakers found. Ensure browser permissions allow it.</p>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Camera (Input)</h3>
                                    <button 
                                        onClick={() => changeCamera('')}
                                        className="text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-500/20 hover:bg-indigo-500/40 px-3 py-1.5 rounded-lg transition-all border border-indigo-500/30"
                                    >
                                        System Default
                                    </button>
                                </div>
                                {videoDevices.length > 0 ? (
                                    <select
                                        className="w-full bg-white/5 border border-white/10 text-white text-sm font-medium rounded-xl p-4 outline-none focus:border-indigo-500 focus:bg-white/10 transition-all cursor-pointer appearance-none shadow-inner"
                                        value={selectedVideoDevice || ''}
                                        onChange={(e) => changeCamera(e.target.value)}
                                    >
                                        <option value="" className="bg-slate-900">Default</option>
                                        {videoDevices.map((device, index) => (
                                            <option key={device.deviceId} value={device.deviceId} className="bg-slate-900">
                                                {device.label || `Camera ${index + 1}`}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-sm text-gray-400 p-4 bg-white/5 rounded-xl border border-white/5">No cameras found.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
