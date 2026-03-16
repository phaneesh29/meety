import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/react'
import { useRooms } from '../hooks/useRooms'
import { useSocket } from '../hooks/useSocket'
import { apiRequest } from '../lib/api'
import { Video, Keyboard, Copy, Trash2, LogIn, ChevronRight, Users } from 'lucide-react'

export default function Home() {
  const { user } = useUser()
  const navigate = useNavigate()
  const { rooms, loading, createRoom, deleteRoom } = useRooms()
  const [creating, setCreating] = useState(false)
  const [joinCode, setJoinCode] = useState("")
  const [isBackendHealthy, setIsBackendHealthy] = useState(true)
  useSocket()

  useEffect(() => {
    apiRequest('GET', '/api/health')
      .then(() => setIsBackendHealthy(true))
      .catch(() => setIsBackendHealthy(false))
  }, [])

  async function handleCreateRoom() {
    setCreating(true)
    try {
      const room = await createRoom()
      navigate(/room/)
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = (e) => {
    e.preventDefault()
    if (joinCode.trim()) {
      navigate(`/room/${joinCode.trim()}`)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-16 py-10 max-w-6xl mx-auto px-4 sm:px-6">
      <header className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20">
        <div className="w-full lg:w-1/2 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-indigo-300 text-sm font-medium">
            <div className="relative group flex items-center justify-center">
              <span className="relative flex h-2 w-2">
                {isBackendHealthy ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                )}
              </span>
            </div>
            {isBackendHealthy ? "Meety 2.0 is live" : "Meety 2.0 is offline"}
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
            Connect deeply.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Anywhere.
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 font-light leading-relaxed max-w-xl">
            Premium video meetings re-engineered for the modern web. Completely free, secure, and available for everyone.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
            <button
              onClick={handleCreateRoom}
              disabled={creating}
              className="group relative px-6 py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl disabled:opacity-50 transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden shadow-lg shadow-indigo-500/25 cursor-pointer hover:-translate-y-0.5"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              <Video className="w-5 h-5 relative z-10" />
              <span className="relative z-10">{creating ? 'Creating...' : 'New meeting'}</span>
            </button>

            <form onSubmit={handleJoin} className="flex-1 flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl px-5 py-3.5 focus-within:border-indigo-500 focus-within:bg-white/10 transition-all duration-300 shadow-xl">
              <Keyboard className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Enter a code or link"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="bg-transparent text-white border-none outline-none w-full placeholder-gray-500 text-lg"
              />
              <button
                type="submit"
                disabled={!joinCode.trim()}
                className={`font-semibold flex items-center transition-colors ${joinCode.trim() ? "text-indigo-400 hover:text-indigo-300" : "text-gray-500 cursor-not-allowed"}`}
              >
                Join
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </form>
          </div>
        </div>

        <div className="w-full lg:w-1/2 relative lg:block">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-3xl blur-3xl opacity-50"></div>
          <div className="relative w-full rounded-[2rem] bg-slate-900/60 backdrop-blur-3xl shadow-2xl border border-white/10 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            
            {/* Feature Showcase Grid */}
            <div className="grid grid-cols-2 gap-4 p-6 sm:p-8">
              
              <div className="col-span-2 sm:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-start gap-4 hover:bg-white/10 transition-colors shadow-inner">
                <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">HD Video</h4>
                  <p className="text-sm text-gray-400">Crystal clear meetings with noise suppression.</p>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-start gap-4 hover:bg-white/10 transition-colors shadow-inner">
                <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">P2P Secure</h4>
                  <p className="text-sm text-gray-400">Direct WebRTC connection for maximum privacy.</p>
                </div>
              </div>

              <div className="col-span-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-white/10 rounded-2xl p-6 flex items-center justify-between hover:from-indigo-500/20 hover:to-purple-500/20 transition-all shadow-inner relative overflow-hidden">
                <div className="relative z-10">
                  <h4 className="text-white font-semibold mb-1">Lightning Fast</h4>
                  <p className="text-sm text-gray-300">No downloads required. Just share the link.</p>
                </div>
                <div className="relative z-10 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20 group">
                  {isBackendHealthy ? (
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-[0_0_15px_#4ade80]"></div>
                  ) : (
                    <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_15px_#ef4444]"></div>
                  )}
                </div>
                {/* Decorative background element */}
                <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
              </div>

            </div>
          </div>
        </div>
      </header>

      <div className="pt-16 max-w-6xl mx-auto">
        <h3 className="text-2xl font-semibold text-white mb-8 flex items-center gap-3">
          Your Recent Meetings
        </h3>
        {loading ? (
          <div className="p-16 text-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-gray-400">Loading your meetings...</div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="p-16 text-center border border-white/5 rounded-3xl text-gray-400 bg-white/5 backdrop-blur-sm shadow-xl">
            <p className="text-lg">No recent meetings found.</p>
            <p className="text-sm mt-2 opacity-70">Create a new meeting to kick things off!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white/5 backdrop-blur-xl border border-white/10 hover:border-indigo-500/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 group flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-lg font-mono font-bold text-indigo-300 tracking-wide">{room.roomCode}</p>
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/room/${room.roomCode}`)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100"
                      title="Copy invite link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></span>
                    {new Date(room.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-8 pt-4 border-t border-white/10">
                  <button
                    onClick={() => navigate(`/room/${room.roomCode}`)}
                    className="text-sm text-white font-semibold flex items-center gap-2 hover:text-indigo-400 transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg"
                  >
                    <LogIn className="w-4 h-4" />
                    Enter Room
                  </button>
                  <button
                    onClick={() => deleteRoom(room.roomCode)}
                    className="p-2 text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Delete meeting"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
