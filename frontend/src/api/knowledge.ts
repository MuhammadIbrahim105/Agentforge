import client from './client'

export const uploadDocument = async (projectId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await client.post(`/api/v1/knowledge/${projectId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
    return res.data
}

export const processDocument = async (projectId: string, docId: string) => {
    const res = await client.post(`/api/v1/knowledge/${projectId}/process/${docId}`)
    return res.data
}

export const getDocuments = async (projectId: string) => {
    const res = await client.get(`/api/v1/knowledge/${projectId}/documents`)
    return res.data
}

export const searchKnowledge = async (projectId: string, query: string) => {
    const res = await client.post(`/api/v1/knowledge/${projectId}/search`, {
        query,
        n_results: 5,
        use_hybrid: true
    })
    return res.data
}

export const deleteDocument = async (projectId: string, docId: string) => {
    await client.delete(`/api/v1/knowledge/${projectId}/documents/${docId}`)
}

export const transcribeAudio = async (projectId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await client.post(
        `/api/v1/knowledge/${projectId}/transcribe-audio`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return res.data
}

export const transcribeVoice = async (projectId: string, blob: Blob) => {
    const formData = new FormData()
    formData.append('file', blob, 'voice.webm')
    const res = await client.post(
        `/api/v1/knowledge/${projectId}/transcribe-voice`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return res.data
}