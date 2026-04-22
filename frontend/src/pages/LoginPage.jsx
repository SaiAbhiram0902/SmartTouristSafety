import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const login    = useAuthStore((s) => s.login)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { username, password })
      login(res.data)
      if (res.data.role === 'ADMIN') {
        navigate('/admin/dashboard')
      } else {
        navigate('/user/home')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Inter, sans-serif',
    }}>

      {/* Background — nature photography via Unsplash (free, no key needed) */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'url(https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'brightness(0.45)',
      }} />

      {/* Warm gradient overlay for depth */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, rgba(10,20,10,0.7) 0%, rgba(30,50,20,0.4) 50%, rgba(10,20,10,0.8) 100%)',
      }} />

      {/* Left side — branding */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '60px',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {/* Logo mark */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '32px',
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(212,168,67,0.2)',
              border: '1px solid rgba(212,168,67,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z"
                      fill="#d4a843" opacity="0.9" />
                <path d="M9 12l2 2 4-4" stroke="#1a2e1a" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ fontSize: '18px', fontWeight: '600', color: 'rgba(255,255,255,0.9)', letterSpacing: '0.5px' }}>
              TourSafe
            </span>
          </div>

          <h1 style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: '52px',
            fontWeight: '700',
            color: '#ffffff',
            lineHeight: 1.15,
            marginBottom: '20px',
            maxWidth: '480px',
          }}>
            Every trail,<br />every tourist,<br />
            <span style={{ color: '#d4a843' }}>always safe.</span>
          </h1>

          <p style={{
            fontSize: '16px',
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.7,
            maxWidth: '380px',
          }}>
            Real-time tracking and intelligent safety monitoring for trekking destinations.
          </p>

          {/* Stats row */}
          <div style={{
            display: 'flex',
            gap: '40px',
            marginTop: '48px',
          }}>
            {[
              { value: 'Live', label: 'GPS Tracking' },
              { value: 'AI', label: 'Fall Detection' },
              { value: '24/7', label: 'Monitoring' },
            ].map((stat) => (
              <div key={stat.label}>
                <p style={{ fontSize: '22px', fontWeight: '700', color: '#d4a843', fontFamily: 'Playfair Display, serif' }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', letterSpacing: '0.5px' }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right side — login form */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '460px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 40px',
      }}>
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          style={{ width: '100%' }}
        >
          {/* Card */}
          <div style={{
            background: 'rgba(15, 25, 15, 0.75)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(212,168,67,0.15)',
            borderRadius: '24px',
            padding: '44px 40px',
          }}>
            {/* Card header */}
            <div style={{ marginBottom: '36px' }}>
              <h2 style={{
                fontFamily: 'Playfair Display, Georgia, serif',
                fontSize: '28px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '8px',
              }}>
                Welcome back
              </h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                Sign in to access your dashboard
              </p>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Username field */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: '600',
                  letterSpacing: '1.2px',
                  color: 'rgba(212,168,67,0.8)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                }}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    color: '#ffffff',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    outline: 'none',
                    fontFamily: 'Inter, sans-serif',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(212,168,67,0.6)'
                    e.target.style.background   = 'rgba(255,255,255,0.09)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.1)'
                    e.target.style.background   = 'rgba(255,255,255,0.06)'
                  }}
                />
              </div>

              {/* Password field */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: '600',
                  letterSpacing: '1.2px',
                  color: 'rgba(212,168,67,0.8)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    color: '#ffffff',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    outline: 'none',
                    fontFamily: 'Inter, sans-serif',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(212,168,67,0.6)'
                    e.target.style.background   = 'rgba(255,255,255,0.09)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.1)'
                    e.target.style.background   = 'rgba(255,255,255,0.06)'
                  }}
                />
              </div>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(180,50,50,0.15)',
                    border: '1px solid rgba(180,50,50,0.3)',
                    color: '#ff8a80',
                    fontSize: '13px',
                  }}
                >
                  {error}
                </motion.div>
              )}

              {/* Sign in button */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.015 }}
                whileTap={{ scale: loading ? 1 : 0.985 }}
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '15px',
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '0.3px',
                  background: loading
                    ? 'rgba(212,168,67,0.2)'
                    : 'linear-gradient(135deg, #d4a843, #a67c2e)',
                  color: loading ? 'rgba(212,168,67,0.5)' : '#0f1f0f',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  border: 'none',
                  marginTop: '6px',
                  boxShadow: loading ? 'none' : '0 4px 24px rgba(212,168,67,0.25)',
                  transition: 'box-shadow 0.2s',
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </motion.button>
            </form>

            {/* Demo credentials */}
            <div style={{
              marginTop: '32px',
              paddingTop: '28px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
            }}>
              <p style={{
                fontSize: '10px',
                textAlign: 'center',
                letterSpacing: '1.5px',
                color: 'rgba(255,255,255,0.25)',
                marginBottom: '16px',
                textTransform: 'uppercase',
              }}>
                Demo Access
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{
                  padding: '14px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  background: 'rgba(0,229,204,0.04)',
                  border: '1px solid rgba(0,229,204,0.1)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                  onClick={() => { setUsername('admin'); setPassword('admin123') }}
                  title="Click to autofill"
                >
                  <p style={{ fontSize: '10px', fontWeight: '700', color: '#00e5cc', letterSpacing: '1.5px', marginBottom: '5px' }}>
                    ADMIN
                  </p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                    admin / admin123
                  </p>
                </div>
                <div style={{
                  padding: '14px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  background: 'rgba(127,176,105,0.04)',
                  border: '1px solid rgba(127,176,105,0.1)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                  onClick={() => { setUsername('user'); setPassword('user123') }}
                  title="Click to autofill"
                >
                  <p style={{ fontSize: '10px', fontWeight: '700', color: '#7fb069', letterSpacing: '1.5px', marginBottom: '5px' }}>
                    USER
                  </p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                    user / user123
                  </p>
                </div>
              </div>
              <p style={{ fontSize: '10px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', marginTop: '10px' }}>
                Click a card to autofill credentials
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
