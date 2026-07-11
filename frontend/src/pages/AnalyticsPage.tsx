import { useQuery } from '@tanstack/react-query'
import { BarChart3, Zap, DollarSign, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import client from '../api/client'

const getUsage = async () => {
    const res = await client.get('/api/v1/analytics/usage')
    return res.data
}

const getPerformance = async () => {
    const res = await client.get('/api/v1/analytics/performance')
    return res.data
}

const getRuns = async () => {
    const res = await client.get('/api/v1/agents/runs')
    return res.data
}

export default function AnalyticsPage() {
    const { data: usage } = useQuery({ queryKey: ['usage'], queryFn: getUsage })
    const { data: perf } = useQuery({ queryKey: ['performance'], queryFn: getPerformance })
    const { data: runs = [] } = useQuery({ queryKey: ['runs'], queryFn: getRuns })

    const stats = [
        { label: 'Total Runs', value: usage?.total_runs ?? 0, icon: Zap, color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
        { label: 'Completed', value: usage?.completed_runs ?? 0, icon: CheckCircle, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
        { label: 'Tokens Used', value: (usage?.total_tokens_used ?? 0).toLocaleString(), icon: TrendingUp, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
        { label: 'Tokens Left', value: (usage?.tokens_remaining ?? 0).toLocaleString(), icon: BarChart3, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
        { label: 'Success Rate', value: `${perf?.success_rate ?? 0}%`, icon: TrendingUp, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
        { label: 'Avg Duration', value: perf?.avg_duration_ms ? `${perf.avg_duration_ms}ms` : '—', icon: Clock, color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
        { label: 'Total Cost', value: `$${perf?.total_cost_usd?.toFixed(6) ?? '0.000000'}`, icon: DollarSign, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
        { label: 'Failed Runs', value: usage?.failed_runs ?? 0, icon: BarChart3, color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    ]

    return (
        <div className="flex min-h-screen" style={{ background: '#0A0A0F' }}>
            <Sidebar />
            <div className="ml-64 flex-1 p-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white">Analytics</h1>
                    <p className="text-gray-600 text-sm mt-1">Monitor your agent performance and usage</p>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {stats.map((stat) => (
                        <div key={stat.label} className="p-5 rounded-2xl"
                            style={{ background: '#0F0F1A', border: '1px solid rgba(99,102,241,0.1)' }}>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">{stat.label}</span>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: stat.bg }}>
                                    <stat.icon size={14} style={{ color: stat.color }} />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-white">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Token budget bar */}
                {usage && (
                    <div className="p-6 rounded-2xl mb-6" style={{ background: '#0F0F1A', border: '1px solid rgba(99,102,241,0.1)' }}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-white font-semibold text-sm">Token Budget</h3>
                            <span className="text-gray-500 text-xs">{usage.total_tokens_used?.toLocaleString()} / {usage.token_budget?.toLocaleString()}</span>
                        </div>
                        <div className="h-2 rounded-full" style={{ background: 'rgba(99,102,241,0.15)' }}>
                            <div className="h-2 rounded-full transition-all"
                                style={{
                                    width: `${Math.min((usage.total_tokens_used / usage.token_budget) * 100, 100)}%`,
                                    background: 'linear-gradient(90deg, #6366F1, #8B5CF6)'
                                }} />
                        </div>
                        <p className="text-gray-600 text-xs mt-2">{usage.tokens_remaining?.toLocaleString()} tokens remaining</p>
                    </div>
                )}

                {/* Recent runs */}
                <div className="rounded-2xl overflow-hidden" style={{ background: '#0F0F1A', border: '1px solid rgba(99,102,241,0.1)' }}>
                    <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(99,102,241,0.1)' }}>
                        <h3 className="text-white font-semibold text-sm">Recent Agent Runs</h3>
                    </div>
                    {runs.length === 0 ? (
                        <div className="p-8 text-center text-gray-600 text-sm">No agent runs yet</div>
                    ) : (
                        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                            {runs.slice(0, 10).map((run: any) => (
                                <div key={run.id} className="px-6 py-4 flex items-start gap-4">
                                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${run.status === 'completed' ? 'bg-emerald-400' :
                                            run.status === 'failed' ? 'bg-red-400' :
                                                run.status === 'running' ? 'bg-indigo-400' : 'bg-gray-600'
                                        }`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm truncate">{run.task_input}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-gray-600 text-xs">{run.status}</span>
                                            {run.tokens_used > 0 && <span className="text-gray-600 text-xs">{run.tokens_used} tokens</span>}
                                            {run.duration_ms && <span className="text-gray-600 text-xs">{run.duration_ms}ms</span>}
                                            {run.agents_used?.length > 0 && (
                                                <span className="text-indigo-400 text-xs">{run.agents_used.length} agents</span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${run.status === 'completed' ? 'text-emerald-400' :
                                            run.status === 'failed' ? 'text-red-400' : 'text-gray-500'
                                        }`} style={{
                                            background: run.status === 'completed' ? 'rgba(16,185,129,0.1)' :
                                                run.status === 'failed' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)'
                                        }}>
                                        {run.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}