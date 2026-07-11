import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, FolderOpen } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import AgentRunner from '../components/AgentRunner'
import DocumentUpload from '../components/DocumentUpload'
import KnowledgeSearch from '../components/KnowledgeSearch'
import { getProjects } from '../api/projects'

export default function ProjectPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects
    })

    const project = projects.find((p: any) => p.id === id)

    return (
        <div className="flex min-h-screen" style={{ background: '#0A0A0F' }}>
            <Sidebar />
            <div className="ml-64 flex-1 p-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate('/dashboard')}
                        className="p-2 rounded-xl transition-all text-gray-600 hover:text-white"
                        style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
                            <FolderOpen size={16} className="text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">{project?.name || 'Project'}</h1>
                            <p className="text-gray-600 text-xs">{project?.llm_model}</p>
                        </div>
                    </div>
                </div>

                {id && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left column */}
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Knowledge Base</h2>
                                <DocumentUpload projectId={id} />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Search</h2>
                                <KnowledgeSearch projectId={id} />
                            </div>
                        </div>

                        {/* Right column */}
                        <div>
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">AI Agents</h2>
                            <AgentRunner projectId={id} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}