import client from './client'

export const smartSearch = async (
    projectId: string,
    query: string,
    mode: 'docs' | 'web' | 'hybrid' = 'docs'
) => {
    const res = await client.post('/api/v1/search/query', {
        project_id: projectId,
        query,
        mode,
        n_results: 5
    })
    return res.data
}