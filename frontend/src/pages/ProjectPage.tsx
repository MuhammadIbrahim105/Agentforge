import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FolderOpen, Send, Upload, FileText, ImageIcon, Trash2, Loader, Brain } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import { getProjects } from '../api/projects'
import { getDocuments, deleteDocument, uploadDocument, processDocument } from '../api/knowledge'
import { smartSearch } from '../api/search'
import client from '../api/client'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    sources?: string[]
    webSources?: string[]
    agents?: string[]
    tokens?: number
    confidence?: number
    type?: 'text' | 'image'
    mode?: string
}

export default function ProjectPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [imageQuestion, setImageQuestion] = useState('')
    const [showImageInput, setShowImageInput] = useState(false)
    const [selectedDocs, setSelectedDocs] = useState<string[]>([])
    const [searchMode, setSearchMode] = useState<'docs' | 'web' | 'hybrid'>('docs')
    const fileRef = useRef<HTMLInputElement>(null)
    const imageRef = useRef<HTMLInputElement>(null)
    const bottomRef = useRef<HTMLDivElement>(null)

    const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects })
    const { data: documents = [] } = useQuery({
        queryKey: ['documents', id],
        queryFn: () => getDocuments(id!),
        refetchInterval: 3000
    })

    const project = projects.find((p: any) => p.id === id)
    const completedDocs = documents.filter((d: any) => d.status === 'completed')

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const toggleDocSelection = (docId: string) => {
        setSelectedDocs(prev =>
            prev.includes(docId) ? prev.filter(d => d !== docId) : [...prev, docId]
        )
    }

    const getSelectedDocNames = () => {
        if (selectedDocs.length === 0) return 'All documents'
        return selectedDocs
            .map(sid => completedDocs.find((d: any) => d.id === sid)?.filename?.replace('[IMAGE] ', '') || sid)
            .join(', ')
    }

    const buildFilteredQuery = (query: string) => {
        if (selectedDocs.length === 0) return query
        const selectedNames = selectedDocs
            .map(sid => completedDocs.find((d: any) => d.id === sid)?.filename || '')
            .filter(Boolean)
        return `${query}\n\n[IMPORTANT: Only use information from these specific sources: ${selectedNames.join(', ')}. Ignore all other documents.]`
    }

    const autoSummarize = async (filename: string) => {
        setLoading(true)
        try {
            const result = await smartSearch(
                id!,
                `Provide a comprehensive summary of "${filename}". What are the main topics, key points, and important information it contains?`,
                'docs'
            )
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `📄 **${filename}** uploaded!\n\n**Here's what's inside:**\n\n${result?.answer || 'Document processed. You can now ask questions about it.'}`,
                sources: result?.doc_sources,
                tokens: result?.tokens_used,
                agents: ['ResearchAgent'],
                mode: 'docs'
            }])
        } catch {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `✅ **${filename}** uploaded and ready. Ask me anything about it.`
            }])
        } finally {
            setLoading(false)
        }
    }

    const handleDocUpload = async (file: File) => {
        setUploading(true)
        try {
            const doc = await uploadDocument(id!, file)
            await processDocument(id!, doc.id)
            queryClient.invalidateQueries({ queryKey: ['documents', id] })
            await autoSummarize(file.name)
        } catch (err) {
            console.error(err)
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Failed to upload document. Please try again.'
            }])
        } finally {
            setUploading(false)
        }
    }

    const handleImageUpload = async (file: File) => {
        setLoading(true)
        const question = imageQuestion || 'Describe this image in detail. Extract ALL text, numbers, data, and information visible.'
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'user',
            content: `📷 **${file.name}**\n${question}`
        }])
        setImageQuestion('')
        setShowImageInput(false)
        const formData = new FormData()
        formData.append('file', file)
        try {
            const res = await client.post(
                `/api/v1/knowledge/${id}/analyze-image?question=${encodeURIComponent(question)}`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            )
            queryClient.invalidateQueries({ queryKey: ['documents', id] })
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `🖼️ **${file.name}** analyzed!\n\n**Here's what I found:**\n\n${res.data.answer}\n\n*Image stored in knowledge base — ask follow-up questions anytime.*`,
                confidence: res.data.confidence_score,
                tokens: res.data.tokens_used,
                type: 'image'
            }])
        } catch (err: any) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Image analysis failed: ${err.response?.data?.detail || 'Unknown error'}`
            }])
        } finally {
            setLoading(false)
        }
    }

    const handleSend = async () => {
        if (!input.trim() || loading) return
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            sources: selectedDocs.length > 0
                ? selectedDocs.map(sid => completedDocs.find((d: any) => d.id === sid)?.filename?.replace('[IMAGE] ', '') || sid)
                : undefined
        }
        setMessages(prev => [...prev, userMessage])
        const currentInput = buildFilteredQuery(input)
        setInput('')
        setLoading(true)

        try {
            const result = await smartSearch(id!, currentInput, searchMode)
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: result.answer,
                sources: result.doc_sources?.length > 0 ? result.doc_sources : undefined,
                webSources: result.web_sources?.length > 0 ? result.web_sources : undefined,
                tokens: result.tokens_used,
                agents: result.mode === 'docs' ? ['ResearchAgent'] :
                    result.mode === 'web' ? ['WebAgent'] :
                        ['ResearchAgent', 'WebAgent'],
                mode: result.mode
            }])
        } catch (err: any) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Error: ${err.response?.data?.detail || 'Something went wrong'}`
            }])
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteDoc = async (docId: string) => {
        await deleteDocument(id!, docId)
        setSelectedDocs(prev => prev.filter(d => d !== docId))
        queryClient.invalidateQueries({ queryKey: ['documents', id] })
    }

    const renderMessageContent = (content: string) => {
        return content.split('\n').map((line, i) => {
            if (line.startsWith('## ')) return <h3 key={i} className="font-bold text-sm mt-3 mb-1" style={{ color: '#A78BFA' }}>{line.replace('## ', '')}</h3>
            if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-white">{line.replace(/\*\*/g, '')}</p>
            if (line.startsWith('• ') || line.startsWith('* ') || line.startsWith('- ')) return <div key={i} className="flex gap-2 ml-2"><span className="text-indigo-400 shrink-0">•</span><span>{line.replace(/^[•*-] /, '')}</span></div>
            if (line.trim() === '') return <div key={i} className="h-1" />
            return <p key={i}>{line}</p>
        })
    }

    return (
        <div className="flex min-h-screen" style={{ background: '#0A0A0F' }}>
            <Sidebar />

            {/* Left panel */}
            <div className="ml-64 w-72 flex flex-col border-r" style={{ borderColor: 'rgba(99,102,241,0.1)', background: '#0A0A0F' }}>

                {/* Header */}
                <div className="p-4 border-b" style={{ borderColor: 'rgba(99,102,241,0.1)' }}>
                    <button onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-3 transition-all">
                        <ArrowLeft size={14} /> Back
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(99,102,241,0.15)' }}>
                            <FolderOpen size={13} className="text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-white text-sm font-semibold truncate">{project?.name}</p>
                            <p className="text-gray-600 text-xs truncate">{project?.llm_model}</p>
                        </div>
                    </div>
                </div>

                {/* Upload buttons */}
                <div className="p-4 border-b space-y-2" style={{ borderColor: 'rgba(99,102,241,0.1)' }}>
                    <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Add Knowledge</p>

                    <input ref={fileRef} type="file" className="hidden"
                        accept=".pdf,.txt,.docx,.csv,.html"
                        onChange={(e) => { if (e.target.files?.[0]) handleDocUpload(e.target.files[0]) }} />
                    <input ref={imageRef} type="file" className="hidden"
                        accept=".jpg,.jpeg,.png,.gif,.webp"
                        onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]) }} />

                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all disabled:opacity-40"
                        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#818CF8' }}>
                        {uploading ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
                        {uploading ? 'Processing...' : 'Upload Document'}
                    </button>

                    <button onClick={() => setShowImageInput(!showImageInput)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
                        style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', color: '#A78BFA' }}>
                        <ImageIcon size={14} />
                        Analyze Image
                    </button>

                    {showImageInput && (
                        <div className="space-y-2 p-3 rounded-xl" style={{ background: '#0F0F1A', border: '1px solid rgba(139,92,246,0.2)' }}>
                            <input value={imageQuestion} onChange={(e) => setImageQuestion(e.target.value)}
                                placeholder="Question about image (optional)"
                                className="w-full px-3 py-2 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none"
                                style={{ background: '#141428', border: '1px solid rgba(139,92,246,0.2)' }} />
                            <button onClick={() => imageRef.current?.click()}
                                className="w-full py-2 rounded-lg text-xs font-medium text-white"
                                style={{ background: 'linear-gradient(135deg, #7C3AED, #6366F1)' }}>
                                Choose Image
                            </button>
                        </div>
                    )}
                </div>

                {/* Document list */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-gray-600 uppercase tracking-wide">
                            Sources ({completedDocs.length})
                        </p>
                        {selectedDocs.length > 0 && (
                            <button onClick={() => setSelectedDocs([])}
                                className="text-xs text-indigo-400 hover:text-indigo-300">
                                Clear
                            </button>
                        )}
                    </div>

                    {selectedDocs.length > 0 && (
                        <div className="mb-3 p-2 rounded-lg text-xs text-indigo-300"
                            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                            🎯 Filtering to {selectedDocs.length} source{selectedDocs.length > 1 ? 's' : ''}
                        </div>
                    )}

                    {completedDocs.length === 0 ? (
                        <div className="text-center py-8">
                            <FileText size={24} className="text-gray-700 mx-auto mb-2" />
                            <p className="text-gray-600 text-xs">No documents yet</p>
                            <p className="text-gray-700 text-xs mt-1">Upload to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {completedDocs.map((doc: any) => {
                                const isSelected = selectedDocs.includes(doc.id)
                                return (
                                    <div key={doc.id}
                                        onClick={() => toggleDocSelection(doc.id)}
                                        className="flex items-start gap-2 p-2 rounded-lg group transition-all cursor-pointer"
                                        style={{
                                            border: `1px solid ${isSelected ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.04)'}`,
                                            background: isSelected ? 'rgba(99,102,241,0.08)' : 'transparent'
                                        }}>
                                        <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5"
                                            style={{
                                                background: isSelected ? '#6366F1' : 'transparent',
                                                border: `1px solid ${isSelected ? '#6366F1' : 'rgba(255,255,255,0.15)'}`
                                            }}>
                                            {isSelected && (
                                                <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                                    <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5"
                                            style={{ background: doc.filename.startsWith('[IMAGE]') ? 'rgba(139,92,246,0.15)' : 'rgba(99,102,241,0.15)' }}>
                                            {doc.filename.startsWith('[IMAGE]')
                                                ? <ImageIcon size={9} className="text-purple-400" />
                                                : <FileText size={9} className="text-indigo-400" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs truncate ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                                                {doc.filename.replace('[IMAGE] ', '')}
                                            </p>
                                            <p className="text-gray-600 text-xs">{doc.chunk_count} chunks</p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id) }}
                                            className="opacity-0 group-hover:opacity-100 transition-all text-gray-700 hover:text-red-400 shrink-0">
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Right panel — chat */}
            <div className="flex-1 flex flex-col">

                {/* Chat header */}
                <div className="px-6 py-4 border-b flex items-center gap-3"
                    style={{ borderColor: 'rgba(99,102,241,0.1)', background: '#0A0A0F' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(99,102,241,0.15)' }}>
                        <Brain size={14} className="text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-white text-sm font-semibold">AI Assistant</p>
                        <p className="text-gray-600 text-xs">
                            {searchMode === 'docs' ? '📄 Searching private documents only' :
                                searchMode === 'web' ? '🌐 Searching the internet only' :
                                    '🔀 Searching documents + internet'}
                            {selectedDocs.length > 0 && ` · ${selectedDocs.length} source filter active`}
                        </p>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                <Brain size={28} className="text-indigo-400" />
                            </div>
                            <h3 className="text-white font-semibold mb-2">Start a conversation</h3>
                            <p className="text-gray-600 text-sm max-w-sm">
                                Upload a document or image on the left — I'll automatically summarize it. Then ask questions using any search mode.
                            </p>
                            <div className="mt-6 space-y-2 w-full max-w-sm">
                                {[
                                    'What are the key points in my documents?',
                                    'Summarize everything you know',
                                    'What are the latest AI trends? (use Web mode)'
                                ].map((suggestion) => (
                                    <button key={suggestion} onClick={() => setInput(suggestion)}
                                        className="w-full px-4 py-2.5 rounded-xl text-sm text-left transition-all text-gray-400 hover:text-white"
                                        style={{ background: '#0F0F1A', border: '1px solid rgba(99,102,241,0.15)' }}>
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className="max-w-xl w-full">
                                {msg.role === 'assistant' && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-5 h-5 rounded-md flex items-center justify-center"
                                            style={{ background: 'rgba(99,102,241,0.2)' }}>
                                            <Brain size={10} className="text-indigo-400" />
                                        </div>
                                        <span className="text-gray-600 text-xs">AgentForge</span>
                                        {msg.confidence && (
                                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                                style={{
                                                    background: msg.confidence >= 90 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                                    color: msg.confidence >= 90 ? '#10B981' : '#F59E0B'
                                                }}>
                                                {msg.confidence}% confident
                                            </span>
                                        )}
                                        {msg.mode && (
                                            <span className="text-xs px-2 py-0.5 rounded-full"
                                                style={{
                                                    background: msg.mode === 'web' ? 'rgba(16,185,129,0.08)' :
                                                        msg.mode === 'hybrid' ? 'rgba(245,158,11,0.08)' :
                                                            'rgba(99,102,241,0.08)',
                                                    color: msg.mode === 'web' ? '#10B981' :
                                                        msg.mode === 'hybrid' ? '#F59E0B' : '#818CF8'
                                                }}>
                                                {msg.mode === 'web' ? '🌐 web' : msg.mode === 'hybrid' ? '🔀 hybrid' : '📄 docs'}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {msg.role === 'user' && msg.sources && (
                                    <div className="flex justify-end mb-1">
                                        <span className="text-xs text-indigo-400 px-2 py-0.5 rounded-full"
                                            style={{ background: 'rgba(99,102,241,0.1)' }}>
                                            🎯 {msg.sources.join(', ')}
                                        </span>
                                    </div>
                                )}

                                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'ml-auto rounded-tr-sm' : 'rounded-tl-sm'}`}
                                    style={msg.role === 'user' ? {
                                        background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                                        color: 'white',
                                        maxWidth: 'fit-content'
                                    } : {
                                        background: '#0F0F1A',
                                        border: '1px solid rgba(99,102,241,0.15)',
                                        color: '#E2E8F0'
                                    }}>
                                    <div className="space-y-0.5">
                                        {renderMessageContent(msg.content)}
                                    </div>
                                </div>

                                {msg.role === 'assistant' && (msg.agents || msg.tokens || msg.sources || msg.webSources) && (
                                    <div className="flex items-center flex-wrap gap-2 mt-2 pl-1">
                                        {msg.agents?.map((a) => (
                                            <span key={a} className="text-xs px-2 py-0.5 rounded-full text-indigo-400"
                                                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                                                {a}
                                            </span>
                                        ))}
                                        {msg.sources?.map((s) => (
                                            <span key={s} className="text-xs px-2 py-0.5 rounded-full text-emerald-400"
                                                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                                📄 {s}
                                            </span>
                                        ))}
                                        {msg.webSources?.slice(0, 2).map((s: string) => {
                                            try {
                                                return (
                                                    <a key={s} href={s} target="_blank" rel="noopener noreferrer"
                                                        className="text-xs px-2 py-0.5 rounded-full text-blue-400 hover:text-blue-300"
                                                        style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                                                        🌐 {new URL(s).hostname}
                                                    </a>
                                                )
                                            } catch { return null }
                                        })}
                                        {msg.tokens && <span className="text-gray-700 text-xs">{msg.tokens} tokens</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex justify-start">
                            <div className="px-4 py-3 rounded-2xl rounded-tl-sm"
                                style={{ background: '#0F0F1A', border: '1px solid rgba(99,102,241,0.15)' }}>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="px-6 py-4 border-t" style={{ borderColor: 'rgba(99,102,241,0.1)', background: '#0A0A0F' }}>

                    {/* Mode toggle */}
                    <div className="mb-3 flex items-center gap-2">
                        <span className="text-gray-600 text-xs shrink-0">Search:</span>
                        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#141428' }}>
                            {[
                                { id: 'docs', label: '📄 Docs Only' },
                                { id: 'web', label: '🌐 Web Only' },
                                { id: 'hybrid', label: '🔀 Both' }
                            ].map((m) => (
                                <button key={m.id} onClick={() => setSearchMode(m.id as any)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                    style={searchMode === m.id ? {
                                        background: m.id === 'web' ? 'rgba(16,185,129,0.2)' :
                                            m.id === 'hybrid' ? 'rgba(245,158,11,0.2)' :
                                                'rgba(99,102,241,0.2)',
                                        color: m.id === 'web' ? '#10B981' :
                                            m.id === 'hybrid' ? '#F59E0B' : '#818CF8',
                                        border: `1px solid ${m.id === 'web' ? 'rgba(16,185,129,0.3)' :
                                            m.id === 'hybrid' ? 'rgba(245,158,11,0.3)' :
                                                'rgba(99,102,241,0.3)'}`
                                    } : { color: '#6B7280', border: '1px solid transparent' }}>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedDocs.length > 0 && (
                        <div className="mb-2 flex items-center gap-2 text-xs text-indigo-400">
                            <span>🎯 Filtering:</span>
                            <span className="truncate flex-1">{getSelectedDocNames()}</span>
                            <button onClick={() => setSelectedDocs([])} className="text-gray-600 hover:text-white shrink-0">✕</button>
                        </div>
                    )}

                    <div className="flex items-end gap-3 p-3 rounded-2xl"
                        style={{ background: '#0F0F1A', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                            placeholder={
                                searchMode === 'web' ? 'Search the internet...' :
                                    searchMode === 'hybrid' ? 'Search docs + internet...' :
                                        selectedDocs.length > 0 ? `Ask about ${getSelectedDocNames()}...` :
                                            'Ask anything about your documents...'
                            }
                            rows={1}
                            className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none resize-none"
                            style={{ maxHeight: '120px' }}
                        />
                        <button onClick={handleSend} disabled={loading || !input.trim()}
                            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 shrink-0"
                            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                            <Send size={14} className="text-white" />
                        </button>
                    </div>
                    <p className="text-gray-700 text-xs mt-2 text-center">
                        Enter to send · Shift+Enter for new line · Check sources on left to filter
                    </p>
                </div>
            </div>
        </div>
    )
}