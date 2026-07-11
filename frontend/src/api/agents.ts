import client from './client'

export const runAgent = async (projectId: string, task: string) => {
    const res = await client.post('/api/v1/agents/run', {
        project_id: projectId,
        task,
        stream: false
    })
    return res.data
}

export const getRuns = async () => {
    const res = await client.get('/api/v1/agents/runs')
    return res.data
}