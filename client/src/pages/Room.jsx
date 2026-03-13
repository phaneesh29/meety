import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/react';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { useLogout } from '../hooks/useLogout';
import AnalyticsModal from '../components/AnalyticsModal';
import { BarChart2, Send, Mic, MicOff, Video, VideoOff, MessageSquare, Users, PhoneOff, Copy, Check, Settings, X, ChevronUp, ChevronDown, User, LogOut, LayoutDashboard } from 'lucide-react';
import { apiRequest } from '../lib/api';

const VideoPlayer = ({ stream, isLocal, displayName, muted, isVideoOff }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream && !isVideoOff) {
            videoRef.current.srcObject = stream;
        }
    }, [stream, isVideoOff]);

    return (
        <div className="relative bg-[#3c4043] rounded-xl overflow-hidden shadow-md flex items-center justify-center h-full w-full">
            {isVideoOff ? (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-semibold text-4xl sm:text-6xl shadow-lg">
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
            <div className={`absolute bottom-4 left-4 ${isVideoOff ? 'bg-transparent text-gray-300' : 'bg-black/60 text-white'} px-3 py-1.5 rounded-md text-sm font-medium backdrop-blur-sm transition-colors`}>
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
    const { localStream, streams, initializeMedia, cleanup, joinUsers, videoDevices, selectedVideoDevice, changeCamera } = useWebRTC(socket, roomCode);

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
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

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
            <div className="flex items-center justify-center min-h-screen bg-[#202124] text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    <p className="text-sm text-gray-400">Joining room...</p>
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
        <div className="flex flex-col h-screen bg-[#202124] font-sans overflow-hidden">
            <div className="flex flex-1 overflow-hidden p-4 gap-4 relative">
                {/* Floating Top Info Overlay */}
                <div className="absolute top-8 left-8 z-20 flex items-center gap-3 bg-black/30 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-2xl transition-all">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-sm font-medium text-gray-200 hover:text-white transition-colors flex items-center gap-2"
                        title="Back to Dashboard"
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        <span className="hidden sm:inline">Dashboard</span>
                    </button>
                    
                    <div className="h-5 w-px bg-white/20 mx-1"></div>
                    
                    <div className="relative" ref={profileDropdownRef}>
                        <button
                            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                            className="flex items-center gap-2 hover:bg-white/10 p-1 pr-2 rounded-full transition-colors focus:outline-none"
                        >
                            <img 
                                src={user?.imageUrl} 
                                alt="Profile" 
                                className="w-7 h-7 rounded-full border border-white/20 object-cover bg-indigo-500/20"
                            />
                            <ChevronDown className={`w-3.5 h-3.5 text-gray-300 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isProfileDropdownOpen && (
                            <div className="absolute left-0 mt-3 w-60 bg-[#27292d] border border-[#3c4043] rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                                <div className="px-4 py-3 border-b border-[#3c4043] mb-2 flex items-center gap-3">
                                    <img 
                                        src={user?.imageUrl} 
                                        alt="Profile" 
                                        className="w-10 h-10 rounded-full border border-[#3c4043]"
                                    />
                                    <div className="flex flex-col truncate">
                                        <span className="text-sm font-medium text-white truncate">{user?.fullName || user?.firstName || 'User'}</span>
                                        <span className="text-xs text-gray-400 truncate">{user?.primaryEmailAddress?.emailAddress}</span>
                                    </div>
                                </div>
                                
                                <button
                                    onClick={() => navigate('/profile')}
                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#3c4043] hover:text-white transition-colors flex items-center gap-3"
                                >
                                    <User className="w-4 h-4" />
                                    Manage Profile
                                </button>
                                
                                <button
                                    onClick={() => {
                                        setIsProfileDropdownOpen(false);
                                        logout();
                                    }}
                                    disabled={isLoggingOut}
                                    className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-[#3c4043] hover:text-red-300 transition-colors flex items-center gap-3 disabled:opacity-50"
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
                            />
                        </div>
                    ))}
                </div>

                {/* Right Sidebar: Chat & People */}
                {isSidebarOpen && (
                    <div className="w-80 flex flex-col bg-[#27292d] rounded-xl overflow-hidden shadow-lg transition-all duration-300 border border-[#3c4043]">
                        <div className="p-2 border-b border-[#3c4043] flex gap-2">
                            <button 
                                onClick={() => setSidebarTab('chat')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${sidebarTab === 'chat' ? 'bg-[#3c4043] text-indigo-400' : 'text-gray-400 hover:bg-[#323639]'}`}
                            >
                                Chat
                            </button>
                            <button 
                                onClick={() => setSidebarTab('people')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${sidebarTab === 'people' ? 'bg-[#3c4043] text-indigo-400' : 'text-gray-400 hover:bg-[#323639]'}`}
                            >
                                People
                            </button>
                        </div>
                        
                        {sidebarTab === 'chat' ? (
                            <>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {messages.length === 0 ? (
                                        <div className="h-full flex items-center justify-center">
                                            <p className="text-center text-sm text-gray-500">Messages can be seen by people in the call.</p>
                                        </div>
                                    ) : (
                                        messages.map((msg, i) => (
                                            <div key={msg.id || i} className={`flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'}`}>
                                                <div className="flex items-baseline gap-2 mb-1 px-1">
                                                    <span className="text-[13px] font-semibold text-gray-300">
                                                        {msg.isSelf ? 'You' : msg.sender}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500">
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className={`px-3 py-2 rounded-xl max-w-[85%] text-[13px] leading-relaxed ${msg.isSelf ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-[#3c4043] text-gray-200 rounded-tl-sm'}`}>
                                                    {msg.message}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                <form onSubmit={handleSendMessage} className="p-3 bg-[#27292d] border-t border-[#3c4043]">
                                    {typingUsers.length > 0 && (
                                        <div className="text-[11px] text-gray-500 italic mb-1 px-1">
                                            {typingUsers.length === 1 
                                                ? `${typingUsers[0]} is typing...` 
                                                : `${typingUsers.join(', ')} are typing...`}
                                        </div>
                                    )}
                                    <div className="flex gap-2 w-full bg-[#3c4043] p-1 rounded-full border border-transparent focus-within:border-indigo-500 transition-all">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={handleTyping}
                                            placeholder="Send a message..."
                                            className="flex-1 px-3 py-1.5 bg-transparent text-[13px] text-white outline-none placeholder-gray-400"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim()}
                                            className="p-1.5 rounded-full text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">In call ({participants.length})</h4>
                                    <div className="space-y-3">
                                        {participants.map(p => (
                                            <div key={p.id} className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-semibold text-sm">
                                                    {p.displayName.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium text-gray-300">{p.displayName}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Activity</h4>
                                    <div className="space-y-2">
                                        {notifications.length === 0 ? (
                                            <p className="text-[13px] text-gray-500">No recent activity</p>
                                        ) : (
                                            notifications.map((note, i) => (
                                                <div key={i} className="text-[13px] text-gray-400 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div>
                                                    {note}
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
            <div className="h-16 sm:h-[72px] bg-[#202124] flex items-center justify-between px-4 sm:px-6 border-t border-[#3c4043] md:border-none">
                <div className="flex flex-1 text-white text-sm">
                    <div className="flex items-center gap-3">
                        <span className="font-semibold text-[15px] hidden sm:block">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-gray-500 hidden sm:block">|</span>
                        <span className="font-medium text-gray-300 break-words max-w-[100px] sm:max-w-none truncate">{roomCode}</span>
                        <button
                            onClick={handleCopyUrl}
                            className="p-1.5 ml-1 text-gray-400 hover:text-white hover:bg-[#3c4043] rounded-md transition-colors shrink-0"
                            title="Copy meeting info"
                        >
                            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4">
                    <button
                        onClick={toggleAudio}
                        className={`p-2.5 sm:p-3 rounded-full flex items-center justify-center transition-all ${
                            isAudioMuted ? 'bg-[#ea4335] hover:bg-red-600 text-white' : 'bg-[#3c4043] hover:bg-[#4a4d51] text-white'
                        }`}
                        title={isAudioMuted ? "Turn on microphone" : "Turn off microphone"}
                    >
                        {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    
                    <div className="relative flex items-center group">
                        <button
                            onClick={toggleVideo}
                            className={`p-2.5 sm:p-3 rounded-l-full pr-2 flex items-center justify-center transition-all ${
                                isVideoMuted ? 'bg-[#ea4335] hover:bg-[#d93025] text-white' : 'bg-[#3c4043] hover:bg-[#4a4d51] text-white'
                            }`}
                            title={isVideoMuted ? "Turn on camera" : "Turn off camera"}
                        >
                            {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={() => setShowSettings(true)}
                            className={`p-2.5 sm:p-3 rounded-r-full pl-1.5 flex items-center justify-center transition-all border-l border-black/20 ${
                                isVideoMuted ? 'bg-[#ea4335] hover:bg-[#d93025] text-white' : 'bg-[#3c4043] hover:bg-[#4a4d51] text-white'
                            }`}
                            title="Camera options"
                        >
                            <ChevronUp className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 sm:px-6 py-2 sm:py-2.5 bg-[#ea4335] hover:bg-red-600 text-white rounded-full transition-all flex items-center gap-2"
                        title="Leave call"
                    >
                        <PhoneOff className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-1 justify-end gap-2 sm:gap-3 text-white">
                    {roomInfo?.createdBy === user?.id && (
                        <button
                            onClick={() => setShowAnalytics(true)}
                            className="p-2 sm:p-2.5 rounded-full hover:bg-[#3c4043] transition-colors"
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
                        className={`p-2.5 rounded-full transition-colors ${isSidebarOpen && sidebarTab === 'people' ? 'bg-[#8ab4f8] text-[#202124]' : 'hover:bg-[#3c4043]'}`}
                        title="Show everyone"
                    >
                        <Users className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => {
                            if (sidebarTab !== 'chat') setSidebarTab('chat');
                            setIsSidebarOpen(!isSidebarOpen || sidebarTab !== 'chat');
                        }}
                        className={`p-2.5 rounded-full transition-colors ${isSidebarOpen && sidebarTab === 'chat' ? 'bg-[#8ab4f8] text-[#202124]' : 'hover:bg-[#3c4043]'}`}
                        title="Chat with everyone"
                    >
                        <MessageSquare className="w-5 h-5" />
                    </button>
                </div>
            </div>
            
            {showAnalytics && <AnalyticsModal roomCode={roomCode} onClose={() => setShowAnalytics(false)} />}
            
            {showSettings && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#202124] rounded-2xl w-full max-w-md border border-[#3c4043] shadow-2xl flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-[#3c4043]">
                            <h2 className="text-xl font-semibold text-white">Settings</h2>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="p-2 text-gray-400 hover:text-white hover:bg-[#3c4043] rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <h3 className="text-sm font-medium text-gray-300 mb-3">Camera</h3>
                            {videoDevices.length > 0 ? (
                                <select
                                    className="w-full bg-[#3c4043] border border-transparent text-white text-sm rounded-lg p-3 outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none"
                                    value={selectedVideoDevice || ''}
                                    onChange={(e) => changeCamera(e.target.value)}
                                >
                                    {videoDevices.map((device, index) => (
                                        <option key={device.deviceId} value={device.deviceId}>
                                            {device.label || `Camera ${index + 1}`}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-sm text-gray-400 p-3 bg-[#3c4043]/50 rounded-lg">No cameras found.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
