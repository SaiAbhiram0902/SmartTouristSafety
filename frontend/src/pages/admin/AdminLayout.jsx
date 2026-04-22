import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, AlertTriangle, Hexagon,
  MapPin, LogOut, Shield, Bell, Clock, UserPlus,
  ShieldAlert, Zap, X, Activity,
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { useState, useEffect, useRef, useCallback } from 'react'
import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'

const navItems = [
  { path: '/admin/dashboard',      label: 'Dashboard',   icon: LayoutDashboard },
  { path: '/admin/tourists',       label: 'Tourists',    icon: Users           },
  { path: '/admin/create-tourist', label: 'Add Tourist', icon: UserPlus        },
  { path: '/admin/alerts',         label: 'Alerts',      icon: AlertTriangle   },
  { path: '/admin/zones',          label: 'Zones',       icon: Hexagon         },
  { path: '/admin/hotspots',       label: 'Hotspots',    icon: MapPin          },
]

const TOAST_CONFIG = {
  FALL:     { color: '#c0392b', bg: 'rgba(139,32,32,0.95)',  icon: ShieldAlert,   pulse: true  },
  SOS:      { color: '#c0392b', bg: 'rgba(139,32,32,0.95)',  icon: Zap,           pulse: true  },
  CRITICAL: { color: '#c0392b', bg: 'rgba(139,32,32,0.95)',  icon: ShieldAlert,   pulse: true  },
  OVERDUE:  { color: '#d4a843', bg: 'rgba(100,70,10,0.95)',  icon: Clock,         pulse: false },
  HIGH:     { color: '#d4a843', bg: 'rgba(100,70,10,0.95)',  icon: AlertTriangle, pulse: false },
  MEDIUM:   { color: '#d4a843', bg: 'rgba(100,70,10,0.95)',  icon: AlertTriangle, pulse: false },
  ZONE:     { color: '#2979ff', bg: 'rgba(20,40,90,0.95)',   icon: MapPin,        pulse: false },
}

function getToastCfg(type) {
  return TOAST_CONFIG[type?.toUpperCase()] || TOAST_CONFIG.MEDIUM
}

// ── Global toast overlay ──────────────────────────────────────────
function ToastStack({ toasts, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', top: '80px', right: '20px',
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px',
      pointerEvents: 'none',
    }}>
      <AnimatePresence>
        {toasts.map(toast => {
          const cfg  = getToastCfg(toast.type)
          const Icon = cfg.icon
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0,  scale: 1   }}
              exit={{    opacity: 0, x: 80, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                width: '340px', pointerEvents: 'all',
                background: cfg.bg,
                border: `1px solid ${cfg.color}55`,
                borderLeft: `4px solid ${cfg.color}`,
                borderRadius: '14px',
                boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${cfg.color}22`,
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px 8px' }}>
                {/* Pulsing icon for critical */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {cfg.pulse && (
                    <div style={{
                      position: 'absolute', inset: '-4px',
                      borderRadius: '50%', border: `2px solid ${cfg.color}`,
                      animation: 'toastPulse 1s ease-out infinite',
                    }} />
                  )}
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `${cfg.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={15} color={cfg.color} />
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '12px', fontWeight: '800', color: cfg.color, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                      {toast.type}
                    </span>
                    {toast.touristId && (
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: '4px' }}>
                        {toast.touristId}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onDismiss(toast.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0 }}
                >
                  <X size={14} color="rgba(255,255,255,0.4)" />
                </button>
              </div>

              {/* Message */}
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, padding: '0 14px 10px', margin: 0 }}>
                {toast.message}
              </p>

              {/* Special needs warning strip */}
              {toast.specialNeeds && (
                <div style={{ padding: '0 14px 10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {toast.specialNeeds.map(tag => (
                    <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.12)', padding: '2px 8px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)' }}>
                      <ShieldAlert size={9} strokeWidth={2.5} /> {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Progress bar */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 7, ease: 'linear' }}
                style={{ height: '3px', background: cfg.color, transformOrigin: 'left', opacity: 0.6 }}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Pulse keyframe */}
      <style>{`
        @keyframes toastPulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0;   }
        }
      `}</style>
    </div>
  )
}

function LiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: 'rgba(0,229,204,0.7)', letterSpacing: '1px' }}>
      {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata' })} IST
    </span>
  )
}

export default function AdminLayout() {
  const navigate              = useNavigate()
  const location              = useLocation()
  const { username, logout }  = useAuthStore()
  const [expanded, setExpanded]     = useState(false)
  const [toasts,   setToasts]       = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const touristCacheRef = useRef({}) // cache tourist data for special needs lookup

  // ── Dismiss toast ─────────────────────────────────────────────
  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── Global WebSocket ──────────────────────────────────────────
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      onConnect: () => {
        client.subscribe('/topic/alerts', async (msg) => {
          const alert = JSON.parse(msg.body)

          // Look up tourist for special needs tags
          let specialNeeds = null
          try {
            let tourist = touristCacheRef.current[alert.touristId]
            if (!tourist) {
              const res = await fetch(`/api/tourists/${alert.touristId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
              })
              if (res.ok) {
                tourist = await res.json()
                touristCacheRef.current[alert.touristId] = tourist
              }
            }
            if (tourist) {
              const tags = []
              if (tourist.child)       tags.push('CHILD')
              if (tourist.elder)       tags.push('SENIOR')
              if (tourist.handicapped) tags.push('SPECIAL NEEDS')
              if (tags.length) specialNeeds = tags
            }
          } catch (_) {}

          const toastId = `${alert.id}-${Date.now()}`
          setToasts(prev => [
            { ...alert, id: toastId, specialNeeds },
            ...prev.slice(0, 3), // max 4 toasts
          ])
          setUnreadCount(c => c + 1)

          // Auto-dismiss after 7s
          setTimeout(() => dismissToast(toastId), 7000)
        })
      },
      reconnectDelay: 5000,
    })
    client.activate()
    return () => client.deactivate()
  }, [dismissToast])

  const currentPage = navItems.find(n => location.pathname.startsWith(n.path))?.label || 'Dashboard'

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#060d18' }}>

      {/* ── Global alert toasts ──────────────────────────────────── */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ width: 68 }} animate={{ width: expanded ? 220 : 68 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: '#0d1a2e',
          borderRight: '1px solid rgba(0,229,204,0.07)',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 20,
        }}
      >
        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '22px 18px',
          borderBottom: '1px solid rgba(0,229,204,0.07)',
          minHeight: '68px',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            flexShrink: 0,
            borderRadius: '9px',
            background: 'linear-gradient(135deg, rgba(0,229,204,0.15), rgba(41,121,255,0.15))',
            border: '1px solid rgba(0,229,204,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Shield size={16} color="#00e5cc" strokeWidth={2} />
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                style={{
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: '700',
                  fontSize: '16px',
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.3px',
                }}
              >
                TourSafe
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname.startsWith(path)
            return (
              <NavLink key={path} to={path} style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ x: 2 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 10px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background:  isActive ? 'rgba(0,229,204,0.08)' : 'transparent',
                    borderLeft:  isActive ? '2px solid #00e5cc'    : '2px solid transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    color={isActive ? '#00e5cc' : 'rgba(255,255,255,0.4)'}
                    style={{ flexShrink: 0 }}
                  />
                  <AnimatePresence>
                    {expanded && (
                      <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.15 }}
                        style={{
                          fontFamily: 'Syne, sans-serif',
                          fontSize: '13px',
                          fontWeight: isActive ? '600' : '400',
                          color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)',
                          whiteSpace: 'nowrap',
                          letterSpacing: '0.2px',
                        }}
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </NavLink>
            )
          })}
        </nav>

        {/* Bottom — user + logout */}
        <div style={{
          padding: '10px 10px 18px',
          borderTop: '1px solid rgba(0,229,204,0.07)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          {/* Avatar row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              flexShrink: 0,
              borderRadius: '50%',
              background: 'rgba(0,229,204,0.12)',
              border: '1px solid rgba(0,229,204,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Syne, sans-serif',
              fontSize: '13px',
              fontWeight: '700',
              color: '#00e5cc',
            }}>
              {username?.[0]?.toUpperCase()}
            </div>
            <AnimatePresence>
              {expanded && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.5)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {username}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Logout */}
          <motion.div
            whileHover={{ x: 2 }}
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 10px',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,80,80,0.07)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={18} strokeWidth={1.8} color="rgba(255,100,100,0.5)" style={{ flexShrink: 0 }} />
            <AnimatePresence>
              {expanded && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    fontFamily: 'Syne, sans-serif',
                    fontSize: '13px',
                    color: 'rgba(255,100,100,0.6)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Main area ───────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top header bar */}
        <div style={{
          height: '68px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          background: '#060d18',
          borderBottom: '1px solid rgba(0,229,204,0.07)',
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: '0.3px',
            }}>
              ADMIN
            </span>
            <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '12px' }}>/</span>
            <span style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: '13px',
              fontWeight: '600',
              color: 'rgba(255,255,255,0.75)',
              letterSpacing: '0.3px',
            }}>
              {currentPage.toUpperCase()}
            </span>
          </div>

          {/* Right side — clock + notification + avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Clock size={13} color="rgba(0,229,204,0.5)" strokeWidth={1.8} />
              <LiveClock />
            </div>

            <div
              style={{ position: 'relative', cursor: 'pointer' }}
              onClick={() => { navigate('/admin/alerts'); setUnreadCount(0) }}
            >
              <Bell size={18} color={unreadCount > 0 ? '#ff4444' : 'rgba(255,255,255,0.35)'} strokeWidth={1.8} />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    style={{
                      position: 'absolute', top: '-6px', right: '-8px',
                      minWidth: '16px', height: '16px', borderRadius: '8px',
                      background: '#ff4444', border: '1.5px solid #060d18',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 3px',
                    }}
                  >
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: '700', color: '#fff' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(0,229,204,0.12)',
              border: '1px solid rgba(0,229,204,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Syne, sans-serif',
              fontSize: '13px',
              fontWeight: '700',
              color: '#00e5cc',
              cursor: 'pointer',
            }}>
              {username?.[0]?.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{ height: '100%' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
