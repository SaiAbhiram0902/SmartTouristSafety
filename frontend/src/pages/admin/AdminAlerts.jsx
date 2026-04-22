import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, Search, X, Filter,
  ChevronDown, Clock, User, Navigation,
  TrendingUp, Zap, Info, ShieldAlert, CheckCircle, ExternalLink
} from 'lucide-react'
import api from '../../lib/api'
import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'

// ── Helpers ───────────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return '—'
  const str = ts.includes('T') ? ts : ts.replace(' ', 'T')
  const withTz = str.includes('+') || str.includes('Z') ? str : str + '+05:30'
  const diff = Math.floor((Date.now() - new Date(withTz).getTime()) / 1000)
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function formatFull(ts) {
  if (!ts) return '—'
  const str = ts.includes('T') ? ts : ts.replace(' ', 'T')
  const withTz = str.includes('+') || str.includes('Z') ? str : str + '+05:30'
  return new Date(withTz).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  })
}

const TYPE_CONFIG = {
  FALL:     { color: '#c0392b', bg: 'rgba(139,32,32,0.15)',  border: 'rgba(192,57,43,0.35)',  icon: ShieldAlert, label: 'FALL'     },
  SOS:      { color: '#c0392b', bg: 'rgba(139,32,32,0.15)',  border: 'rgba(192,57,43,0.35)',  icon: Zap,         label: 'SOS'      },
  CRITICAL: { color: '#c0392b', bg: 'rgba(139,32,32,0.15)',  border: 'rgba(192,57,43,0.35)',  icon: ShieldAlert, label: 'CRITICAL' },
  HIGH:     { color: '#d4a843', bg: 'rgba(122,92,30,0.15)',  border: 'rgba(212,168,67,0.35)', icon: AlertTriangle, label: 'HIGH'  },
  MEDIUM:   { color: '#d4a843', bg: 'rgba(122,92,30,0.15)',  border: 'rgba(212,168,67,0.35)', icon: AlertTriangle, label: 'MEDIUM'},
  OVERDUE:  { color: '#d4a843', bg: 'rgba(122,92,30,0.15)',  border: 'rgba(212,168,67,0.35)', icon: Clock,       label: 'OVERDUE'  },
  ZONE:     { color: '#2979ff', bg: 'rgba(26,58,92,0.15)',   border: 'rgba(41,121,255,0.35)', icon: Navigation,  label: 'ZONE'     },
  INFO:     { color: '#2979ff', bg: 'rgba(26,58,92,0.15)',   border: 'rgba(41,121,255,0.35)', icon: Info,        label: 'INFO'     },
}

function getConfig(type) {
  return TYPE_CONFIG[type?.toUpperCase()] || TYPE_CONFIG.INFO
}

const SEVERITY_ORDER = ['FALL', 'SOS', 'CRITICAL', 'HIGH', 'MEDIUM', 'OVERDUE', 'ZONE', 'INFO']

// ── Summary stat ─────────────────────────────────────────────────
function SummaryStat({ label, value, color, icon: Icon, onClick, active }) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, padding: '16px 18px',
        background: active ? `${color}18` : hovered ? '#112240' : '#0d1a2e',
        border: `1px solid ${active ? color + '44' : hovered ? color + '22' : 'rgba(255,255,255,0.06)'}`,
        borderTop: `2px solid ${color}`,
        borderRadius: '12px',
        display: 'flex', flexDirection: 'column', gap: '6px',
        cursor: 'pointer',
        transition: 'background 0.2s, border 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: active ? color : 'rgba(255,255,255,0.35)', letterSpacing: '1px', textTransform: 'uppercase', transition: 'color 0.2s' }}>
          {label}
        </span>
        <Icon size={13} color={active ? color : color + '88'} strokeWidth={2} />
      </div>
      <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '32px', color: '#ffffff', lineHeight: 1, letterSpacing: '1px' }}>
        {value}
      </span>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: active ? color : 'rgba(255,255,255,0.2)', letterSpacing: '0.5px', transition: 'color 0.2s' }}>
        {active ? 'FILTERING ✓' : 'CLICK TO FILTER'}
      </span>
    </motion.div>
  )
}

// ── Alert row ─────────────────────────────────────────────────────
function AlertRow({ alert, expanded, onToggle, isNew, onResolve, onViewTourist }) {
  const cfg = getConfig(alert.type)
  const Icon = cfg.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: isNew ? [1, 0.4, 1, 0.4, 1] : 1, x: 0 }}
      exit={{ opacity: 0, x: 40, height: 0, marginBottom: 0, overflow: 'hidden' }}
      transition={{ duration: isNew ? 0.8 : 0.2 }}
      style={{
        background: alert.resolved ? 'rgba(255,255,255,0.02)' : cfg.bg,
        border: `1px solid ${alert.resolved ? 'rgba(255,255,255,0.06)' : cfg.border}`,
        borderLeft: `3px solid ${alert.resolved ? 'rgba(255,255,255,0.15)' : cfg.color}`,
        borderRadius: '12px',
        marginBottom: '8px',
        overflow: 'hidden',
        cursor: 'pointer',
        opacity: alert.resolved ? 0.45 : 1,
      }}
      onClick={onToggle}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px' }}>
        {/* Icon */}
        <div style={{
          width: '34px', height: '34px', flexShrink: 0,
          borderRadius: '9px', background: `${cfg.color}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} color={cfg.color} strokeWidth={2} />
        </div>

        {/* Type + message */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{
              fontFamily: 'Outfit, sans-serif', fontSize: '10px',
              fontWeight: '700', color: alert.resolved ? 'rgba(255,255,255,0.25)' : cfg.color,
              letterSpacing: '1.2px', textTransform: 'uppercase',
            }}>
              {alert.resolved ? 'RESOLVED' : cfg.label}
            </span>
            {isNew && !alert.resolved && (
              <span style={{
                fontFamily: 'Inter, sans-serif', fontSize: '9px',
                background: '#c0392b', color: '#fff',
                padding: '1px 6px', borderRadius: '4px', letterSpacing: '0.5px',
              }}>
                NEW
              </span>
            )}
          </div>
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: '13px',
            color: 'rgba(255,255,255,0.8)', lineHeight: 1.4,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {alert.message}
          </p>
        </div>

        {/* Tourist ID — clickable to navigate */}
        {alert.touristId && (
          <button
            onClick={(e) => { e.stopPropagation(); onViewTourist(alert.touristId) }}
            style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '11px',
              color: 'rgba(0,229,204,0.7)', background: 'rgba(0,229,204,0.07)',
              padding: '3px 8px', borderRadius: '5px', flexShrink: 0,
              border: '1px solid rgba(0,229,204,0.15)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            {alert.touristId} <ExternalLink size={9} />
          </button>
        )}

        {/* Time */}
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: '11px',
          color: 'rgba(255,255,255,0.3)', flexShrink: 0, minWidth: '60px', textAlign: 'right',
        }}>
          {timeAgo(alert.timestamp)}
        </span>

        {/* Expand chevron */}
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} color="rgba(255,255,255,0.3)" />
        </motion.div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{    height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ borderTop: `1px solid ${cfg.border}` }}
          >
            <div style={{ padding: '14px 16px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ width: '100%' }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px', letterSpacing: '0.5px' }}>FULL MESSAGE</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, maxWidth: '500px' }}>{alert.message}</p>
              </div>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', width: '100%' }}>
                <div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '3px', letterSpacing: '0.5px' }}>TIMESTAMP (IST)</p>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{formatFull(alert.timestamp)}</p>
                </div>
                <div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '3px', letterSpacing: '0.5px' }}>ALERT ID</p>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>#{alert.id}</p>
                </div>
                <div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '3px', letterSpacing: '0.5px' }}>SEVERITY SCORE</p>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: cfg.color }}>{alert.severity ?? '—'}</p>
                </div>
                <div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '3px', letterSpacing: '0.5px' }}>STATUS</p>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: alert.resolved ? '#00e5cc' : cfg.color }}>
                    {alert.resolved ? `Resolved ${formatFull(alert.resolvedAt)}` : 'Open'}
                  </p>
                </div>
              </div>
              {/* Coordinates */}
              {(alert.latitude != null && alert.longitude != null) && (
                <div style={{ width: '100%' }}>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '3px', letterSpacing: '0.5px' }}>LOCATION AT ALERT</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                      {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${alert.latitude.toFixed(6)},${alert.longitude.toFixed(6)}`) }}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px 7px', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter, sans-serif', fontSize: '10px' }}
                    >
                      copy
                    </button>
                    <a
                      href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ background: 'rgba(41,121,255,0.08)', border: '1px solid rgba(41,121,255,0.2)', borderRadius: '4px', padding: '2px 7px', color: '#2979ff', fontFamily: 'Inter, sans-serif', fontSize: '10px', textDecoration: 'none' }}
                    >
                      maps ↗
                    </a>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%', marginTop: '4px' }} onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => onViewTourist(alert.touristId)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', border: '1px solid rgba(0,229,204,0.25)', background: 'rgba(0,229,204,0.07)', color: '#00e5cc', fontFamily: 'Outfit, sans-serif', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                >
                  <ExternalLink size={11} /> View Tourist
                </button>
                {!alert.resolved && (
                  <button
                    onClick={() => onResolve(alert.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', border: '1px solid rgba(0,229,204,0.3)', background: 'rgba(0,229,204,0.1)', color: '#00e5cc', fontFamily: 'Outfit, sans-serif', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    <CheckCircle size={11} /> Mark as Resolved
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function AdminAlerts() {
  const navigate = useNavigate()
  const [alerts,      setAlerts]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [typeFilter,  setTypeFilter]  = useState('ALL')
  const [statFilter,  setStatFilter]  = useState(null)
  const [sortBy,      setSortBy]      = useState('newest')
  const [expandedId,        setExpandedId]        = useState(null)
  const [newAlertIds,       setNewAlertIds]       = useState(new Set())
  const [unresolvedOnly,    setUnresolvedOnly]    = useState(false)

  const resolveAlert = useCallback(async (id) => {
    try {
      const res = await api.patch(`/alerts/${id}/resolve`)
      setAlerts(prev => prev.map(a => a.id === id ? res.data : a))
      setExpandedId(prev => prev === id ? null : prev)
    } catch (err) {
      console.error('Failed to resolve alert', err)
    }
  }, [])

  const viewTourist = useCallback((touristId) => {
    navigate(`/admin/tourists/${touristId}`)
  }, [navigate])

  function toggleStatFilter(key) {
    setStatFilter(prev => prev === key ? null : key)
    setTypeFilter('ALL')
  }

  // ── Fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/alerts')
       .then(r => {
         const sorted = [...r.data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
         setAlerts(sorted)
       })
       .catch(console.error)
       .finally(() => setLoading(false))
  }, [])

  // ── WebSocket ─────────────────────────────────────────────────
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      onConnect: () => {
        client.subscribe('/topic/alerts', (msg) => {
          const incoming = JSON.parse(msg.body)
          setAlerts(prev => {
            const exists = prev.some(a => a.id === incoming.id)
            if (exists) {
              return prev.map(a => a.id === incoming.id ? incoming : a)
            }
            if (!incoming.resolved) {
              setNewAlertIds(p => new Set([...p, incoming.id]))
              setTimeout(() => {
                setNewAlertIds(p => { const n = new Set(p); n.delete(incoming.id); return n })
              }, 5000)
              return [incoming, ...prev]
            }
            return prev
          })
        })
      },
      reconnectDelay: 5000,
    })
    client.activate()
    return () => client.deactivate()
  }, [])

  // ── Export CSV ────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      ['ID', 'Tourist ID', 'Type', 'Severity', 'Message', 'Timestamp', 'Status'],
      ...alerts.map(a => [
        a.id,
        a.touristId,
        a.type,
        a.severity,
        '"' + (a.message ?? '').replace(/"/g, '""') + '"',
        a.timestamp
          ? new Date(a.timestamp + (a.timestamp.endsWith('Z') ? '' : '+05:30')).toLocaleString('en-IN')
          : '',
        a.resolved ? 'Resolved' : 'Open',
      ])
    ]
    const csv  = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href     = url
    link.download = 'toursafe-alerts-' + new Date().toISOString().slice(0, 10) + '.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  // ── Filtering + sorting ───────────────────────────────────────
  const filtered = alerts
    .filter(a => {
      const t = a.type?.toUpperCase()
      const matchStat =
        !statFilter ||
        (statFilter === 'critical' && ['FALL','SOS','CRITICAL'].includes(t)) ||
        (statFilter === 'warnings' && ['HIGH','MEDIUM','OVERDUE'].includes(t)) ||
        (statFilter === 'info'     && ['ZONE'].includes(t))
      const matchType     = typeFilter === 'ALL' || t === typeFilter
      const matchSearch   = a.message?.toLowerCase().includes(search.toLowerCase()) ||
                            a.touristId?.toLowerCase().includes(search.toLowerCase())
      const matchResolved = !unresolvedOnly || !a.resolved
      return matchStat && matchType && matchSearch && matchResolved
    })
    .sort((a, b) => {
      if (sortBy === 'newest')   return new Date(b.timestamp) - new Date(a.timestamp)
      if (sortBy === 'oldest')   return new Date(a.timestamp) - new Date(b.timestamp)
      if (sortBy === 'severity') return SEVERITY_ORDER.indexOf(a.type?.toUpperCase()) - SEVERITY_ORDER.indexOf(b.type?.toUpperCase())
      return 0
    })

  // ── Summary counts ────────────────────────────────────────────
  const critical   = alerts.filter(a => ['FALL','SOS','CRITICAL'].includes(a.type?.toUpperCase())).length
  const warnings   = alerts.filter(a => ['HIGH','MEDIUM','OVERDUE'].includes(a.type?.toUpperCase())).length
  const info       = alerts.filter(a => ['ZONE'].includes(a.type?.toUpperCase())).length
  const unresolved = alerts.filter(a => !a.resolved).length

  const typeFilters = ['ALL', 'FALL', 'SOS', 'CRITICAL', 'HIGH', 'MEDIUM', 'OVERDUE', 'ZONE']

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px', gap: '20px', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ flexShrink: 0 }}>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>
          Alert History
        </h1>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
          {alerts.length} total alerts · live updates via WebSocket
        </p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
        <SummaryStat label="Total Alerts"   value={alerts.length} color="#00e5cc"  icon={TrendingUp}    onClick={() => { setStatFilter(null); setTypeFilter('ALL') }} active={!statFilter} />
        <SummaryStat label="Critical / SOS" value={critical}      color="#c0392b"  icon={ShieldAlert}   onClick={() => toggleStatFilter('critical')} active={statFilter === 'critical'} />
        <SummaryStat label="Warnings"       value={warnings}      color="#d4a843"  icon={AlertTriangle} onClick={() => toggleStatFilter('warnings')} active={statFilter === 'warnings'} />
        <SummaryStat label="Zone Breaches"  value={info}          color="#2979ff"  icon={Info}          onClick={() => toggleStatFilter('info')}     active={statFilter === 'info'}     />
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0d1a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '9px 13px', flex: 1, minWidth: '200px' }}>
          <Search size={13} color="rgba(255,255,255,0.25)" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search alerts or tourist ID..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#ffffff' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px' }}><X size={12} color="rgba(255,255,255,0.3)" /></button>}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Unresolved toggle */}
          <button
            onClick={() => setUnresolvedOnly(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: unresolvedOnly ? 'rgba(239,68,68,0.1)' : '#0d1a2e',
              border: `1px solid ${unresolvedOnly ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '10px', padding: '9px 13px', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', fontSize: '12px',
              color: unresolvedOnly ? '#ef4444' : 'rgba(255,255,255,0.4)',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
          >
            <CheckCircle size={12} />
            Unresolved{unresolved > 0 && ` (${unresolved})`}
          </button>

          {/* Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0d1a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '9px 13px' }}>
            <Filter size={12} color="rgba(255,255,255,0.3)" />
            <select
              value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
            >
              <option value="newest"   style={{ background: '#0d1a2e' }}>Newest first</option>
              <option value="oldest"   style={{ background: '#0d1a2e' }}>Oldest first</option>
              <option value="severity" style={{ background: '#0d1a2e' }}>By severity</option>
            </select>
          </div>

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#0d1a2e', border: '1px solid rgba(0,229,204,0.2)',
              borderRadius: '10px', padding: '9px 14px', cursor: 'pointer',
              color: '#00e5cc', fontFamily: 'Inter, sans-serif', fontSize: '12px',
              fontWeight: '600', whiteSpace: 'nowrap',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Type filter pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
        {typeFilters.map(type => {
          const cfg   = type === 'ALL' ? null : getConfig(type)
          const count = type === 'ALL' ? alerts.length : alerts.filter(a => a.type?.toUpperCase() === type).length
          const active = typeFilter === type
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              style={{
                padding: '5px 12px', borderRadius: '20px', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: '500',
                background: active ? (cfg ? `${cfg.color}22` : 'rgba(0,229,204,0.12)') : 'rgba(255,255,255,0.04)',
                border: `1px solid ${active ? (cfg ? cfg.border : 'rgba(0,229,204,0.3)') : 'rgba(255,255,255,0.08)'}`,
                color: active ? (cfg ? cfg.color : '#00e5cc') : 'rgba(255,255,255,0.4)',
                transition: 'all 0.15s',
              }}
            >
              {type} {count > 0 && <span style={{ opacity: 0.6 }}>({count})</span>}
            </button>
          )
        })}
      </div>

      {/* Alert list */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '60px' }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.2)' }}>Loading alerts...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '60px' }}>
            <TrendingUp size={28} color="rgba(0,229,204,0.15)" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.2)' }}>No alerts match your filters</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map(alert => (
              <AlertRow
                key={alert.id}
                alert={alert}
                expanded={expandedId === alert.id}
                onToggle={() => setExpandedId(prev => prev === alert.id ? null : alert.id)}
                onResolve={resolveAlert}
                onViewTourist={viewTourist}
                isNew={newAlertIds.has(alert.id)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}