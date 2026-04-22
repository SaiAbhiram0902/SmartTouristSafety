import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  Users, AlertTriangle, Hexagon, Activity,
  TrendingUp, Wifi, WifiOff, X, Navigation,
  Maximize2, Minimize2, ChevronRight, ChevronLeft,
  Bell
} from 'lucide-react'
import api from '../../lib/api'
import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'

const MAPTILER_KEY = 'jbYIDNeXWpUkQx80YgXc'
const MAP_STYLE    = `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`
const DEMO_CENTER  = [77.0595, 10.0889]
const DEMO_ZOOM    = 12
const DEMO_PITCH   = 60
const DEMO_BEARING = -15

const SEVERITY = {
  FALL:     { color: '#8B2020', border: '#c0392b', label: 'FALL',     dim: 'rgba(139,32,32,0.15)'  },
  SOS:      { color: '#8B2020', border: '#c0392b', label: 'SOS',      dim: 'rgba(139,32,32,0.15)'  },
  CRITICAL: { color: '#8B2020', border: '#c0392b', label: 'CRITICAL', dim: 'rgba(139,32,32,0.15)'  },
  HIGH:     { color: '#7A5C1E', border: '#d4a843', label: 'WARNING',  dim: 'rgba(122,92,30,0.15)'  },
  MEDIUM:   { color: '#7A5C1E', border: '#d4a843', label: 'WARNING',  dim: 'rgba(122,92,30,0.15)'  },
  OVERDUE:  { color: '#7A5C1E', border: '#d4a843', label: 'OVERDUE',  dim: 'rgba(122,92,30,0.15)'  },
  ZONE:     { color: '#1A3A5C', border: '#2979ff', label: 'ZONE',     dim: 'rgba(26,58,92,0.15)'   },
  INFO:     { color: '#1A3A5C', border: '#2979ff', label: 'INFO',     dim: 'rgba(26,58,92,0.15)'   },
}

function getSeverityConfig(type) {
  return SEVERITY[type?.toUpperCase()] || SEVERITY.INFO
}

// ── Global alert toast ───────────────────────────────────────────
function AlertToast({ alert, onDismiss }) {
  const cfg = getSeverityConfig(alert.type)
  useEffect(() => {
    const t = setTimeout(() => onDismiss(alert.id), 6000)
    return () => clearTimeout(t)
  }, [alert.id, onDismiss])

  return (
    <motion.div
      initial={{ opacity: 0, y: -60, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,   scale: 1    }}
      exit={{    opacity: 0, y: -60, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        background: cfg.dim,
        border: `1px solid ${cfg.border}`,
        borderLeft: `4px solid ${cfg.border}`,
        borderRadius: '12px',
        padding: '14px 16px',
        minWidth: '300px',
        maxWidth: '380px',
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${cfg.border}22`,
        backdropFilter: 'blur(12px)',
        cursor: 'pointer',
      }}
      onClick={() => onDismiss(alert.id)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <Bell size={14} color={cfg.border} style={{ flexShrink: 0, marginTop: '1px' }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              fontFamily: 'Outfit, sans-serif', fontSize: '10px',
              fontWeight: '700', letterSpacing: '1.2px',
              color: cfg.border, textTransform: 'uppercase',
            }}>
              {cfg.label}
            </span>
            {alert.touristId && (
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: '10px',
                color: 'rgba(0,229,204,0.7)', background: 'rgba(0,229,204,0.08)',
                padding: '1px 6px', borderRadius: '4px',
              }}>
                {alert.touristId}
              </span>
            )}
          </div>
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: '12px',
            color: 'rgba(255,255,255,0.8)', lineHeight: 1.5,
          }}>
            {alert.message}
          </p>
        </div>
        <X size={12} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
      </div>
      {/* Auto-dismiss progress bar */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 6, ease: 'linear' }}
        style={{
          height: '2px',
          background: cfg.border,
          borderRadius: '1px',
          marginTop: '10px',
          opacity: 0.5,
        }}
      />
    </motion.div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, accent, sub, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        background: hovered ? '#112240' : '#0d1a2e',
        border: `1px solid ${hovered ? accent + '33' : 'rgba(255,255,255,0.06)'}`,
        borderTop: `2px solid ${accent}`,
        borderRadius: '12px',
        padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: '8px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.2s, border 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {label}
        </span>
        <Icon size={14} color={hovered ? accent : accent + '99'} strokeWidth={2} />
      </div>
      <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '36px', color: '#ffffff', lineHeight: 1, letterSpacing: '1px' }}>
        {value}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          {sub}
        </span>
        {onClick && hovered && (
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: accent + '88', letterSpacing: '0.5px' }}>
            VIEW →
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ── Alert card ────────────────────────────────────────────────────
function AlertCard({ alert, onDismiss, onFlyTo }) {
  const cfg = getSeverityConfig(alert.type)
  const ago = () => {
    const diff = Math.floor((Date.now() - new Date(alert.timestamp).getTime()) / 1000)
    if (diff < 60)   return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`
    return `${Math.floor(diff/3600)}h ago`
  }
  const extractCoords = () => {
    try {
      const m = alert.message.match(/\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/)
      if (m) return [parseFloat(m[2]), parseFloat(m[1])]
    } catch {}
    return null
  }
  const coords = extractCoords()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        background: cfg.dim, border: `1px solid ${cfg.color}`,
        borderLeft: `3px solid ${cfg.border}`,
        borderRadius: '10px', padding: '12px 14px', marginBottom: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '10px', fontWeight: '700', letterSpacing: '1.2px', color: cfg.border, textTransform: 'uppercase' }}>
              {cfg.label}
            </span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
              {ago()}
            </span>
          </div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, wordBreak: 'break-word' }}>
            {alert.message}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '7px' }}>
            {alert.touristId && (
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(0,229,204,0.6)', background: 'rgba(0,229,204,0.07)', padding: '2px 7px', borderRadius: '4px' }}>
                {alert.touristId}
              </span>
            )}
            {coords && (
              <button onClick={() => onFlyTo(coords)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(41,121,255,0.1)', border: '1px solid rgba(41,121,255,0.2)', borderRadius: '4px', padding: '2px 7px', cursor: 'pointer', color: '#2979ff', fontFamily: 'Inter, sans-serif', fontSize: '10px' }}>
                <Navigation size={9} /> FLY TO
              </button>
            )}
          </div>
        </div>
        <button onClick={() => onDismiss(alert.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0 }}>
          <X size={12} color="rgba(255,255,255,0.3)" />
        </button>
      </div>
    </motion.div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate     = useNavigate()
  const mapContainer = useRef(null)
  const map          = useRef(null)
  const markers      = useRef({})
  const alertFeedRef = useRef(null)
  const touristsRef  = useRef([])  // kept in sync with tourists state for WS handler

  const [tourists,    setTourists]    = useState([])
  const [zones,       setZones]       = useState([])
  const [hotspots,    setHotspots]    = useState([])
  const [alerts,      setAlerts]      = useState([])
  const [toasts,      setToasts]      = useState([])
  const [wsStatus,    setWsStatus]    = useState('connecting')

  // Keep ref in sync so the WebSocket location handler always has fresh tourist data
  useEffect(() => { touristsRef.current = tourists }, [tourists])
  const [mapReady,    setMapReady]    = useState(false)
  const [mapFullscreen, setMapFullscreen] = useState(false)
  const [feedCollapsed, setFeedCollapsed] = useState(false)
  const [feedFlash,     setFeedFlash]     = useState(false)

  // ── Fetch data ────────────────────────────────────────────────
  const fetchTourists = useCallback(() => {
    api.get('/tourists/dashboard').then(r => {
      const enriched = r.data.map(d => ({
        ...d.tourist,
        lastLat:      d.lastLocation?.latitude   ?? null,
        lastLng:      d.lastLocation?.longitude  ?? null,
        lastActivity: d.lastLocation?.activity   ?? null,
        lastSeen:     d.lastLocation?.timestamp  ?? null,
        latestAlert:  d.latestAlert  ?? null,
        totalAlerts:  d.totalAlerts  ?? 0,
      }))
      setTourists(enriched)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    fetchTourists()
    api.get('/zones').then(r => setZones(r.data)).catch(console.error)
    api.get('/hotspots').then(r => setHotspots(r.data)).catch(console.error)
    api.get('/alerts').then(r => {
      const all = Array.isArray(r.data) ? [...r.data] : []
      all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      setAlerts(all.slice(0, 50))
    }).catch(console.error)

    // Refresh once on mount — live updates come via WebSocket /topic/locations
    // A slower 30s poll acts as a safety net in case WS drops
    const pollInterval = setInterval(fetchTourists, 30000)
    return () => clearInterval(pollInterval)
  }, [fetchTourists])

  // ── WebSocket ─────────────────────────────────────────────────
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      onConnect: () => {
        setWsStatus('connected')
        // Live location updates — move pins in real time without re-rendering all markers
        client.subscribe('/topic/locations', (msg) => {
          const loc = JSON.parse(msg.body)
          const { touristId, latitude, longitude, activity, heartRate, timestamp } = loc

          // Update state so the data stays fresh for popups
          setTourists(prev => prev.map(t =>
            t.touristId === touristId
              ? { ...t, lastLat: latitude, lastLng: longitude,
                  lastActivity: activity, lastSeen: timestamp }
              : t
          ))

          // Move the existing marker directly — no full re-render needed
          const marker = markers.current[touristId]
          if (marker) {
            marker.setLngLat([longitude, latitude])
          }
        })

        client.subscribe('/topic/alerts', (msg) => {
          const alert = JSON.parse(msg.body)
          setAlerts(prev => [alert, ...prev].slice(0, 50))
          setToasts(prev => [{ ...alert, toastId: Date.now() }, ...prev].slice(0, 3))
          setFeedCollapsed(false)
          setFeedFlash(true)
          setTimeout(() => setFeedFlash(false), 2000)
          if (alertFeedRef.current) {
            alertFeedRef.current.scrollTo({ top: 0, behavior: 'smooth' })
          }
          // Refresh tourist positions — alert means a tourist moved or triggered an event
          fetchTourists()
        })
      },
      onDisconnect: () => setWsStatus('disconnected'),
      onStompError:  () => setWsStatus('disconnected'),
      reconnectDelay: 5000,
    })
    client.activate()
    return () => client.deactivate()
  }, [])

  // ── Map init ──────────────────────────────────────────────────
  useEffect(() => {
    if (map.current || !mapContainer.current) return
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: DEMO_CENTER,
      zoom: DEMO_ZOOM,
      pitch: DEMO_PITCH,
      bearing: DEMO_BEARING,
    })
    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right')
    map.current.on('load', () => {
      setMapReady(true)
      map.current.addSource('terrain', {
        type: 'raster-dem',
        url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`,
        tileSize: 256,
      })
      map.current.setTerrain({ source: 'terrain', exaggeration: 1.8 })
    })
    return () => { if (map.current) { map.current.remove(); map.current = null } }
  }, [])

  // Resize map when layout changes
  useEffect(() => {
    if (map.current) setTimeout(() => map.current.resize(), 380)
  }, [mapFullscreen, feedCollapsed])

  // ── Tourist markers ───────────────────────────────────────────
  const activePopupRef = useRef(null)

  function touristColor(id) {
    const palette = ['#00e5cc','#2979ff','#a78bfa','#f97316','#22c55e','#e91e8c','#38bdf8','#d4a843','#c084fc','#34d399']
    let hash = 0
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff
    return palette[Math.abs(hash) % palette.length]
  }

  useEffect(() => {
    if (!mapReady || !map.current) return
    Object.values(markers.current).forEach(m => m.remove())
    markers.current = {}

    if (!document.getElementById('pulse-style')) {
      const s = document.createElement('style'); s.id = 'pulse-style'
      s.textContent = `@keyframes pulseRing{0%{transform:scale(1);opacity:.8}100%{transform:scale(2.5);opacity:0}}`
      document.head.appendChild(s)
    }

    tourists.forEach(tourist => {
      if (!tourist.lastLat || !tourist.lastLng) return

      const el = document.createElement('div')
      el.style.cssText = 'position:relative;cursor:pointer;'

      // Device online/offline: offline if no update in last 6 minutes
      const lastSeenMs = tourist.lastSeen ? Date.now() - new Date(tourist.lastSeen + (tourist.lastSeen.endsWith('Z') ? '' : '+05:30')).getTime() : Infinity
      const isOffline  = lastSeenMs > 6 * 60 * 1000

      const isAlerted   = tourist.latestAlert && ['FALL','SOS','CRITICAL'].includes(tourist.latestAlert.type?.toUpperCase())
      const shouldPulse = isAlerted ||
        ['OVERDUE','ZONE'].includes(tourist.latestAlert?.type?.toUpperCase())
      const pinColor = isAlerted ? '#ef4444' : touristColor(tourist.touristId)
      const pinBg    = '#0a1628'

      // Single SVG element — el IS the SVG directly, no wrapper confusion
      // Fixed 32×44 viewBox: circle head at (16,14) r=13, stem tip at (16,44)
      // anchor:'bottom' => coordinate is at pixel (16,44) = exact tip
      const dotBadge = tourist.child
        ? `<circle cx="25" cy="5" r="5" fill="#d4a843" stroke="#060d18" stroke-width="1.2"/>`
        : tourist.elder ? `<circle cx="25" cy="5" r="5" fill="#2979ff" stroke="#060d18" stroke-width="1.2"/>`
        : tourist.handicapped ? `<circle cx="25" cy="5" r="5" fill="#a78bfa" stroke="#060d18" stroke-width="1.2"/>`
        : ''

      const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svgEl.setAttribute('width', '32')
      svgEl.setAttribute('height', '44')
      svgEl.setAttribute('viewBox', '0 0 32 44')
      svgEl.style.cssText = 'display:block;cursor:pointer;overflow:visible;'
      svgEl.innerHTML = `
        <polygon points="11,26 21,26 16,44" fill="${pinColor}" opacity="0.85"/>
        <circle cx="16" cy="14" r="13" fill="${pinBg}" stroke="${pinColor}" stroke-width="2"/>
        <g transform="translate(4,4)"><svg width="24" height="20" viewBox="2 3 20 18" fill="none" stroke="${pinColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></g>
        ${dotBadge}
        ${isOffline
          ? `<circle cx="28" cy="28" r="5" fill="#6b7280" stroke="#060d18" stroke-width="1.5"/>
             <circle cx="28" cy="28" r="2.5" fill="#374151"/>`
          : `<circle cx="28" cy="28" r="5" fill="#22c55e" stroke="#060d18" stroke-width="1.5"/>
             <circle cx="28" cy="28" r="2.5" fill="#4ade80"/>`
        }
        ${shouldPulse ? `<circle cx="16" cy="14" r="13" fill="none" stroke="${pinColor}" stroke-width="1.5" class="pin-pulse-${tourist.touristId}"/>` : ''}
      `

      if (shouldPulse) {
        const styleId = `pulse-style-${tourist.touristId}`
        if (!document.getElementById(styleId)) {
          const s = document.createElement('style'); s.id = styleId
          s.textContent = `@keyframes pr${tourist.touristId}{0%{r:13;opacity:.8}100%{r:22;opacity:0}} .pin-pulse-${tourist.touristId}{animation:pr${tourist.touristId} 1.8s ease-out infinite}`
          document.head.appendChild(s)
        }
      }

      el.style.cssText = 'cursor:pointer;'
      el.appendChild(svgEl)

      const alertBadge = tourist.latestAlert
        ? `<div style="margin-top:6px;padding:4px 8px;border-radius:6px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);font-size:10px;color:#ef4444;font-family:Outfit,sans-serif;font-weight:600">${tourist.latestAlert.type} — ${tourist.latestAlert.message?.slice(0,50)}${tourist.latestAlert.message?.length>50?'…':''}</div>`
        : ''

      const specialBadges = [
        tourist.child       ? `<span style="font-size:9px;color:#d4a843;background:rgba(212,168,67,0.15);padding:1px 6px;border-radius:20px;border:1px solid rgba(212,168,67,0.3)">Child</span>` : '',
        tourist.elder       ? `<span style="font-size:9px;color:#2979ff;background:rgba(41,121,255,0.15);padding:1px 6px;border-radius:20px;border:1px solid rgba(41,121,255,0.3)">Senior</span>` : '',
        tourist.handicapped ? `<span style="font-size:9px;color:#a78bfa;background:rgba(167,139,250,0.1);padding:1px 6px;border-radius:20px;border:1px solid rgba(167,139,250,0.2)">Special Needs</span>` : '',
      ].filter(Boolean).join(' ')

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        if (activePopupRef.current) { activePopupRef.current.remove(); activePopupRef.current = null }
        map.current.flyTo({ center:[tourist.lastLng, tourist.lastLat], zoom: Math.max(map.current.getZoom(), 14), pitch:50, duration:800 })
        const popup = new maplibregl.Popup({ offset:[0,-44], closeButton:false, maxWidth:'240px' })
          .setLngLat([tourist.lastLng, tourist.lastLat])
          .setHTML(`
            <div style="font-family:Inter,sans-serif;background:#0d1a2e;padding:12px;border-radius:10px;border:1px solid ${pinColor}44;box-shadow:0 8px 24px rgba(0,0,0,0.6)">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                <p style="font-family:Outfit,sans-serif;font-size:13px;font-weight:700;color:#fff">${tourist.name}</p>
                <span style="font-family:JetBrains Mono,monospace;font-size:10px;color:${pinColor};background:${pinColor}18;padding:1px 6px;border-radius:4px">${tourist.touristId}</span>
              </div>
              ${specialBadges ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">${specialBadges}</div>` : ''}
              <p style="font-size:10px;color:rgba(255,255,255,0.35);font-family:JetBrains Mono,monospace;margin-bottom:4px">${tourist.lastLat.toFixed(5)}, ${tourist.lastLng.toFixed(5)}</p>
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                <span style="width:7px;height:7px;border-radius:50%;background:${isOffline?'#6b7280':'#22c55e'};display:inline-block;flex-shrink:0"></span>
                <span style="font-size:10px;color:${isOffline?'#9ca3af':'rgba(255,255,255,0.4)'}">${isOffline?'Device offline':'Device online'}</span>
              </div>
              ${tourist.lastActivity ? `<p style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Activity: ${tourist.lastActivity}</p>` : ''}
              ${alertBadge}
              <button onclick="window.__touristNav&&window.__touristNav('${tourist.touristId}')" style="margin-top:8px;width:100%;padding:7px;border-radius:7px;cursor:pointer;font-family:Outfit,sans-serif;font-size:11px;font-weight:700;background:linear-gradient(135deg,${pinColor},${pinColor}99);border:none;color:#fff">
                View Tourist →
              </button>
            </div>`)
          .addTo(map.current)
        activePopupRef.current = popup
      })

      markers.current[tourist.touristId] = new maplibregl.Marker({ element: el, anchor:'bottom' })
        .setLngLat([tourist.lastLng, tourist.lastLat])
        .addTo(map.current)
    })

    window.__touristNav = (id) => navigate(`/admin/tourists/${id}`)
  }, [tourists, mapReady])

  // ── Zone layers on dashboard map ──────────────────────────────
  const ZONE_COLORS = { 0:'#22c55e', 1:'#eab308', 2:'#f97316', 3:'#ef4444', 4:'#7f1d1d' }
  const ZONE_LABELS = { 0:'Safe', 1:'Caution', 2:'Medium Risk', 3:'High Risk', 4:'Prohibited' }

  useEffect(() => {
    if (!mapReady || !map.current || !zones.length) return
    ;['dash-zone-fills','dash-zone-borders','dash-zone-labels'].forEach(id => {
      if (map.current.getLayer(id)) map.current.removeLayer(id)
    })
    if (map.current.getSource('dash-zones')) map.current.removeSource('dash-zones')

    const activeZones = zones.filter(z => z.active)
    if (!activeZones.length) return

    const geojson = {
      type: 'FeatureCollection',
      features: activeZones.map(z => ({
        type: 'Feature',
        properties: {
          id: z.id, name: z.name, dangerLevel: z.dangerLevel,
          color: ZONE_COLORS[z.dangerLevel] ?? '#22c55e',
          riskLabel: ZONE_LABELS[z.dangerLevel] ?? 'Safe',
          description: z.description ?? '',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            z.polygonCoords?.length >= 3
              ? [...z.polygonCoords, z.polygonCoords[0]]   // close the ring
              : [[z.minLon,z.minLat],[z.maxLon,z.minLat],[z.maxLon,z.maxLat],[z.minLon,z.maxLat],[z.minLon,z.minLat]]
          ],
        },
      })),
    }

    map.current.addSource('dash-zones', { type: 'geojson', data: geojson })

    map.current.addLayer({
      id: 'dash-zone-fills', type: 'fill', source: 'dash-zones',
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.12 },
    })
    map.current.addLayer({
      id: 'dash-zone-borders', type: 'line', source: 'dash-zones',
      paint: { 'line-color': ['get', 'color'], 'line-width': 1.5, 'line-dasharray': [3, 2] },
    })
    map.current.addLayer({
      id: 'dash-zone-labels', type: 'symbol', source: 'dash-zones',
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 11, 'text-anchor': 'center',
      },
      paint: {
        'text-color': ['get', 'color'],
        'text-halo-color': '#060d18', 'text-halo-width': 2,
      },
    })

    // Click zone → fitBounds + popup
    map.current.on('click', 'dash-zone-fills', (e) => {
      const p = e.features[0]?.properties
      if (!p) return
      if (activePopupRef.current) { activePopupRef.current.remove(); activePopupRef.current = null }
      const color = p.color
      const coords = e.features[0].geometry.coordinates[0]
      const lats = coords.map(c => c[1]), lons = coords.map(c => c[0])
      const minLon = Math.min(...lons), maxLon = Math.max(...lons)
      const minLat = Math.min(...lats), maxLat = Math.max(...lats)
      const centerLon = (minLon + maxLon) / 2, centerLat = (minLat + maxLat) / 2
      map.current.fitBounds([[minLon, minLat],[maxLon, maxLat]], { padding:80, maxZoom:16, duration:700 })
      setTimeout(() => {
        const popup = new maplibregl.Popup({ closeButton:false, maxWidth:'260px', anchor:'bottom', offset:10 })
          .setLngLat([centerLon, centerLat])
          .setHTML(`
            <div style="font-family:Inter,sans-serif;background:#0d1a2e;padding:12px;border-radius:10px;border:1px solid ${color}44;box-shadow:0 8px 24px rgba(0,0,0,0.6)">
              <p style="font-family:Outfit,sans-serif;font-size:13px;font-weight:700;color:#fff;margin-bottom:5px">${p.name}</p>
              <span style="font-size:10px;font-weight:600;color:${color};background:${color}22;padding:2px 8px;border-radius:20px;border:1px solid ${color}44">${p.riskLabel}</span>
              ${p.description && p.description !== 'null' ? `<p style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:8px;line-height:1.5">${p.description}</p>` : ''}
              <button onclick="window.__zoneNav&&window.__zoneNav(${p.id})" style="margin-top:10px;width:100%;padding:7px;border-radius:7px;cursor:pointer;font-family:Outfit,sans-serif;font-size:11px;font-weight:700;background:linear-gradient(135deg,${color},${color}aa);border:none;color:#fff;letter-spacing:0.5px">
                View Zone Details →
              </button>
            </div>`)
          .addTo(map.current)
        activePopupRef.current = popup
        window.__zoneNav = (id) => navigate(`/admin/zones/${id}`)
      }, 750)
    })
    map.current.on('mouseenter', 'dash-zone-fills', () => { if (map.current) map.current.getCanvas().style.cursor = 'pointer' })
    map.current.on('mouseleave', 'dash-zone-fills', () => { if (map.current) map.current.getCanvas().style.cursor = '' })
  }, [zones, mapReady])

  // ── Hotspot icon markers on dashboard ────────────────────────
  const dashHotMarkers = useRef({})
  const HOT_CFG = {
    VIEWPOINT:      { color:'#2979ff', bg:'#0d1f5e', path:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' },
    REST_STOP:      { color:'#00e5cc', bg:'#012e2a', path:'<path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><path d="M6 2c0 1.5 1.5 2 1.5 3.5S6 7 6 8"/><path d="M10 2c0 1.5 1.5 2 1.5 3.5S10 7 10 8"/><path d="M14 2c0 1.5 1.5 2 1.5 3.5S14 7 14 8"/>' },
    MEDICAL:        { color:'#22c55e', bg:'#052e16', path:'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>' },
    WATER:          { color:'#38bdf8', bg:'#082f49', path:'<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>' },
    SHELTER:        { color:'#a78bfa', bg:'#2e1065', path:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
    DANGER_CLUSTER: { color:'#ef4444', bg:'#450a0a', path:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
  }
  const HOT_MINZOOM = 10

  // Hotspot pins — small 26×36 SVG, tip at (13,36), no filter IDs, subtle vs zones
  function makeDashPinSVG(color, bg, iconD) {
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svgEl.setAttribute('width', '30')
    svgEl.setAttribute('height', '38')
    svgEl.setAttribute('viewBox', '0 0 30 38')
    svgEl.style.cssText = 'display:block;overflow:visible;'
    svgEl.innerHTML = `
      <path d="M15 38 C15 38 1 24 1 15 A14 14 0 1 1 29 15 C29 24 15 38 15 38Z"
            fill="${bg}" stroke="${color}" stroke-width="1.2" opacity="0.72"/>
      <g transform="translate(3,3)">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.75"
             stroke-linecap="round" stroke-linejoin="round" opacity="0.78">
          ${iconD}
        </svg>
      </g>
    `
    return svgEl
  }
  function makeDashDangerSVG(color, bg, cnt) {
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svgEl.setAttribute('width', '30')
    svgEl.setAttribute('height', '30')
    svgEl.setAttribute('viewBox', '0 0 30 30')
    svgEl.style.cssText = 'display:block;overflow:visible;'
    const badge = cnt > 0
      ? `<circle cx="23" cy="7" r="6" fill="#ef4444" stroke="#060d18" stroke-width="1.2"/>
         <text x="23" y="11" text-anchor="middle" font-family="Inter,sans-serif" font-size="7" font-weight="700" fill="#fff">${cnt > 9 ? '9+' : cnt}</text>`
      : ''
    svgEl.innerHTML = `
      <circle cx="15" cy="15" r="13" fill="${bg}" stroke="${color}" stroke-width="1.2" opacity="0.72"/>
      <g transform="translate(3,3)">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.75"
             stroke-linecap="round" stroke-linejoin="round" opacity="0.78">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <circle cx="12" cy="17" r="0.5" fill="${color}"/>
        </svg>
      </g>
      ${badge}
    `
    return svgEl
  }

  const updateHotMarkerVisibility = useCallback(() => {
    if (!map.current) return
    const zoom = map.current.getZoom()
    Object.values(dashHotMarkers.current).forEach(m => {
      m.getElement().style.display = zoom >= HOT_MINZOOM ? '' : 'none'
    })
  }, [])

  useEffect(() => {
    if (!mapReady || !map.current) return
    Object.values(dashHotMarkers.current).forEach(m => m.remove())
    dashHotMarkers.current = {}

    hotspots.forEach(h => {
      const cfg = HOT_CFG[h.category] ?? HOT_CFG.VIEWPOINT
      const isDanger = h.category === 'DANGER_CLUSTER'
      const el = document.createElement('div')
      el.style.cssText = 'cursor:pointer;'

      const svgNode = isDanger
        ? makeDashDangerSVG(cfg.color, cfg.bg, h.alertCount ?? 0)
        : makeDashPinSVG(cfg.color, cfg.bg, cfg.path)
      el.appendChild(svgNode)

      el.style.display = map.current.getZoom() >= HOT_MINZOOM ? '' : 'none'

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        if (activePopupRef.current) { activePopupRef.current.remove(); activePopupRef.current = null }
        map.current.flyTo({ center:[h.longitude, h.latitude], zoom: Math.max(map.current.getZoom(), 13), duration:600 })
        const popup = new maplibregl.Popup({ offset: isDanger ? [0,-15] : [0,-38], closeButton:false, maxWidth:'230px' })
          .setLngLat([h.longitude, h.latitude])
          .setHTML(`
            <div style="font-family:Inter,sans-serif;background:#0d1a2e;padding:12px;border-radius:10px;border:1px solid ${cfg.color}44;box-shadow:0 8px 24px rgba(0,0,0,0.6)">
              <p style="font-family:Outfit,sans-serif;font-size:13px;font-weight:700;color:#fff;margin-bottom:5px">${h.name}</p>
              <span style="font-size:9px;font-weight:600;color:${cfg.color};background:${cfg.color}22;padding:1px 7px;border-radius:20px">${h.category.replace(/_/g,' ')}</span>
              ${h.alertCount > 0 ? `<p style="font-size:10px;color:#ef4444;margin-top:6px">⚠ ${h.alertCount} incident${h.alertCount>1?'s':''} recorded</p>` : ''}
              ${h.description && h.description !== 'null' ? `<p style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:6px;line-height:1.4">${h.description.slice(0,80)}${h.description.length>80?'…':''}</p>` : ''}
              <button onclick="window.__hotNav&&window.__hotNav()" style="margin-top:8px;width:100%;padding:7px;border-radius:7px;cursor:pointer;font-family:Outfit,sans-serif;font-size:11px;font-weight:700;background:linear-gradient(135deg,${cfg.color},${cfg.color}99);border:none;color:#fff">
                View in Hotspots →
              </button>
            </div>`)
          .addTo(map.current)
        activePopupRef.current = popup
        window.__hotNav = () => navigate('/admin/hotspots')
      })

      dashHotMarkers.current[h.id] = new maplibregl.Marker({ element: el, anchor: isDanger ? 'center' : 'bottom' })
        .setLngLat([h.longitude, h.latitude])
        .addTo(map.current)
    })

    map.current.off('zoom', updateHotMarkerVisibility)
    map.current.on('zoom', updateHotMarkerVisibility)
  }, [hotspots, mapReady])

  const flyTo = useCallback((coords) => {
    if (!map.current) return
    map.current.flyTo({ center: coords, zoom: 15, pitch: 60, duration: 1500 })
  }, [])

  const dismissAlert = useCallback((id) => setAlerts(prev => prev.filter(a => a.id !== id)), [])
  const dismissToast = useCallback((id) => setToasts(prev => prev.filter(t => t.toastId !== id)), [])

  const activeTourists = tourists.filter(t => t.active).length
  const openAlerts     = alerts.length
  const criticalAlerts = alerts.filter(a => ['FALL','SOS','CRITICAL'].includes(a.type?.toUpperCase())).length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#060d18', position: 'relative' }}>

      {/* ── Global toast stack ─────────────────────────────────── */}
      <div style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <AnimatePresence>
          {toasts.map(toast => (
            <AlertToast key={toast.toastId} alert={toast} onDismiss={dismissToast} />
          ))}
        </AnimatePresence>
      </div>

      {/* ── Stat cards — hidden in fullscreen ──────────────────── */}
      <AnimatePresence>
        {!mapFullscreen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ display: 'flex', gap: '12px', padding: '20px 24px 0', overflow: 'hidden' }}
          >
            <StatCard icon={Users}         label="Active Tourists" value={activeTourists} accent="#00e5cc"  sub="currently on trek"  onClick={() => navigate('/admin/tourists')} />
            <StatCard icon={AlertTriangle} label="Open Alerts"     value={openAlerts}     accent={openAlerts > 0 ? '#d4a843' : '#00e5cc'} sub={criticalAlerts > 0 ? `${criticalAlerts} critical` : 'all clear'} onClick={() => navigate('/admin/alerts')} />
            <StatCard icon={Hexagon}       label="Zones Active"    value={zones.filter(z=>z.active).length} accent="#2979ff"  sub="manage zones"       onClick={() => navigate('/admin/zones')} />
            <StatCard icon={Activity}      label="System Status"   value={wsStatus === 'connected' ? 'LIVE' : 'OFF'} accent={wsStatus === 'connected' ? '#00e5cc' : '#8B2020'} sub={wsStatus === 'connected' ? 'websocket connected' : 'reconnecting...'} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Map + Feed ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', gap: '12px', padding: mapFullscreen ? '8px' : '12px 24px 20px', minHeight: 0, transition: 'padding 0.3s' }}>

        {/* Map */}
        <div style={{ flex: 1, borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(0,229,204,0.08)', position: 'relative' }}>
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

          {/* WS badge */}
          <div style={{ position: 'absolute', top: '14px', left: '14px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(6,13,24,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,229,204,0.15)', borderRadius: '8px', padding: '6px 10px' }}>
            {wsStatus === 'connected' ? <Wifi size={12} color="#00e5cc" /> : <WifiOff size={12} color="#8B2020" />}
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: wsStatus === 'connected' ? '#00e5cc' : '#ff6b6b', letterSpacing: '0.5px' }}>
              {wsStatus === 'connected' ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          {/* Active badge */}
          <div style={{ position: 'absolute', top: '14px', left: '110px', background: 'rgba(6,13,24,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,229,204,0.15)', borderRadius: '8px', padding: '6px 10px' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.5px' }}>
              {activeTourists} ACTIVE
            </span>
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setMapFullscreen(f => !f)}
            style={{
              position: 'absolute', top: '14px', right: '50px',
              background: 'rgba(6,13,24,0.85)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(0,229,204,0.15)', borderRadius: '8px',
              padding: '7px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}
            title={mapFullscreen ? 'Exit fullscreen' : 'Fullscreen map'}
          >
            {mapFullscreen
              ? <Minimize2 size={13} color="rgba(255,255,255,0.6)" />
              : <Maximize2 size={13} color="rgba(255,255,255,0.6)" />
            }
          </button>
        </div>

        {/* Alert feed — collapsible */}
        <AnimatePresence initial={false}>
          {!mapFullscreen && (
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0, width: feedCollapsed ? 40 : 320 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
              style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                background: feedFlash ? 'rgba(139,32,32,0.15)' : '#0d1a2e',
                border: `1px solid ${feedFlash ? 'rgba(192,57,43,0.5)' : 'rgba(0,229,204,0.07)'}`,
                borderRadius: '16px',
                overflow: 'hidden',
                transition: 'background 0.3s, border 0.3s',
                willChange: 'width, transform',
              }}
            >
              {feedCollapsed ? (
                /* Collapsed strip */
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
                  <button
                    onClick={() => setFeedCollapsed(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
                  >
                    <ChevronLeft size={16} color="rgba(0,229,204,0.6)" />
                    {openAlerts > 0 && (
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: criticalAlerts > 0 ? '#c0392b' : '#d4a843', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontFamily: 'Bebas Neue, sans-serif', color: '#fff' }}>
                        {openAlerts > 9 ? '9+' : openAlerts}
                      </div>
                    )}
                  </button>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '1px', writingMode: 'vertical-rl', textTransform: 'uppercase' }}>
                    Alerts
                  </span>
                </div>
              ) : (
                /* Expanded feed */
                <div style={{ width: '320px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Header */}
                  <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(0,229,204,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '12px', fontWeight: '600', color: '#ffffff', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        Alert Feed
                      </span>
                      {wsStatus === 'connected' && (
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00e5cc', boxShadow: '0 0 6px #00e5cc' }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                        {openAlerts} total
                      </span>
                      <button
                        onClick={() => setFeedCollapsed(true)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                        title="Collapse feed"
                      >
                        <ChevronRight size={14} color="rgba(255,255,255,0.3)" />
                      </button>
                    </div>
                  </div>

                  {/* Alerts list */}
                  <div ref={alertFeedRef} style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                    <AnimatePresence mode="popLayout">
                      {alerts.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', marginTop: '40px' }}>
                          <TrendingUp size={24} color="rgba(0,229,204,0.2)" style={{ margin: '0 auto 10px' }} />
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>
                            No alerts — all clear
                          </p>
                        </motion.div>
                      ) : (
                        alerts.map(alert => (
                          <AlertCard key={alert.id} alert={alert} onDismiss={dismissAlert} onFlyTo={flyTo} />
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}