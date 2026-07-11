import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { login, register } from '../api/auth'
import { Brain, Mail, Lock, User, ArrowRight } from 'lucide-react'

export default function LoginPage() {
    const navigate = useNavigate()
    const setAuth = useAuthStore((state) => state.setAuth)
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            if (!isLogin) {
                await register(fullName, email, password)
            }
            const data = await login(email, password)
            setAuth(data.access_token, {
                id: '',
                email: email,
                full_name: isLogin ? email.split('@')[0] : fullName,
                role: 'engineer',
                plan: 'free',
                token_budget: 100000,
                tokens_used: 0
            })
            navigate('/dashboard')
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex" style={{ background: '#0A0A0F' }}>

            {/* Left panel */}
            <div className="hidden lg:flex w-1/2 flex-col justify-between p-12"
                style={{ background: '#0F0F1A', borderRight: '1px solid rgba(99, 102, 241, 0.15)' }}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                        <Brain size={22} className="text-white" />
                    </div>
                    <span className="text-white font-bold text-xl">AgentForge</span>
                </div>

                <div>
                    <div className="mb-8">
                        <h1 className="text-5xl font-bold text-white leading-tight mb-4">
                            Orchestrate<br />
                            <span style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                intelligent
                            </span><br />
                            AI agents
                        </h1>
                        <p className="text-gray-500 text-lg leading-relaxed">
                            Upload documents. Run multi-agent pipelines. Get answers with source citations.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {[
                            { icon: '🧠', title: 'Multi-Agent Orchestration', desc: 'Decision, Research, and Critic agents work together' },
                            { icon: '🔍', title: 'Hybrid RAG Search', desc: 'Semantic + BM25 keyword search for best retrieval' },
                            { icon: '⚡', title: 'Real-time Insights', desc: 'Full observability into every agent step and token' },
                        ].map((f) => (
                            <div key={f.title} className="flex items-start gap-4 p-4 rounded-xl"
                                style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                                <span className="text-2xl">{f.icon}</span>
                                <div>
                                    <p className="text-white font-medium text-sm">{f.title}</p>
                                    <p className="text-gray-600 text-xs mt-0.5">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="text-gray-700 text-sm">Built with LangGraph · ChromaDB · Groq AI · FastAPI</p>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                            <Brain size={18} className="text-white" />
                        </div>
                        <span className="text-white font-bold text-xl">AgentForge</span>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2">
                            {isLogin ? 'Welcome back' : 'Get started'}
                        </h2>
                        <p className="text-gray-600">
                            {isLogin ? 'Sign in to your workspace' : 'Create your free account'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl text-red-400 text-sm"
                            style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block uppercase tracking-wide">Full Name</label>
                                <div className="relative">
                                    <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                                    <input type="text" value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required={!isLogin} placeholder="Muhammad Ibrahim"
                                        className="w-full pl-11 pr-4 py-3 rounded-xl text-white text-sm placeholder-gray-700 focus:outline-none"
                                        style={{ background: '#0F0F1A', border: '1px solid rgba(99, 102, 241, 0.2)' }} />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block uppercase tracking-wide">Email</label>
                            <div className="relative">
                                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                                <input type="email" value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required placeholder="you@example.com"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl text-white text-sm placeholder-gray-700 focus:outline-none"
                                    style={{ background: '#0F0F1A', border: '1px solid rgba(99, 102, 241, 0.2)' }} />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block uppercase tracking-wide">Password</label>
                            <div className="relative">
                                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                                <input type="password" value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required placeholder="••••••••"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl text-white text-sm placeholder-gray-700 focus:outline-none"
                                    style={{ background: '#0F0F1A', border: '1px solid rgba(99, 102, 241, 0.2)' }} />
                            </div>
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 mt-2"
                            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>{isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={16} /></>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-gray-600 text-sm mt-6">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button onClick={() => { setIsLogin(!isLogin); setError('') }}
                            className="font-medium" style={{ color: '#6366F1' }}>
                            {isLogin ? 'Sign up free' : 'Sign in'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    )
}