import { useState } from 'react'
import api from '../api'
import './LoginPage.css'

function LoginPage({ onLogin }) {
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await api.post('/api/login', {
        passphrase: passphrase
      })

      if (response.status === 200) {
        // ログイン成功
        localStorage.setItem('token', response.data.token)
        onLogin()
      }
    } catch (err) {
      setError(err.response?.data?.message || 'ログインに失敗しました')
    } finally {
      setIsLoading(false)
      setPassphrase('')
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>車割りアプリ</h1>
        <p className="subtitle">合言葉を入力してください</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="password"
              placeholder="合言葉を入力"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            disabled={isLoading || !passphrase.trim()}
            className="login-button"
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
