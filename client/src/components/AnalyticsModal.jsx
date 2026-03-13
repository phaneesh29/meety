import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { apiRequest } from '../lib/api';
import { useAuth } from '@clerk/react';
import { X, BarChart2 } from 'lucide-react';

export default function AnalyticsModal({ roomCode, onClose }) {
    const { getToken } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAnalytics() {
            try {
                const token = await getToken();
                const res = await apiRequest('GET', `/api/rooms/${roomCode}/analytics`, token);
                
                // Group sessions and sum duration in minutes
                const times = {};
                res.sessions.forEach((s) => {
                    const start = new Date(s.joinedAt);
                    const end = s.leftAt ? new Date(s.leftAt) : new Date(); // assume current time if still connected
                    const diffMins = (end - start) / 1000 / 60;
                    
                    const name = s.email?.split('@')[0] || "Unknown User";
                    if (!times[name]) times[name] = { total: 0, sessions: 0 };
                    times[name].total += diffMins;
                    times[name].sessions += 1;
                });

                const chartData = Object.keys(times).map(name => ({
                    name,
                    minutes: Math.round(times[name].total * 10) / 10,
                    sessions: times[name].sessions
                })).sort((a, b) => b.minutes - a.minutes); // Most active users first

                setData(chartData);
            } catch (err) {
                console.error("Error fetching analytics", err);
            } finally {
                setLoading(false);
            }
        }
        
        fetchAnalytics();
    }, [roomCode, getToken]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-800">
                        <BarChart2 className="w-5 h-5 text-indigo-500" />
                        <h2 className="text-xl font-semibold">Room Analytics</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center items-center py-20 text-slate-400">Loading metrics...</div>
                    ) : data.length === 0 ? (
                        <div className="flex justify-center items-center py-20 text-slate-400">No session data available yet.</div>
                    ) : (
                        <div className="space-y-8">
                            <div className="h-[300px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#64748B', fontSize: 12 }} 
                                            dy={10} 
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#64748B', fontSize: 12 }} 
                                        />
                                        <Tooltip 
                                            cursor={{ fill: '#F1F5F9' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="minutes" fill="#6366f1" radius={[4, 4, 0, 0]} name="Minutes in call" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="overflow-hidden border border-slate-200 rounded-lg">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Participant</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Total Time</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Total Connections</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {data.map((row) => (
                                            <tr key={row.name} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{row.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-500">{row.minutes} min</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-500">{row.sessions}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}