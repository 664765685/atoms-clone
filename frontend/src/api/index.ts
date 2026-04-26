import axios from 'axios'

/**
 * Axios 实例
 * - baseURL: http://localhost:3000
 * - 统一错误拦截
 */
const apiClient = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    return config
  },
  (error: unknown) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error ?? error.message ?? '请求失败'
      return Promise.reject(new Error(message))
    }
    return Promise.reject(error)
  }
)

export default apiClient
