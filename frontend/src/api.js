import axios from 'axios'

// API通信用の共通設定
const api = axios.create({
  baseURL: 'https://isaru-car.vercel.app'
})

// リクエストを送る前にトークンを付ける
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default api