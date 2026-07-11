import { useState, useRef } from 'react'
import { Upload, FileText, Trash2, CheckCircle, Clock, XCircle, Zap } from 'lucide-react'
import { uploadDocument, processDocument, getDocuments, deleteDocument } from '../api/knowledge'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Props {
    projectId: string
}

const statusIcon: any = {
    pending: <Clock size={14} className="text-yellow-400" />,
    processing: <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />,
    completed: <CheckCircle size={14} className="text-emerald-400" />,
    failed: <XCircle size={14} className="text-red-400" />
}

export default function DocumentUpload({ projectId }: Props) {
    const [dragging, setDragging] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [processing, setProcessing] = useState<string | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)
    const queryClient = useQueryClient()

    const { data: documents = [] } = useQuery({
        queryKey: ['documents', projectId],
        queryFn: () => getDocuments(projectId),
        refetchInterval: 3000
    })

    const handleUpload = async (file: File) => {
        setUploading(true)
        try {
            const doc = await uploadDocument(projectId, file)
            queryClient.invalidateQueries({ queryKey: ['documents', projectId] })
            setProcessing(doc.id)
            await processDocument(projectId, doc.id)
            queryClient.invalidateQueries({ queryKey: ['documents', projectId] })
        } catch (err) {
            console.error(err)
        } finally {
            setUploading(false)
            setProcessing(null)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleUpload(file)
    }

    const handleDelete = async (docId: string) => {
        await deleteDocument(projectId, docId)
        queryClient.invalidateQueries({ queryKey: ['documents', projectId] })
    }

    return (
        <div className="space-y-4">
            {/* Drop zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className="relative rounded-2xl p-8 text-center cursor-pointer transition-all"
                style={{
                    background: dragging ? 'rgba(99, 102, 241, 0.1)' : '#0F0F1A',
                    border: `2px dashed ${dragging ? '#6366F1' : 'rgba(99, 102, 241, 0.2)'}`,
                }}>
                <input ref={fileRef} type="file" className="hidden"
                    accept=".pdf,.txt,.docx,.csv,.html"
                    onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }} />

                {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        <p className="text-indigo-400 text-sm">Uploading and processing...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
                            <Upload size={22} className="text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-white text-sm font-medium">Drop files here or click to upload</p>
                            <p className="text-gray-600 text-xs mt-1">PDF, TXT, DOCX, CSV, HTML supported</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Document list */}
            {documents.length > 0 && (
                <div className="space-y-2">
                    {documents.map((doc: any) => (
                        <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl transition-all group"
                            style={{ background: '#0F0F1A', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                                <FileText size={14} className="text-indigo-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{doc.filename}</p>
                                <p className="text-gray-600 text-xs">{doc.chunk_count} chunks · {(doc.file_size / 1024).toFixed(1)} KB</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {statusIcon[doc.status]}
                                <button onClick={() => handleDelete(doc.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-all text-gray-600 hover:text-red-400">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}