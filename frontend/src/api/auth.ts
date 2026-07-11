import client from './client'

export const login = async (email: string, password: string) => {
    const res = await client.post('/api/v1/auth/login', { email, password })
    return res.data
}

export const register = async (full_name: string, email: string, password: string) => {
    const res = await client.post('/api/v1/auth/register', { full_name, email, password })
    return res.data
}

export const getMe = async () => {
    const res = await client.get('/api/v1/auth/me')
    return res.data
}