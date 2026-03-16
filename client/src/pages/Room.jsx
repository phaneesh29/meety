import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/react';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { useLogout } from '../hooks/useLogout';
import AnalyticsModal from '../components/AnalyticsModal';
import { BarChart2, Send, Mic, MicOff, Video, VideoOff, MessageSquare, Users, PhoneOff, Copy, Check, Settings, X, ChevronUp, ChevronDown, User, LogOut, LayoutDashboard, MonitorUp, MonitorOff } from 'lucide-react';
import { apiRequest } from '../lib/api';

const VideoPlayer = ({ stream, isLocal, displayName, muted, isVideoOff, audioOutputDevice, isScreen }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream && !isVideoOff) {
            // Re-assigning srcObject forces the media element to pick up underlying track replacements (e.g. screen sharing resolution changes)
            videoRef.current.srcObject = null;
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(err => console.error("Error playing video:", err));
        }
    }, [stream, isVideoOff, isScreen]);

    useEffect(() => {
        if (videoRef.current && typeof videoRef.current.setSinkId === 'function' && audioOutputDevice) {
            videoRef.current.setSinkId(audioOutputDevice === 'default' ? '' : audioOutputDevice)
                .catch(err => console.error("Error setting audio output device:", err));
        }
    }, [audioOutputDevice]);

    return (
        <div className="relative bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden flex items-center justify-center h-full w-full border border-white/10 shadow-2xl transition-all duration-300 hover:border-white/20 group">
            {isVideoOff && !isScreen ? (
                <div className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-white/10 text-indigo-300 flex items-center justify-center font-bold text-3xl sm:text-5xl shadow-2xl backdrop-blur-xl">
                    {displayName.charAt(0).toUpperCase()}
                </div>
            ) : (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal || muted}
                    className={`w-full h-full ${isScreen ? 'object-contain' : 'object-cover'} ${isLocal && !isScreen ? 'scale-x-[-1]' : ''}`}
                />
            )}
            <div className={`absolute bottom-2 left-2 sm:bottom-4 sm:left-4 ${isVideoOff && !isScreen ? 'bg-black/40 text-gray-300' : 'bg-black/60 text-white'} backdrop-blur-md border border-white/10 px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all group-hover:scale-105 flex items-center gap-1.5 sm:gap-2 max-w-[calc(100%-1rem)] sm:max-w-[calc(100%-2rem)] z-10`}>
                {isScreen && <MonitorUp className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-400 shrink-0" />}
                <span className="truncate">{displayName}</span>
                {isLocal && <span className="shrink-0 text-white/70"> (You)</span>}
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
        audioOutputDevices, selectedAudioOutputDevice, changeAudioOutput,
        isScreenSharing, toggleScreenShare
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
    const [remoteVideoStates, setRemoteVideoStates] = useState({});
    const isVideoMutedRef = useRef(false);
    const [screenSharers, setScreenSharers] = useState(new Set());
    const isScreenSharingRef = useRef(false);

    useEffect(() => {
        isScreenSharingRef.current = isScreenSharing;
    }, [isScreenSharing]);

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
        const onUserJoined = ({ displayName }) => {
            setNotifications(prev => [...prev, `${displayName} joined`]);
            if (isVideoMutedRef.current) {
                socket.emit('video-toggle', roomCode, isVideoMutedRef.current);
            }
            if (isScreenSharingRef.current) {
                socket.emit('screen-share-start', roomCode);
            }
        };

        const onUserLeft = ({ displayName, id }) => {
            setNotifications(prev => [...prev, `${displayName} left`]);
            setRemoteVideoStates(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
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

        const onScreenShareStarted = ({ id }) => {
            setScreenSharers(prev => new Set([...prev, id]));
        };

        const onScreenShareStopped = ({ id }) => {
            setScreenSharers(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        };

        const onUserVideoToggled = ({ id, isVideoMuted }) => {
            setRemoteVideoStates(prev => ({ ...prev, [id]: isVideoMuted }));
        };

        socket.on('user-joined', onUserJoined);
        socket.on('user-left', onUserLeft);
        socket.on('chat-received', onChatReceived);
        socket.on('user-typing', onUserTyping);
        socket.on('screen-share-started', onScreenShareStarted);
        socket.on('screen-share-stopped', onScreenShareStopped);
        socket.on('user-video-toggled', onUserVideoToggled);

        return () => {
            mounted = false;
            socket.off('user-joined', onUserJoined);
            socket.off('user-left', onUserLeft);
            socket.off('chat-received', onChatReceived);
            socket.off('user-typing', onUserTyping);
            socket.off('screen-share-started', onScreenShareStarted);
            socket.off('screen-share-stopped', onScreenShareStopped);
            socket.off('user-video-toggled', onUserVideoToggled);
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
            const newMuted = !localStream.getVideoTracks()[0]?.enabled;
            setIsVideoMuted(newMuted);
            isVideoMutedRef.current = newMuted;
            if (socket) {
                socket.emit('video-toggle', roomCode, newMuted);
            }
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
        { id: 'local', displayName: user?.username || 'You', stream: localStream, isLocal: true },
        ...streams.map(s => ({ id: s.id, displayName: s.displayName, stream: s.stream, isLocal: false }))
    ];

    const screenSharingParticipant = participants.find(p => p.id === 'local' ? isScreenSharing : screenSharers.has(p.id));

    // Calculate grid classes based on number of participants
    const getGridClass = (count) => {
        if (screenSharingParticipant) return 'grid-cols-1 grid-rows-1'; // the big one
        if (count === 1) return 'grid-cols-1 grid-rows-1';
        if (count === 2) return 'grid-cols-1 md:grid-cols-2 grid-rows-2 md:grid-rows-1';
        if (count === 3 || count === 4) return 'grid-cols-2 grid-rows-2';
        return 'grid-cols-2 grid-rows-2';
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black font-sans overflow-hidden relative">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            
            <div className="flex flex-1 overflow-hidden p-2 sm:p-4 gap-4 relative z-10">
                {/* Floating Top Info Overlay */}
                <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-20 flex items-center gap-2 sm:gap-3 bg-slate-900/60 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/10 shadow-sm transition-all text-white">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-xs sm:text-sm font-medium text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                        title="Back to Dashboard"
                    >
                        <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                        <span className="hidden sm:inline tracking-wide">Dashboard</span>
                    </button>
                    
                    <div className="h-4 w-[1px] bg-white/20 mx-1 sm:mx-2"></div>
                    
                    <div className="relative" ref={profileDropdownRef}>
                        <button
                            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                            className="flex items-center gap-2 hover:bg-white/10 p-0.5 pr-2 rounded-full transition-colors focus:outline-none"
                        >
                            <img 
                                src={user?.imageUrl} 
                                alt="Profile" 
                                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-white/20 object-cover bg-indigo-500/20"
                            />
                            <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-300 transition-transform duration-300 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
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
                                        <span className="text-[15px] font-semibold text-white truncate">{user?.username || 'User'}</span>
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
                <div className={`flex-1 flex gap-4 transition-all duration-300 relative ${screenSharingParticipant ? 'flex-col md:flex-row' : ''}`}>
                    {screenSharingParticipant ? (
                        <>
                            {/* Main Screen Share Area */}
                            <div className="flex-1 w-full h-full min-h-0 bg-black/40 rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
                                <VideoPlayer 
                                    key={`screen-${screenSharingParticipant.id}-${screenSharers.has(screenSharingParticipant.id)}`}
                                    stream={screenSharingParticipant.stream} 
                                    isLocal={screenSharingParticipant.isLocal} 
                                    displayName={`${screenSharingParticipant.displayName}'s screen`}
                                    muted={screenSharingParticipant.isLocal ? isAudioMuted : false}
                                    isVideoOff={false}
                                    isScreen={true}
                                />
                            </div>

                            {/* Sidebar for other participants */}
                            <div className={`w-full md:w-64 flex-shrink-0 flex gap-2 md:flex-col overflow-x-auto md:overflow-y-auto hidden sm:flex [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']`}>
                                {participants.filter(p => p.id !== screenSharingParticipant.id).map(p => (
                                    <div key={p.id} className="w-32 md:w-full h-24 md:h-36 min-h-0 flex-shrink-0">
                                        <VideoPlayer
                                            stream={p.stream}
                                            isLocal={p.isLocal}
                                            displayName={p.displayName}
                                            muted={p.isLocal ? isAudioMuted : false}
                                            isVideoOff={p.isLocal ? isVideoMuted : remoteVideoStates[p.id] || false}
                                            audioOutputDevice={selectedAudioOutputDevice}
                                        />
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className={`w-full h-full grid gap-4 transition-all duration-300 ${getGridClass(participants.length)}`}>
                            {participants.map(p => (
                                <div key={p.id} className={`w-full h-full min-h-0 ${participants.length > 2 ? 'aspect-video object-cover' : 'aspect-video sm:aspect-auto'}`}>
                                    <VideoPlayer
                                        stream={p.stream}
                                        isLocal={p.isLocal}
                                        displayName={p.displayName}
                                        muted={p.isLocal ? isAudioMuted : false}
                                        isVideoOff={p.isLocal ? isVideoMuted : remoteVideoStates[p.id] || false}
                                        audioOutputDevice={selectedAudioOutputDevice}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
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
            <div className="h-auto min-h-[80px] sm:min-h-[88px] w-full flex flex-wrap items-center justify-between px-2 sm:px-4 md:px-8 py-3 sm:py-0 z-20 gap-y-3 sm:gap-y-0 relative bg-slate-900 border-t border-white/5">
                <div className="hidden md:flex flex-1 text-white text-sm order-1">
                    <div className="flex items-center gap-4 px-2 py-1">
                        <span className="font-medium text-[15px] hidden xl:block tracking-wide text-gray-200">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className="w-[1px] h-4 bg-white/20 hidden xl:block"></div>
                        <span className="font-mono font-medium text-gray-300 break-words max-w-[100px] lg:max-w-none truncate">{roomCode}</span>
                        <button
                            onClick={handleCopyUrl}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-all shrink-0"
                            title="Copy meeting info"
                        >
                            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-2 sm:gap-3 lg:gap-4 w-full md:w-auto flex-1 md:flex-none order-last md:order-2">
                    <div className="relative flex items-center">
                        <div className="flex items-center bg-[#3c4043] rounded-full hover:bg-[#434649] transition-all overflow-hidden border border-transparent shadow-sm hover:shadow-md">
                            <button
                                onClick={toggleAudio}
                                className={`p-3 sm:p-4 flex items-center justify-center transition-colors ${
                                    isAudioMuted 
                                    ? 'bg-[#ea4335] hover:bg-[#d93025] text-white' 
                                    : 'text-white'
                                }`}
                                title={isAudioMuted ? "Turn on microphone" : "Turn off microphone"}
                            >
                                {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            </button>
                            <div className={`w-[1px] h-6 ${isAudioMuted ? 'bg-white/30' : 'bg-white/20'} mx-0.5`}></div>
                            <button
                                onClick={() => setShowSettings(true)}
                                className={`p-3 sm:p-4 pr-3 sm:pr-4 pl-2 sm:pl-2 flex items-center justify-center transition-colors ${
                                    isAudioMuted 
                                    ? 'bg-[#ea4335] hover:bg-[#d93025] text-white' 
                                    : 'text-gray-300 hover:text-white'
                                }`}
                                title="Audio options"
                            >
                                <ChevronUp className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="relative flex items-center">
                        <div className="flex items-center bg-[#3c4043] rounded-full hover:bg-[#434649] transition-all overflow-hidden border border-transparent shadow-sm hover:shadow-md">
                            <button
                                onClick={toggleVideo}
                                className={`p-3 sm:p-4 flex items-center justify-center transition-colors ${
                                    isVideoMuted 
                                    ? 'bg-[#ea4335] hover:bg-[#d93025] text-white' 
                                    : 'text-white'
                                }`}
                                title={isVideoMuted ? "Turn on camera" : "Turn off camera"}
                            >
                                {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                            </button>
                            <div className={`w-[1px] h-6 ${isVideoMuted ? 'bg-white/30' : 'bg-white/20'} mx-0.5`}></div>
                            <button
                                onClick={() => setShowSettings(true)}
                                className={`p-3 sm:p-4 pr-3 sm:pr-4 pl-2 sm:pl-2 flex items-center justify-center transition-colors ${
                                    isVideoMuted 
                                    ? 'bg-[#ea4335] hover:bg-[#d93025] text-white' 
                                    : 'text-gray-300 hover:text-white'
                                }`}
                                title="Camera options"
                            >
                                <ChevronUp className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={toggleScreenShare}
                        className={`p-3 sm:p-4 rounded-full flex items-center justify-center transition-all shadow-sm hover:shadow-md ${
                            isScreenSharing 
                            ? 'bg-indigo-500 hover:bg-indigo-600 text-white' 
                            : 'bg-[#3c4043] hover:bg-[#434649] text-white'
                        }`}
                        title={isScreenSharing ? "Stop sharing screen" : "Share screen"}
                    >
                        {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
                    </button>

                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-6 sm:px-8 py-3 sm:py-4 bg-[#ea4335] hover:bg-[#d93025] text-white rounded-full transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md ml-2"
                        title="Leave call"
                    >
                        <PhoneOff className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-1 justify-between md:justify-end items-center gap-2 sm:gap-3 text-white w-full md:w-auto order-1 md:order-3">
                    <div className="md:hidden flex items-center gap-2 px-2">
                        <span className="font-mono font-medium text-[12px] sm:text-sm text-gray-300 truncate max-w-[90px] sm:max-w-[120px]">{roomCode}</span>
                        <button onClick={handleCopyUrl} className="p-1.5 text-gray-400 hover:text-white" title="Copy room code">
                            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {roomInfo?.createdBy === user?.id && (
                            <button
                                onClick={() => setShowAnalytics(true)}
                                className="p-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                title="Analytics"
                            >
                                <BarChart2 className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (sidebarTab !== 'people') setSidebarTab('people');
                                setIsSidebarOpen(!isSidebarOpen || sidebarTab !== 'people');
                            }}
                            className={`p-3 rounded-full transition-all ${isSidebarOpen && sidebarTab === 'people' ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                            title="Show everyone"
                        >
                            <Users className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => {
                                if (sidebarTab !== 'chat') setSidebarTab('chat');
                                setIsSidebarOpen(!isSidebarOpen || sidebarTab !== 'chat');
                            }}
                            className={`relative p-3 rounded-full transition-all ${isSidebarOpen && sidebarTab === 'chat' ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                            title="Chat with everyone"
                        >
                            <MessageSquare className="w-5 h-5" />
                            {hasUnreadMessages && (
                                <span className="absolute top-[8px] right-[8px] w-2.5 h-2.5 bg-[#ea4335] border-2 border-slate-900 rounded-full"></span>
                            )}
                        </button>
                    </div>
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
