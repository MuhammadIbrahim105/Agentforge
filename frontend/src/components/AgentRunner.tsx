import { useState } from 'react'
import { runAgent } from '../api/agents'
import { Brain, Zap, CheckCircle, ChevronDown, ChevronUp, Clock } from 'lucide-react'

interface Props {
    projectId: string
}

export default function AgentRunner({ projectId }: Props) {
    const [task, setTask] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState('')
    const [showSteps, setShowSteps] = useState(false)

    const handleRun = async () => {
        if (!task.trim()) return
        setLoading(true)
        setError('')
        setResult(null)
        try {
            const data = await runAgent(projectId, task)
            setResult(data)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Agent run failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="rounded-2xl p-6" style={{ background: '#0F0F1A', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
                    <Brain size={18} className="text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-white font-semibold">Agent Runner</h3>
                    <p className="text-xs text-gray-500">Multi-agent AI workflow</p>
                </div>
            </div>

            <div className="space-y-3">
                <textarea
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    placeholder="Ask anything about your documents... e.g. 'What does this document say about vector storage?'"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 resize-none focus:outline-none transition-all"
                    style={{ background: '#141428', border: '1px solid rgba(99, 102, 241, 0.2)' }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.2)'}
                />

                <button onClick={handleRun} disabled={loading || !task.trim()}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                    style={{ background: loading ? '#1A1A35' : 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                            Agents thinking...
                        </>
                    ) : (
                        <>
                            <Zap size={16} />
                            Run Agents
                        </>
                    )}
                </button>
            </div>

            {error && (
                <div className="mt-4 p-3 rounded-xl text-red-400 text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    {error}
                </div>
            )}

            {result && (
                <div className="mt-5 space-y-4">
                    {/* Agent badges */}
                    <div className="flex flex-wrap gap-2">
                        {result.agents_used?.map((agent: string) => (
                            <span key={agent} className="px-3 py-1 rounded-full text-xs font-medium text-indigo-300"
                                style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                                {agent}
                            </span>
                        ))}
                    </div>

                    {/* Answer */}
                    <div className="p-4 rounded-xl" style={{ background: '#141428', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle size={14} className="text-emerald-400" />
                            <span className="text-xs font-medium text-emerald-400">Answer</span>
                        </div>
                        <p className="text-gray-200 text-sm leading-relaxed">{result.final_output}</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Tokens', value: result.tokens_used },
                            { label: 'Duration', value: `${result.duration_ms}ms` },
                            { label: 'Cost', value: `$${result.cost_usd?.toFixed(6)}` }
                        ].map(stat => (
                            <div key={stat.label} className="p-3 rounded-xl text-center" style={{ background: '#141428', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <p className="text-white font-semibold text-sm">{stat.value}</p>
                                <p className="text-gray-600 text-xs mt-0.5">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Steps toggle */}
                    {result.steps && (
                        <button onClick={() => setShowSteps(!showSteps)}
                            className="w-full flex items-center justify-between px-4 py-2 rounded-xl text-xs text-gray-500 hover:text-gray-300 transition-all"
                            style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                            <span className="flex items-center gap-2"><Clock size={12} /> Agent Steps ({result.steps.length})</span>
                            {showSteps ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                    )}

                    {showSteps && result.steps && (
                        <div className="space-y-2">
                            {result.steps.map((step: any, i: number) => (
                                <div key={i} className="p-3 rounded-xl" style={{ background: '#141428', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-indigo-400"
                                            style={{ background: 'rgba(99, 102, 241, 0.15)' }}>{i + 1}</span>
                                        <span className="text-indigo-400 text-xs font-medium">{step.agent}</span>
                                        <span className="text-gray-600 text-xs">→ {step.action}</span>
                                    </div>
                                    <p className="text-gray-400 text-xs pl-7">{step.output}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}