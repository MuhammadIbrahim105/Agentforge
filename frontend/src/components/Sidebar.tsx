import { Brain, FolderOpen, LogOut, Zap, BarChart3 } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const navItems = [
    { icon: FolderOpen, label: 'Projects', path: '/dashboard' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
]

export default function Sidebar() {
    const navigate = useNavigate()
    const location = useLocation()
    const logout = useAuthStore((state) => state.logout)
    const user = useAuthStore((state) => state.user)

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <div className="fixed left-0 top-0 h-full w-64 flex flex-col z-40"
            style={{ background: 'linear-gradient(180deg, #0F0F1A 0%, #0A0A0F 100%)', borderRight: '1px solid rgba(99, 102, 241, 0.15)' }}>

            {/* Logo */}
            <div className="p-6 border-b" style={{ borderColor: 'rgba(99, 102, 241, 0.15)' }}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                        <Brain size={18} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-lg leading-none">AgentForge</h1>
                        <p className="text-xs mt-0.5" style={{ color: '#6366F1' }}>AI Orchestration</p>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => {
                    const active = location.pathname === item.path
                    return (
                        <button key={item.path} onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                                }`}
                            style={active ? {
                                background: 'rgba(99, 102, 241, 0.15)',
                                border: '1px solid rgba(99, 102, 241, 0.3)'
                            } : {}}>
                            <item.icon size={18} className={active ? 'text-indigo-400' : ''} />
                            {item.label}
                        </button>
                    )
                })}
            </nav>

            {/* User */}
            <div className="p-4 border-t" style={{ borderColor: 'rgba(99, 102, 241, 0.15)' }}>
                <div className="flex items-center gap-3 mb-3 px-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                        {user?.full_name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
                        <p className="text-xs truncate" style={{ color: '#6366F1' }}>{user?.plan} plan</p>
                    </div>
                </div>
                <button onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all text-gray-500 hover:text-red-400"
                    style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                    <LogOut size={16} /> Sign out
                </button>
            </div>
        </div>
    )
}