import { useEffect, useState, useRef, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, User, Phone, MapPin, Shield,
  Users, Clock, CheckCircle, AlertTriangle,
  ChevronRight, Baby, PersonStanding, Accessibility,
} from 'lucide-react'
import api from '../../lib/api'

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY
const MAP_STYLE    = `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`

function timeAgo(ts) {
  if (!ts) return 'never'
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

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ width: '32px', height: '32px', flexShrink: 0, borderRadius: '8px', background: 'rgba(0,229,204,0.07)', border: '1px solid rgba(0,229,204,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={14} color="rgba(0,229,204,0.6)" />
      </div>
      <div>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '3px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.85)' }}>{value || '—'}</p>
      </div>
    </div>
  )
}

// ── Trek breadcrumb map ──────────────────────────────────────────────────
function TrekMap({ locHistory, lastLocation }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const center = lastLocation
      ? [lastLocation.longitude, lastLocation.latitude]
      : [77.5946, 12.9716]

    const m = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center,
      zoom: 14,
      pitch: 30,
    })
    mapRef.current = m

    m.on('load', () => {
      // Build trail coordinates — history is newest first, reverse for chronological order
      const coords = [...locHistory]
        .reverse()
        .map(p => [p.longitude, p.latitude])

      if (coords.length >= 2) {
        m.addSource('trail', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } }
        })

        // Trail line — glowing teal
        m.addLayer({
          id: 'trail-glow',
          type: 'line',
          source: 'trail',
          paint: { 'line-color': '#00e5cc', 'line-width': 6, 'line-opacity': 0.15 },
          layout: { 'line-cap': 'round', 'line-join': 'round' },
        })
        m.addLayer({
          id: 'trail-line',
          type: 'line',
          source: 'trail',
          paint: { 'line-color': '#00e5cc', 'line-width': 2.5, 'line-opacity': 0.8 },
          layout: { 'line-cap': 'round', 'line-join': 'round' },
        })

        // Start marker — green dot
        if (coords.length > 0) {
          const startEl = document.createElement('div')
          startEl.style.cssText = 'width:12px;height:12px;border-radius:50%;background:#22c55e;border:2px solid #fff;box-shadow:0 0 6px rgba(34,197,94,0.6)'
          new maplibregl.Marker({ element: startEl, anchor: 'center' })
            .setLngLat(coords[0])
            .setPopup(new maplibregl.Popup({ closeButton: false, offset: 12 })
              .setHTML('<div style="font-family:Inter,sans-serif;font-size:11px;color:#fff;background:#0d1a2e;padding:6px 10px;border-radius:8px">Trek start</div>'))
            .addTo(m)
        }
      }

      // Current location marker — pulsing teal pin
      if (lastLocation) {
        const el = document.createElement('div')
        el.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#00e5cc;border:3px solid #fff;box-shadow:0 0 10px rgba(0,229,204,0.7);animation:locPulse 1.5s ease-in-out infinite'
        if (!document.getElementById('loc-pulse-style')) {
          const s = document.createElement('style'); s.id = 'loc-pulse-style'
          s.textContent = '@keyframes locPulse{0%,100%{box-shadow:0 0 6px rgba(0,229,204,0.5)}50%{box-shadow:0 0 16px rgba(0,229,204,0.9)}}'
          document.head.appendChild(s)
        }
        new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([lastLocation.longitude, lastLocation.latitude])
          .setPopup(new maplibregl.Popup({ closeButton: false, offset: 12 })
            .setHTML('<div style="font-family:Inter,sans-serif;font-size:11px;color:#fff;background:#0d1a2e;padding:6px 10px;border-radius:8px">Current position</div>'))
          .addTo(m)
      }

      // Fit map to show entire trail
      if (coords.length >= 2) {
        const lngs = coords.map(c => c[0])
        const lats = coords.map(c => c[1])
        m.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: 60, maxZoom: 17, duration: 800 }
        )
      }
    })

    return () => { m.remove(); mapRef.current = null }
  }, [locHistory, lastLocation])

  return <div ref={containerRef} style={{ width: '100%', height: '420px' }} />
}

export default function AdminTouristDetail() {
  const { touristId } = useParams()
  const navigate      = useNavigate()

  const [tourist,  setTourist]  = useState(null)
  const [alerts,   setAlerts]   = useState([])
  const [dashData, setDashData] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('info')
  const [imgError,  setImgError]  = useState(false)
  const [locHistory, setLocHistory] = useState([])
  const [locLoading, setLocLoading] = useState(false)
  const mapContainer = useRef(null)
  const map          = useRef(null)

  // Fetch location history when location tab is opened
  useEffect(() => {
    if (tab !== 'location' || locHistory.length > 0) return
    setLocLoading(true)
    api.get(`/location/history/${touristId}`)
      .then(r => setLocHistory(r.data))
      .catch(console.error)
      .finally(() => setLocLoading(false))
  }, [tab, touristId])

  useEffect(() => {
    Promise.all([
      api.get(`/tourists/${touristId}`),
      api.get(`/alerts/${touristId}`),
      api.get(`/tourists/${touristId}/dashboard`).catch(() => ({ data: null })),
    ]).then(([t, a, d]) => {
      setTourist(t.data)
      setAlerts(a.data)
      setDashData(d.data)
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [touristId])

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.2)' }}>Loading...</p>
    </div>
  )

  if (!tourist) return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Tourist not found</p>
      <button onClick={() => navigate('/admin/tourists')} style={{ background: 'none', border: '1px solid rgba(0,229,204,0.2)', borderRadius: '8px', padding: '8px 16px', color: '#00e5cc', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px' }}>Back to Tourists</button>
    </div>
  )

  const criticalAlerts = alerts.filter(a => ['FALL','SOS','CRITICAL'].includes(a.type?.toUpperCase()))

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <button onClick={() => navigate('/admin/tourists')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter, sans-serif', fontSize: '12px', padding: 0 }}>
            <ArrowLeft size={13} /> Tourists
          </button>
          <ChevronRight size={12} color="rgba(255,255,255,0.15)" />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(0,229,204,0.7)' }}>{tourist.name}</span>
        </div>

        {/* Hero section */}
        <div style={{ background: '#0d1a2e', border: '1px solid rgba(0,229,204,0.1)', borderRadius: '20px', padding: '32px', marginBottom: '20px', display: 'flex', gap: '28px', alignItems: 'flex-start' }}>

          {/* Photo — large */}
          <div style={{ width: '140px', height: '140px', flexShrink: 0, borderRadius: '18px', overflow: 'hidden', background: 'rgba(0,229,204,0.06)', border: '2px solid rgba(0,229,204,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {tourist.photoUrl && !imgError ? (
              <img
                src={tourist.photoUrl}
                alt={tourist.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => setImgError(true)}
              />
            ) : (
              <User size={48} color="rgba(0,229,204,0.25)" />
            )}
          </div>

          {/* Name + status */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '28px', fontWeight: '700', color: '#ffffff' }}>
                {tourist.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', background: tourist.active ? 'rgba(0,229,204,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${tourist.active ? 'rgba(0,229,204,0.25)' : 'rgba(255,255,255,0.1)'}` }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: tourist.active ? '#00e5cc' : 'rgba(255,255,255,0.2)', boxShadow: tourist.active ? '0 0 6px #00e5cc' : 'none' }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: '600', color: tourist.active ? '#00e5cc' : 'rgba(255,255,255,0.3)' }}>
                  {tourist.active ? 'ACTIVE ON TREK' : 'CHECKED OUT'}
                </span>
              </div>
            </div>

            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'rgba(0,229,204,0.6)', background: 'rgba(0,229,204,0.07)', padding: '3px 10px', borderRadius: '6px' }}>
              {tourist.touristId}
            </span>

            {/* Age + special needs badges */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              {tourist.age && (
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '3px 10px', borderRadius: '20px' }}>
                  Age {tourist.age}
                </span>
              )}
              {tourist.child && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.25)', fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: '600', color: '#d4a843' }}>
                  <Baby size={11} strokeWidth={2} /> Child
                </span>
              )}
              {tourist.elder && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(41,121,255,0.1)', border: '1px solid rgba(41,121,255,0.25)', fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: '600', color: '#2979ff' }}>
                  <PersonStanding size={11} strokeWidth={2} /> Senior
                </span>
              )}
              {tourist.handicapped && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(0,229,204,0.08)', border: '1px solid rgba(0,229,204,0.2)', fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: '600', color: '#00e5cc' }}>
                  <Accessibility size={11} strokeWidth={2} /> Special Needs
                </span>
              )}
            </div>

            {/* Quick stats */}
            <div style={{ display: 'flex', gap: '24px', marginTop: '20px' }}>
              {[
                { label: 'Alerts',         value: alerts.length,          color: alerts.length > 0 ? '#d4a843' : '#00e5cc' },
                { label: 'Critical',       value: criticalAlerts.length,  color: criticalAlerts.length > 0 ? '#c0392b' : '#00e5cc' },
                { label: 'Expected Return',value: formatDate(tourist.expectedReturnTime), color: 'rgba(255,255,255,0.5)', small: true },
              ].map(s => (
                <div key={s.label}>
                  <p style={{ fontFamily: s.small ? 'Inter, sans-serif' : 'Bebas Neue, sans-serif', fontSize: s.small ? '13px' : '28px', color: s.color, lineHeight: 1, marginBottom: '4px' }}>{s.value}</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={async () => { if (window.confirm(`Check out ${tourist.name}?`)) { await api.patch(`/tourists/${tourist.touristId}/checkout`); navigate('/admin/tourists') } }}
              style={{ padding: '9px 18px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px', background: 'rgba(139,32,32,0.15)', border: '1px solid rgba(139,32,32,0.3)', color: '#ff6b6b', whiteSpace: 'nowrap' }}
            >
              CHECKOUT
            </button>
            <button
              onClick={async () => { if (window.confirm(`Permanently delete ${tourist.name}?`)) { await api.delete(`/tourists/${tourist.touristId}`); navigate('/admin/tourists') } }}
              style={{ padding: '9px 18px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px', background: 'rgba(80,20,20,0.3)', border: '1px solid rgba(139,32,32,0.5)', color: '#ff4444', whiteSpace: 'nowrap' }}
            >
              DELETE
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,229,204,0.07)', marginBottom: '20px' }}>
          {['info', 'alerts', 'location'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 24px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? '#00e5cc' : 'transparent'}`, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '12px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', color: tab === t ? '#00e5cc' : 'rgba(255,255,255,0.3)', transition: 'color 0.15s' }}>
              {t}
              {t === 'alerts' && alerts.length > 0 && (
                <span style={{ marginLeft: '6px', background: criticalAlerts.length > 0 ? 'rgba(192,57,43,0.3)' : 'rgba(212,168,67,0.2)', color: criticalAlerts.length > 0 ? '#c0392b' : '#d4a843', borderRadius: '10px', padding: '1px 7px', fontSize: '10px' }}>
                  {alerts.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

            {tab === 'info' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <InfoRow icon={Phone}  label="Phone"             value={tourist.phone} />
                <InfoRow icon={MapPin} label="Address"           value={tourist.address} />
                <InfoRow icon={Shield} label="Emergency Contact" value={tourist.emergencyName} />
                <InfoRow icon={Phone}  label="Emergency Phone"   value={tourist.emergencyContact} />
                <InfoRow icon={Users}  label="Group"             value={tourist.parentId ? `Member of ${tourist.parentId}` : 'Group Leader'} />
                <InfoRow icon={Clock}  label="Registered"        value={formatDate(tourist.registeredAt)} />
                <InfoRow icon={Clock}  label="Expected Return"   value={formatDate(tourist.expectedReturnTime)} />
              </div>
            )}

            {tab === 'alerts' && (
              <div>
                {alerts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px' }}>
                    <CheckCircle size={28} color="rgba(0,229,204,0.2)" style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.2)' }}>No alerts for this tourist</p>
                  </div>
                ) : alerts.map(alert => {
                  const color = SEVERITY_COLORS[alert.type?.toUpperCase()] || '#2979ff'
                  return (
                    <div key={alert.id} style={{ padding: '14px 16px', borderRadius: '12px', marginBottom: '8px', background: `${color}11`, border: `1px solid ${color}33`, borderLeft: `3px solid ${color}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '11px', fontWeight: '700', color, letterSpacing: '1.2px', textTransform: 'uppercase' }}>{alert.type}</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{timeAgo(alert.timestamp)} · {formatDate(alert.timestamp)}</span>
                      </div>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>{alert.message}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {tab === 'location' && (
              <div>
                {!dashData?.lastLocation ? (
                  <div style={{ textAlign: 'center', padding: '60px' }}>
                    <MapPin size={28} color="rgba(0,229,204,0.2)" style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.2)' }}>No location data yet</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Quick stats row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                      <InfoRow icon={MapPin} label="Latitude"  value={dashData.lastLocation.latitude?.toFixed(6)} />
                      <InfoRow icon={MapPin} label="Longitude" value={dashData.lastLocation.longitude?.toFixed(6)} />
                      <InfoRow icon={MapPin} label="Altitude"  value={dashData.lastLocation.altitude ? `${dashData.lastLocation.altitude}m` : '—'} />
                      <InfoRow icon={Clock}  label="Last Seen" value={timeAgo(dashData.lastLocation.timestamp)} />
                    </div>

                    {/* Trek map with breadcrumb trail */}
                    <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', position: 'relative' }}>
                      <div style={{ padding: '12px 16px', background: '#0d1a2e', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>
                          Trek Trail
                        </p>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
                          {locLoading ? 'Loading...' : `${locHistory.length} location points`}
                        </p>
                      </div>
                      <TrekMap
                        locHistory={locHistory}
                        lastLocation={dashData.lastLocation}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}