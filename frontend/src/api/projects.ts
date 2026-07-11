import client from './client'

export const getProjects = async () => {
    const res = await client.get('/api/v1/projects/')
    return res.data
}

export const createProject = async (data: any) => {
    const res = await client.post('/api/v1/projects/', data)
    return res.data
}

export const deleteProject = async (id: string) => {
    await client.delete(`/api/v1/projects/${id}`)
}