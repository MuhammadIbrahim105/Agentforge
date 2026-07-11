import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FolderOpen, Trash2, ArrowRight, Brain } from 'lucide-react'
import { getProjects, createProject, deleteProject } from '../api/projects'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

export default function DashboardPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [showForm, setShowForm] = useState(false)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')

    const { data: projects = [], isLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects
    })

    const createMutation = useMutation({
        mutationFn: createProject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            setShowForm(false)
            setName('')
            setDescription('')
        }
    })

    const deleteMutation = useMutation({
        mutationFn: deleteProject,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] })
    })

    return (
        <div className="flex min-h-screen" style={{ background: '#0A0A0F' }}>
            <Sidebar />
            <div className="ml-64 flex-1 p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Projects</h1>
                        <p className="text-gray-600 text-sm mt-1">Manage your AI knowledge bases</p>
                    </div>
                    <button onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-all"
                        style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                        <Plus size={16} /> New Project
                    </button>
                </div>

                {/* Create form */}
                {showForm && (
                    <div className="mb-6 p-6 rounded-2xl" style={{ background: '#0F0F1A', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        <h3 className="text-white font-semibold mb-4">New Project</h3>
                        <div className="space-y-3">
                            <input value={name} onChange={(e) => setName(e.target.value)}
                                placeholder="Project name"
                                className="w-full px-4 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none"
                                style={{ background: '#141428', border: '1px solid rgba(99, 102, 241, 0.2)' }} />
                            <input value={description} onChange={(e) => setDescription(e.target.value)}
                                placeholder="Description (optional)"
                                className="w-full px-4 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none"
                                style={{ background: '#141428', border: '1px solid rgba(99, 102, 241, 0.2)' }} />
                            <div className="flex gap-3">
                                <button onClick={() => createMutation.mutate({ name, description, llm_model: 'llama-3.3-70b-versatile', embedding_model: 'sentence-transformers' })}
                                    disabled={!name || createMutation.isPending}
                                    className="px-5 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-40"
                                    style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                                    {createMutation.isPending ? 'Creating...' : 'Create'}
                                </button>
                                <button onClick={() => setShowForm(false)}
                                    className="px-5 py-2 rounded-xl text-gray-500 text-sm"
                                    style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Projects grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                            style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                            <Brain size={28} className="text-indigo-400" />
                        </div>
                        <h3 className="text-white font-semibold mb-1">No projects yet</h3>
                        <p className="text-gray-600 text-sm">Create your first AI project to get started</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.map((project: any) => (
                            <div key={project.id}
                                className="p-5 rounded-2xl cursor-pointer transition-all group relative"
                                style={{ background: '#0F0F1A', border: '1px solid rgba(99, 102, 241, 0.1)' }}
                                onClick={() => navigate(`/project/${project.id}`)}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
                                        <FolderOpen size={18} className="text-indigo-400" />
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(project.id) }}
                                        className="opacity-0 group-hover:opacity-100 transition-all text-gray-700 hover:text-red-400 p-1">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <h3 className="text-white font-semibold mb-1">{project.name}</h3>
                                <p className="text-gray-600 text-xs mb-4 line-clamp-2">{project.description || 'No description'}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs px-2 py-0.5 rounded-full text-indigo-400"
                                        style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                                        {project.llm_model?.split('-')[0]}
                                    </span>
                                    <ArrowRight size={14} className="text-gray-700 group-hover:text-indigo-400 transition-all" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}