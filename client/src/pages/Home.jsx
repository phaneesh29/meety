import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/react'
import { useRooms } from '../hooks/useRooms'
import { useSocket } from '../hooks/useSocket'

export default function Home() {
  const { user } = useUser()
  const navigate = useNavigate()
  const { rooms, loading, createRoom, deleteRoom } = useRooms()
  const [creating, setCreating] = useState(false)
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

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Good morning{user?.firstName ? `, ${user.firstName}` : ''}!
          </h1>
          <p className="mt-2 text-slate-500">
            Here is an overview of your account and recent activity.
          </p>
        </div>
        <button
          onClick={handleCreateRoom}
          disabled={creating}
          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {creating ? 'Creating...' : '+ New Room'}
        </button>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200">
          <h3 className="text-lg font-medium text-slate-900">My Rooms</h3>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-400 text-sm">Loading...</div>
        ) : rooms.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">
            No rooms yet. Create one to get started.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rooms.map((room) => (
              <li key={room.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50">
                <div>
                  <p className="text-sm font-mono text-slate-700">{room.roomCode}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(room.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate(`/room/${room.roomCode}`)}
                    className="text-sm text-slate-600 hover:text-slate-900 font-medium"
                  >
                    Enter
                  </button>
                  <button
                    onClick={() => deleteRoom(room.roomCode)}
                    className="text-sm text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
