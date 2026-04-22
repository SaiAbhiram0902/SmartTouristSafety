import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X, User, Phone, Clock,
  CheckCircle, ChevronRight, Users, Shield,
  MapPin, UserCheck, UserPlus, ExternalLink,
  Baby, PersonStanding, Accessibility, Trash2,
} from 'lucide-react'
import api from '../../lib/api'
import { useNavigate } from 'react-router-dom'

// ── Special needs badges ──────────────────────────────────────────
function SpecialBadges({ tourist, size = 'sm' }) {
  const badges = []
  if (tourist.child)       badges.push({ icon: Baby,              label: 'Child',         color: '#d4a843', bg: 'rgba(212,168,67,0.1)',  border: 'rgba(212,168,67,0.25)'  })
  if (tourist.elder)       badges.push({ icon: PersonStanding,    label: 'Senior',        color: '#2979ff', bg: 'rgba(41,121,255,0.1)',  border: 'rgba(41,121,255,0.25)'  })
  if (tourist.handicapped) badges.push({ icon: Accessibility,     label: 'Special Needs', color: '#00e5cc', bg: 'rgba(0,229,204,0.08)', border: 'rgba(0,229,204,0.2)'    })
  if (!badges.length) return null
  const pad  = size === 'sm' ? '2px 7px'  : '3px 10px'
  const fs   = size === 'sm' ? '10px'     : '11px'
  const iSz  = size === 'sm' ? 10         : 12
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {badges.map(({ icon: Icon, label, color, bg, border }) => (
        <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: pad, borderRadius: '20px', background: bg, border: `1px solid ${border}`, fontFamily: 'Inter, sans-serif', fontSize: fs, fontWeight: '600', color, letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
          <Icon size={iSz} strokeWidth={2} />
          {label}
        </span>
      ))}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return 'never'
  // Backend stores LocalDateTime as IST — append +05:30 so JS parses correctly
  const str = ts.includes('T') ? ts : ts.replace(' ', 'T')
  const withTz = str.includes('+') || str.includes('Z') ? str : str + '+05:30'
  const diff = Math.floor((Date.now() - new Date(withTz).getTime()) / 1000)
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

function formatDate(ts) {
  if (!ts) return '—'
  const str = ts.includes('T') ? ts : ts.replace(' ', 'T')
  const withTz = str.includes('+') || str.includes('Z') ? str : str + '+05:30'
  return new Date(withTz).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

const SEVERITY_COLORS = {
  FALL: '#c0392b', SOS: '#c0392b', CRITICAL: '#c0392b',
  HIGH: '#d4a843', MEDIUM: '#d4a843', OVERDUE: '#d4a843',
  ZONE: '#2979ff', INFO: '#2979ff',
}

// ── Tourist card ──────────────────────────────────────────────────
function TouristCard({ tourist, onClick, selected }) {
  const [hovered, setHovered] = useState(false)
  const isActive = tourist.active

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      onClick={() => onClick(tourist)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected ? '#1a3050' : hovered ? '#112240' : '#0d1a2e',
        border: `1px solid ${selected ? 'rgba(0,229,204,0.4)' : hovered ? 'rgba(0,229,204,0.15)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '14px', padding: '20px',
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        transition: 'background 0.2s, border 0.2s',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: isActive ? '#00e5cc' : 'rgba(255,255,255,0.1)' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        <div style={{
          width: '48px', height: '48px', flexShrink: 0,
          borderRadius: '12px', overflow: 'hidden',
          background: 'rgba(0,229,204,0.08)',
          border: `1px solid ${isActive ? 'rgba(0,229,204,0.2)' : 'rgba(255,255,255,0.08)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {tourist.photoUrl
            ? <img src={`${tourist.photoUrl}`} alt={tourist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
            : <User size={20} color="rgba(0,229,204,0.4)" />
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '14px', fontWeight: '600', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px' }}>
            {tourist.name}
          </p>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(0,229,204,0.6)', background: 'rgba(0,229,204,0.07)', padding: '2px 7px', borderRadius: '4px' }}>
            {tourist.touristId}
          </span>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '4px 10px', borderRadius: '20px',
          background: isActive ? 'rgba(0,229,204,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isActive ? 'rgba(0,229,204,0.2)' : 'rgba(255,255,255,0.08)'}`,
          flexShrink: 0,
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? '#00e5cc' : 'rgba(255,255,255,0.2)', boxShadow: isActive ? '0 0 6px #00e5cc' : 'none' }} />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: isActive ? '#00e5cc' : 'rgba(255,255,255,0.3)', fontWeight: '500' }}>
            {isActive ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>
      </div>

        {/* Special needs + date row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', gap: '8px' }}>
          <SpecialBadges tourist={tourist} size="sm" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            <Clock size={11} color="rgba(255,255,255,0.25)" />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{formatDate(tourist.registeredAt)}</span>
          </div>
        </div>

      <motion.div animate={{ x: hovered ? 3 : 0, opacity: hovered ? 1 : 0 }} style={{ position: 'absolute', right: '16px', bottom: '16px' }}>
        <ChevronRight size={14} color="rgba(0,229,204,0.5)" />
      </motion.div>
    </motion.div>
  )
}

// ── Group card ────────────────────────────────────────────────────
function GroupCard({ leader, members, allTourists, onClick }) {
  const [hovered, setHovered] = useState(false)
  const everyone      = [leader, ...members].filter(Boolean)
  const activeMembers = everyone.filter(m => m.active).length
  const totalMembers  = everyone.length

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      onClick={() => onClick(leader, members)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#112240' : '#0d1a2e',
        border: `1px solid ${hovered ? 'rgba(0,229,204,0.15)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '14px', padding: '20px',
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        transition: 'background 0.2s, border 0.2s',
      }}
    >
      {/* Top accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: activeMembers > 0 ? 'linear-gradient(90deg, #00e5cc, #2979ff)' : 'rgba(255,255,255,0.1)' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{
          width: '44px', height: '44px', flexShrink: 0,
          borderRadius: '12px', background: 'rgba(0,229,204,0.08)',
          border: '1px solid rgba(0,229,204,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Users size={18} color="rgba(0,229,204,0.6)" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '14px', fontWeight: '700', color: '#ffffff', marginBottom: '2px' }}>
            {leader?.name}'s Group
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            Led by <span style={{ color: 'rgba(0,229,204,0.7)' }}>{leader?.name}</span>
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '24px', color: '#ffffff', lineHeight: 1 }}>
            {totalMembers}
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>members</p>
        </div>
      </div>

      {/* Member avatars */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '-8px' }}>
        {/* Leader first */}
        {[leader, ...members].slice(0, 5).map((member, i) => (
          <div
            key={member?.touristId}
            title={member?.name}
            style={{
              width: '32px', height: '32px',
              borderRadius: '50%', overflow: 'hidden',
              border: '2px solid #0d1a2e',
              background: 'rgba(0,229,204,0.1)',
              marginLeft: i === 0 ? 0 : '-8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 5 - i,
              position: 'relative',
            }}
          >
            {member?.photoUrl
              ? <img src={`${member.photoUrl}`} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
              : <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '11px', fontWeight: '700', color: '#00e5cc' }}>{member?.name?.[0]}</span>
            }
          </div>
        ))}
        {totalMembers > 5 && (
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #0d1a2e', background: 'rgba(255,255,255,0.06)', marginLeft: '-8px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 0 }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>+{totalMembers - 5}</span>
          </div>
        )}

        {/* Active count */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: activeMembers > 0 ? '#00e5cc' : 'rgba(255,255,255,0.2)', boxShadow: activeMembers > 0 ? '0 0 6px #00e5cc' : 'none' }} />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: activeMembers > 0 ? '#00e5cc' : 'rgba(255,255,255,0.3)' }}>
            {activeMembers} active
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Group detail modal ────────────────────────────────────────────
function GroupModal({ leader, members, onClose, onSelectTourist }) {
  const everyone = [leader, ...members].filter(Boolean)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(6,13,24,0.85)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0d1a2e',
          border: '1px solid rgba(0,229,204,0.15)',
          borderRadius: '20px',
          width: '100%', maxWidth: '560px',
          maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal header */}
        <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid rgba(0,229,204,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>
              {leader?.name}'s Group
            </h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
              {everyone.length} members · {everyone.filter(t => t.active).length} active on trek
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={18} color="rgba(255,255,255,0.4)" />
          </button>
        </div>

        {/* Members list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {everyone.map((member, i) => (
            <motion.div
              key={member.touristId}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => { onSelectTourist(member); onClose() }}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px', borderRadius: '12px', marginBottom: '8px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,204,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            >
              {/* Avatar */}
              <div style={{ width: '42px', height: '42px', flexShrink: 0, borderRadius: '10px', overflow: 'hidden', background: 'rgba(0,229,204,0.08)', border: '1px solid rgba(0,229,204,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {member.photoUrl
                  ? <img src={`${member.photoUrl}`} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
                  : <User size={18} color="rgba(0,229,204,0.4)" />
                }
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>
                    {member.name}
                  </p>
                  {!member.parentId && (
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: '600', color: '#d4a843', background: 'rgba(212,168,67,0.1)', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.5px' }}>
                      LEADER
                    </span>
                  )}
                </div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(0,229,204,0.5)' }}>
                  {member.touristId}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: member.active ? '#00e5cc' : 'rgba(255,255,255,0.2)', boxShadow: member.active ? '0 0 5px #00e5cc' : 'none' }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: member.active ? '#00e5cc' : 'rgba(255,255,255,0.3)' }}>
                  {member.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <ChevronRight size={14} color="rgba(255,255,255,0.2)" />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Detail panel ──────────────────────────────────────────────────
function DetailPanel({ tourist, onClose }) {
  const navigate = useNavigate()
  const [alerts,        setAlerts]        = useState([])
  const [dashData,      setDashData]      = useState(null)
  const [activeTab,     setActiveTab]     = useState('profile')
  const [loadingAlerts, setLoadingAlerts] = useState(true)

  useEffect(() => {
    if (!tourist) return
    setLoadingAlerts(true)
    setActiveTab('profile')
    api.get(`/alerts/${tourist.touristId}`)
       .then(r => setAlerts(r.data)).catch(() => setAlerts([]))
       .finally(() => setLoadingAlerts(false))
    api.get(`/tourists/${tourist.touristId}/dashboard`)
       .then(r => setDashData(r.data)).catch(() => setDashData(null))
  }, [tourist?.touristId])

  if (!tourist) return null

  return (
    <motion.div
      key={tourist.touristId}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{    opacity: 0, x: 40 }}
      transition={{ duration: 0.25 }}
      style={{ width: '360px', flexShrink: 0, background: '#0d1a2e', border: '1px solid rgba(0,229,204,0.1)', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid rgba(0,229,204,0.07)', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        <div style={{ width: '60px', height: '60px', flexShrink: 0, borderRadius: '14px', overflow: 'hidden', background: 'rgba(0,229,204,0.08)', border: '1px solid rgba(0,229,204,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {tourist.photoUrl
            ? <img src={`${tourist.photoUrl}`} alt={tourist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
            : <User size={26} color="rgba(0,229,204,0.4)" />
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>{tourist.name}</p>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(0,229,204,0.7)', background: 'rgba(0,229,204,0.07)', padding: '2px 8px', borderRadius: '4px' }}>{tourist.touristId}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: tourist.active ? '#00e5cc' : 'rgba(255,255,255,0.2)', boxShadow: tourist.active ? '0 0 6px #00e5cc' : 'none' }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: tourist.active ? '#00e5cc' : 'rgba(255,255,255,0.3)' }}>
              {tourist.active ? 'Active on trek' : 'Checked out'}
            </span>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0 }}>
          <X size={16} color="rgba(255,255,255,0.3)" />
        </button>
      </div>

      {/* View full profile link */}
      <button
        onClick={() => navigate(`/admin/tourists/${tourist.touristId}`)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '9px', background: 'rgba(0,229,204,0.06)', border: '1px solid rgba(0,229,204,0.12)', borderRadius: '0', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '11px', fontWeight: '600', color: 'rgba(0,229,204,0.7)', letterSpacing: '0.5px', transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,204,0.1)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,229,204,0.06)'}
      >
        <ExternalLink size={12} /> VIEW FULL PROFILE
      </button>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,229,204,0.07)', flexShrink: 0 }}>
        {['profile', 'alerts'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '12px', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab ? '#00e5cc' : 'transparent'}`, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '11px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', color: activeTab === tab ? '#00e5cc' : 'rgba(255,255,255,0.3)', transition: 'color 0.15s' }}>
            {tab}
            {tab === 'alerts' && alerts.length > 0 && (
              <span style={{ marginLeft: '6px', background: 'rgba(192,57,43,0.3)', color: '#c0392b', borderRadius: '10px', padding: '1px 6px', fontSize: '10px' }}>{alerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { icon: Phone,  label: 'Phone',             value: tourist.phone },
              { icon: MapPin, label: 'Address',           value: tourist.address },
              { icon: Shield, label: 'Emergency Contact', value: tourist.emergencyName },
              { icon: Phone,  label: 'Emergency Phone',   value: tourist.emergencyContact },
              { icon: Users,  label: 'Group Lead',        value: tourist.parentId || 'Group leader' },
              { icon: Clock,  label: 'Registered',        value: formatDate(tourist.registeredAt) },
              { icon: Clock,  label: 'Expected Return',   value: tourist.expectedReturnTime ? formatDate(tourist.expectedReturnTime) : 'Not set' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '11px 13px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Icon size={13} color="rgba(0,229,204,0.5)" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '3px', letterSpacing: '0.5px' }}>{label}</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{value || '—'}</p>
                </div>
              </div>
            ))}
            {dashData?.lastLocation && (
              <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(0,229,204,0.05)', border: '1px solid rgba(0,229,204,0.1)' }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(0,229,204,0.6)', marginBottom: '6px', letterSpacing: '0.5px' }}>LAST KNOWN LOCATION</p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>{dashData.lastLocation.latitude?.toFixed(5)}, {dashData.lastLocation.longitude?.toFixed(5)}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>Alt: {dashData.lastLocation.altitude ?? '—'}m · {timeAgo(dashData.lastLocation.timestamp)}</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={async () => { if (window.confirm(`Check out ${tourist.name}?`)) { await api.patch(`/tourists/${tourist.touristId}/checkout`); window.location.reload() } }}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px', background: 'rgba(139,32,32,0.15)', border: '1px solid rgba(139,32,32,0.3)', color: '#ff6b6b', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(139,32,32,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(139,32,32,0.15)'}
              >
                CHECKOUT
              </button>
              <button
                onClick={async () => { if (window.confirm(`Permanently delete ${tourist.name}? This cannot be undone.`)) { await api.delete(`/tourists/${tourist.touristId}`); window.location.reload() } }}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px', background: 'rgba(80,20,20,0.3)', border: '1px solid rgba(139,32,32,0.5)', color: '#ff4444', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(80,20,20,0.5)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(80,20,20,0.3)'}
              >
                DELETE
              </button>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div>
            {loadingAlerts ? (
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '40px' }}>Loading...</p>
            ) : alerts.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <CheckCircle size={24} color="rgba(0,229,204,0.2)" style={{ margin: '0 auto 10px' }} />
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>No alerts for this tourist</p>
              </div>
            ) : alerts.map(alert => {
              const color = SEVERITY_COLORS[alert.type?.toUpperCase()] || '#2979ff'
              return (
                <div key={alert.id} style={{ padding: '12px 14px', borderRadius: '10px', marginBottom: '8px', background: `${color}11`, border: `1px solid ${color}33`, borderLeft: `3px solid ${color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '10px', fontWeight: '700', color, letterSpacing: '1px', textTransform: 'uppercase' }}>{alert.type}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{timeAgo(alert.timestamp)}</span>
                  </div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{alert.message}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function AdminTourists() {
  const navigate = useNavigate()
  const [tourists,       setTourists]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [search,         setSearch]         = useState('')
  const [selected,       setSelected]       = useState(null)
  const [activeTab,      setActiveTab]      = useState('all')
  const [filter,         setFilter]         = useState('all')
  const [groupModal,     setGroupModal]     = useState(null)
  const [overdueOpen,    setOverdueOpen]    = useState(true)
  const [acknowledged,   setAcknowledged]   = useState(new Set())

  // ── Overdue tourists ──────────────────────────────────────────
  const now = new Date()
  const overdue = tourists.filter(t => {
    if (!t.active || !t.expectedReturnTime) return false
    if (acknowledged.has(t.touristId)) return false
    const str = t.expectedReturnTime.includes('T') ? t.expectedReturnTime : t.expectedReturnTime.replace(' ', 'T')
    const withTz = str.includes('+') || str.includes('Z') ? str : str + '+05:30'
    return new Date(withTz) < now
  })

  useEffect(() => {
    api.get('/tourists')
       .then(r => setTourists(r.data))
       .catch(console.error)
       .finally(() => setLoading(false))
  }, [])

  // ── Build groups from parentId ────────────────────────────────
  const groups = (() => {
    const leaders = tourists.filter(t => !t.parentId)
    return leaders.map(leader => ({
      leader,
      members: tourists.filter(t => t.parentId === leader.touristId),
    }))
  })()

  // ── Filtered tourist list ─────────────────────────────────────
  const filtered = tourists.filter(t => {
    const matchSearch = t.name?.toLowerCase().includes(search.toLowerCase()) ||
                        t.touristId?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' ||
                        (filter === 'active'   &&  t.active) ||
                        (filter === 'inactive' && !t.active)
    return matchSearch && matchFilter
  })

  const activeCount   = tourists.filter(t => t.active).length
  const inactiveCount = tourists.length - activeCount

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px', gap: '20px', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>Tourists</h1>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
            {tourists.length} registered · {activeCount} on trek · {groups.length} groups
          </p>
        </div>

        {/* Right side — filter pills + add button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {activeTab === 'all' && (
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { key: 'all',      label: `All (${tourists.length})` },
                { key: 'active',   label: `Active (${activeCount})` },
                { key: 'inactive', label: `Inactive (${inactiveCount})` },
              ].map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding: '7px 14px', borderRadius: '20px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: '500', background: filter === f.key ? 'rgba(0,229,204,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${filter === f.key ? 'rgba(0,229,204,0.3)' : 'rgba(255,255,255,0.08)'}`, color: filter === f.key ? '#00e5cc' : 'rgba(255,255,255,0.4)', transition: 'all 0.15s' }}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
          {inactiveCount > 0 && activeTab === 'all' && (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={async () => {
                if (!window.confirm(`Delete all ${inactiveCount} inactive tourist${inactiveCount > 1 ? 's' : ''}?\n\nThis will permanently remove their profiles, GPS history, and all associated records. This cannot be undone.`)) return
                try {
                  await api.delete('/tourists/inactive')
                  setTourists(prev => prev.filter(t => t.active))
                } catch {
                  alert('Failed to delete inactive tourists. Please try again.')
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '12px', fontWeight: '600', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', flexShrink: 0, transition: 'all 0.15s' }}
            >
              <Trash2 size={13} /> Clear Inactive ({inactiveCount})
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/admin/create-tourist')}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '12px', fontWeight: '600', letterSpacing: '0.3px', background: 'linear-gradient(135deg, #00e5cc, #00b8a4)', border: 'none', color: '#060d18', boxShadow: '0 4px 16px rgba(0,229,204,0.2)', flexShrink: 0 }}
          >
            <UserPlus size={14} /> Add Tourist
          </motion.button>
        </div>
      </div>

      {/* ── Overdue panel ────────────────────────────────────────── */}
      <AnimatePresence>
        {overdue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{    opacity: 0, height: 0 }}
            style={{ flexShrink: 0, overflow: 'hidden' }}
          >
            <div style={{ background: 'rgba(139,32,32,0.12)', border: '1px solid rgba(192,57,43,0.3)', borderLeft: '3px solid #c0392b', borderRadius: '12px', overflow: 'hidden' }}>
              {/* Panel header */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer' }}
                onClick={() => setOverdueOpen(o => !o)}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#c0392b', boxShadow: '0 0 8px #c0392b', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '13px', fontWeight: '700', color: '#ff6b6b', letterSpacing: '0.5px' }}>
                  {overdue.length} OVERDUE TOURIST{overdue.length > 1 ? 'S' : ''}
                </span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginLeft: '4px' }}>
                  — expected return time has passed
                </span>
                <motion.div animate={{ rotate: overdueOpen ? 180 : 0 }} style={{ marginLeft: 'auto' }}>
                  <ChevronRight size={14} color="rgba(255,255,255,0.3)" style={{ transform: 'rotate(90deg)' }} />
                </motion.div>
              </div>

              {/* Overdue list */}
              <AnimatePresence>
                {overdueOpen && (
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    style={{ overflow: 'hidden', borderTop: '1px solid rgba(192,57,43,0.2)' }}
                  >
                    {overdue.map((t, i) => {
                      const str = t.expectedReturnTime?.replace(' ', 'T')
                      const withTz = str?.includes('+') || str?.includes('Z') ? str : str + '+05:30'
                      const minsLate = Math.floor((now - new Date(withTz)) / 60000)
                      return (
                        <div
                          key={t.touristId}
                          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderTop: i > 0 ? '1px solid rgba(192,57,43,0.1)' : 'none' }}
                        >
                          {/* Avatar */}
                          <div style={{ width: '34px', height: '34px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {t.photoUrl
                              ? <img src={t.photoUrl} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
                              : <User size={14} color="rgba(192,57,43,0.7)" />
                            }
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>{t.name}</span>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(192,57,43,0.8)', background: 'rgba(192,57,43,0.1)', padding: '1px 6px', borderRadius: '4px' }}>{t.touristId}</span>
                              <SpecialBadges tourist={t} size="sm" />
                            </div>
                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#ff6b6b' }}>
                              {minsLate < 60
                                ? `${minsLate}m overdue`
                                : `${Math.floor(minsLate/60)}h ${minsLate%60}m overdue`
                              }
                              {t.emergencyName && ` · Emergency: ${t.emergencyName} ${t.emergencyContact}`}
                            </span>
                          </div>

                          {/* Acknowledge button */}
                          <button
                            onClick={() => setAcknowledged(prev => new Set([...prev, t.touristId]))}
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: '600', background: 'rgba(0,229,204,0.08)', border: '1px solid rgba(0,229,204,0.2)', color: '#00e5cc', flexShrink: 0, whiteSpace: 'nowrap' }}
                          >
                            <CheckCircle size={12} /> Acknowledge
                          </button>
                        </div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main tabs — All Tourists / Groups */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(0,229,204,0.07)', flexShrink: 0 }}>
        {[
          { key: 'all',    label: 'All Tourists', count: tourists.length },
          { key: 'groups', label: 'Groups',        count: groups.length },
        ].map(tab => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSelected(null) }} style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab.key ? '#00e5cc' : 'transparent'}`, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '12px', fontWeight: '600', letterSpacing: '0.8px', textTransform: 'uppercase', color: activeTab === tab.key ? '#00e5cc' : 'rgba(255,255,255,0.35)', transition: 'color 0.15s' }}>
            {tab.label}
            <span style={{ marginLeft: '7px', fontFamily: 'Bebas Neue, sans-serif', fontSize: '14px', color: activeTab === tab.key ? '#00e5cc' : 'rgba(255,255,255,0.2)' }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#0d1a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '10px 14px', flexShrink: 0 }}>
        <Search size={15} color="rgba(255,255,255,0.25)" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={activeTab === 'all' ? 'Search by name or tourist ID...' : 'Search groups by leader name...'} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#ffffff' }} />
        {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}><X size={13} color="rgba(255,255,255,0.3)" /></button>}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', gap: '16px', minHeight: 0 }}>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', marginTop: '60px' }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.2)' }}>Loading...</p>
            </div>
          ) : activeTab === 'all' ? (
            // ── All tourists grid ───────────────────────────────
            filtered.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: '60px' }}>
                <UserCheck size={28} color="rgba(0,229,204,0.15)" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.2)' }}>No tourists found</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px', paddingRight: '4px' }}>
                <AnimatePresence>
                  {filtered.map(tourist => (
                    <TouristCard
                      key={tourist.touristId}
                      tourist={tourist}
                      onClick={t => setSelected(prev => prev?.touristId === t.touristId ? null : t)}
                      selected={selected?.touristId === tourist.touristId}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )
          ) : (
            // ── Groups grid ─────────────────────────────────────
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px', paddingRight: '4px' }}>
              <AnimatePresence>
                {groups
                  .filter(g => g.leader?.name?.toLowerCase().includes(search.toLowerCase()))
                  .map(g => (
                    <GroupCard
                      key={g.leader.touristId}
                      leader={g.leader}
                      members={g.members}
                      allTourists={tourists}
                      onClick={(leader, members) => setGroupModal({ leader, members })}
                    />
                  ))
                }
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Detail panel — only on All tab */}
        <AnimatePresence>
          {selected && activeTab === 'all' && (
            <DetailPanel tourist={selected} onClose={() => setSelected(null)} />
          )}
        </AnimatePresence>
      </div>

      {/* Group modal */}
      <AnimatePresence>
        {groupModal && (
          <GroupModal
            leader={groupModal.leader}
            members={groupModal.members}
            onClose={() => setGroupModal(null)}
            onSelectTourist={tourist => { setActiveTab('all'); setSelected(tourist); }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}