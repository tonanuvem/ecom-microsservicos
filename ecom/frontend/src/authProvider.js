import { SERVICES } from './services'

// AuthProvider para react-admin — autentica via /auth/login do svc-usuarios
const authProvider = {
  login: async ({ username, password }) => {
    const res = await fetch(`${SERVICES.usuarios.base}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username, senha: password }),
    })
    if (!res.ok) throw new Error('Credenciais inválidas')
    const data = await res.json()
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('role', data.role || 'CLIENTE')
    localStorage.setItem('nome', data.nome || username)
  },
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('nome')
    return Promise.resolve()
  },
  checkAuth: () => localStorage.getItem('token') ? Promise.resolve() : Promise.reject(),
  checkError: ({ status }) => (status === 401 || status === 403) ? Promise.reject() : Promise.resolve(),
  getPermissions: () => Promise.resolve(localStorage.getItem('role') || 'CLIENTE'),
  getIdentity: () => Promise.resolve({ id: 'me', fullName: localStorage.getItem('nome') || 'Usuário' }),
}

export default authProvider
