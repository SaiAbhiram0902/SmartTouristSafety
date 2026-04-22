import { create } from 'zustand'

const useAuthStore = create((set) => ({
  token:     localStorage.getItem('token')     || null,
  role:      localStorage.getItem('role')      || null,
  username:  localStorage.getItem('username')  || null,
  touristId: localStorage.getItem('touristId') || null,

  login: (data) => {
    localStorage.setItem('token',     data.token)
    localStorage.setItem('role',      data.role)
    localStorage.setItem('username',  data.username)
    localStorage.setItem('touristId', data.touristId || '')
    set({
      token:     data.token,
      role:      data.role,
      username:  data.username,
      touristId: data.touristId,
    })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('username')
    localStorage.removeItem('touristId')
    set({ token: null, role: null, username: null, touristId: null })
  },
}))

export default useAuthStore
