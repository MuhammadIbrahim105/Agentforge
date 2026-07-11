import { useState } from 'react'
import { Search, BookOpen } from 'lucide-react'
import { searchKnowledge } from '../api/knowledge'

interface Props {
    projectId: string
}

export default function KnowledgeSearch({ projectId }: Props) {
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null)

    const handleSearch = async () => {
        if (!query.trim()) return
        setLoading(true)
        try {
            const data = await searchKnowledge(projectId, query)
            setResult(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="rounded-2xl p-6" style={{ background: '#0F0F1A', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
                    <BookOpen size={18} className="text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-white font-semibold">Knowledge Search</h3>
                    <p className="text-xs text-gray-500">Hybrid semantic + keyword search</p>
                </div>
            </div>

            <div className="flex gap-2">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search your documents..."
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
                    style={{ background: '#141428', border: '1px solid rgba(99, 102, 241, 0.2)' }}
                />
                <button onClick={handleSearch} disabled={loading}
                    className="px-4 py-2.5 rounded-xl transition-all disabled:opacity-40"
                    style={{ background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                    {loading
                        ? <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        : <Search size={16} className="text-indigo-400" />}
                </button>
            </div>

            {result && (
                <div className="mt-4 p-4 rounded-xl" style={{ background: '#141428', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                    <p className="text-gray-200 text-sm leading-relaxed">{result.answer}</p>
                    {result.sources?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {result.sources.map((s: string) => (
                                <span key={s} className="px-2 py-0.5 rounded-full text-xs text-emerald-400"
                                    style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                    {s}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}