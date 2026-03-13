import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/react'
import { useRooms } from '../hooks/useRooms'
import { useSocket } from '../hooks/useSocket'
import { Video, Keyboard, Copy, Trash2, LogIn } from 'lucide-react'

export default function Home() {
  const { user } = useUser()
  const navigate = useNavigate()
  const { rooms, loading, createRoom, deleteRoom } = useRooms()
  const [creating, setCreating] = useState(false)
  const [joinCode, setJoinCode] = useState("")
  useSocket()

  async function handleCreateRoom() {
    setCreating(true)
    try {
      const room = await createRoom()
      navigate(`/room/${room.roomCode}`)
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
    <div className="space-y-12 py-10 max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="w-full md:w-1/2 space-y-6">
          <h1 className="text-4xl sm:text-5xl font-normal tracking-tight text-white leading-tight">
            Premium video meetings.<br/>Now free for everyone.
          </h1>
          <p className="text-lg text-gray-400 font-light">
            We re-engineered the service that we built for secure business meetings, Meety, to make it free and available for all.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <button
              onClick={handleCreateRoom}
              disabled={creating}
              className="w-full sm:w-auto px-6 py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-md disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Video className="w-5 h-5" />
              {creating ? 'Creating...' : 'New meeting'}
            </button>
            
            <form onSubmit={handleJoin} className="w-full sm:w-auto flex flex-1 items-center gap-2 bg-[#3c4043] rounded-md px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow">
              <Keyboard className="w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Enter a code or link" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="bg-transparent text-white border-none outline-none w-full placeholder-gray-400"
              />
              <button 
                type="submit"
                disabled={!joinCode.trim()}
                className={`font-medium transition-colors ${joinCode.trim() ? 'text-indigo-400 hover:text-indigo-300' : 'text-gray-500'}`}
              >
                Join
              </button>
            </form>
          </div>
        </div>
        
        <div className="hidden md:block w-full md:w-1/2 p-8">
          <div className="aspect-video w-full rounded-2xl bg-[#3c4043] shadow-2xl overflow-hidden flex items-center justify-center border border-[#5f6368]">
            {/* Flaticon/Illustration placeholder */}
            <div className="flex flex-col items-center gap-4 opacity-50">
              <Video className="w-20 h-20 text-gray-400" />
              <p className="text-gray-400 font-medium">Your meetings appear here</p>
            </div>
          </div>
        </div>
      </header>

      <div className="pt-8">
        <h3 className="text-xl font-medium text-white mb-6">Your Recent Meetings</h3>

        {loading ? (
          <div className="p-12 text-center text-gray-500 text-lg">Loading your meetings...</div>
        ) : rooms.length === 0 ? (
          <div className="p-12 text-center border border-[#3c4043] rounded-xl text-gray-400 bg-[#27292d]">
            No recent meetings. Create one to get started!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <div key={room.id} className="bg-[#27292d] hover:bg-[#3c4043] border border-[#3c4043] rounded-xl p-5 transition-colors group flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-base font-mono font-medium text-indigo-400">{room.roomCode}</p>
                    <button 
                      onClick={() => copyToClipboard(`${window.location.origin}/room/${room.roomCode}`)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      title="Copy invite link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Created {new Date(room.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#3c4043]">
                  <button
                    onClick={() => navigate(`/room/${room.roomCode}`)}
                    className="text-sm text-white font-medium flex items-center gap-2 hover:text-indigo-400 transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Join room
                  </button>
                  <button
                    onClick={() => deleteRoom(room.roomCode)}
                    className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                    title="Delete meeting"
                  >
                    <Trash2 className="w-4 h-4" />
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
