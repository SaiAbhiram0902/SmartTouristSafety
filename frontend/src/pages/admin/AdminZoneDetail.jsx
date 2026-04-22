import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  ArrowLeft, Shield, Users, AlertTriangle,
  Mountain, Clock, MapPin, Edit3, Trash2,
  Baby, PersonStanding, Accessibility, Navigation,
  CheckCircle, ChevronRight,
} from 'lucide-react'
import api from '../../lib/api'

const MAPTILER_KEY = 'jbYIDNeXWpUkQx80YgXc'

const RISK = {
  0: { label:'Safe',        color:'#22c55e' },
  1: { label:'Caution',     color:'#eab308' },
  2: { label:'Medium Risk', color:'#f97316' },
  3: { label:'High Risk',   color:'#ef4444' },
  4: { label:'Prohibited',  color:'#b91c1c' },
}

function formatTs(ts) {
  if (!ts) return '—'
  const s = ts.includes('T') ? ts : ts.replace(' ', 'T')
  const d = new Date(s.includes('+') || s.includes('Z') ? s : s + '+05:30')
  return d.toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true })
}

export default function AdminZoneDetail() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const mapRef     = useRef(null)
  const mapInst    = useRef(null)
  const [mapReady, setMapReady] = useState(false)  // state so tourist marker effect re-runs correctly

  const [zone,      setZone]      = useState(null)
  const [tourists,  setTourists]  = useState([])   // tourists with last location
  const [alerts,    setAlerts]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('tourists')
  const [ackAlert,  setAckAlert]  = useState(new Set())

  // ── Load zone + tourists + alerts ────────────────────────────
  useEffect(() => {
    Promise.all([
      api.get(`/zones/${id}`),
      api.get('/tourists/dashboard'),
      api.get('/alerts'),
    ]).then(([zRes, tRes, aRes]) => {
      const z = zRes.data
      setZone(z)

      // Filter tourists currently inside this zone's bounding box
      const inside = tRes.data
        .map(d => ({ ...d.tourist, lastLat: d.lastLocation?.latitude, lastLng: d.lastLocation?.longitude, lastSeen: d.lastLocation?.timestamp, latestAlert: d.latestAlert }))
        .filter(t => {
          if (!t.lastLat || !t.lastLng) return false
          return t.lastLat >= z.minLat && t.lastLat <= z.maxLat &&
                 t.lastLng >= z.minLon && t.lastLng <= z.maxLon
        })
      setTourists(inside)

      // Alerts relevant to this zone — either ZONE type mentioning zone name, or from tourists inside
      const touristIds = new Set(inside.map(t => t.touristId))
      const relevant = aRes.data.filter(a =>
        (a.type?.toUpperCase() === 'ZONE' && a.message?.includes(z.name)) ||
        touristIds.has(a.touristId)
      ).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0,30)
      setAlerts(relevant)
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  // ── Map init ─────────────────────────────────────────────────
  useEffect(() => {
    if (!zone || !mapRef.current || mapInst.current) return
    const centerLat = (zone.minLat + zone.maxLat) / 2
    const centerLon = (zone.minLon + zone.maxLon) / 2
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`,
      center: [centerLon, centerLat],
      zoom: 13, pitch: 40,
    })
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')
    map.on('load', () => {
      map.addSource('terrain', { type:'raster-dem', url:`https://api.maptiler.com/tiles/terrain-rgb/tiles.json?key=${MAPTILER_KEY}`, tileSize:256 })
      map.setTerrain({ source:'terrain', exaggeration:1.5 })

      const color = RISK[zone.dangerLevel]?.color ?? '#22c55e'
      const geojson = {
        type:'FeatureCollection',
        features:[{
          type:'Feature',
          properties:{ name:zone.name, color },
          geometry:{ type:'Polygon', coordinates:[[[zone.minLon,zone.minLat],[zone.maxLon,zone.minLat],[zone.maxLon,zone.maxLat],[zone.minLon,zone.maxLat],[zone.minLon,zone.minLat]]] }
        }]
      }
      map.addSource('zone', { type:'geojson', data:geojson })
      map.addLayer({ id:'zone-fill', type:'fill', source:'zone', paint:{ 'fill-color':color, 'fill-opacity':0.15 } })
      map.addLayer({ id:'zone-line', type:'line', source:'zone', paint:{ 'line-color':color, 'line-width':2.5, 'line-dasharray':[2,1.5] } })
      map.addLayer({ id:'zone-label', type:'symbol', source:'zone', layout:{ 'text-field':zone.name, 'text-font':['Open Sans Semibold','Arial Unicode MS Bold'], 'text-size':14 }, paint:{ 'text-color':color, 'text-halo-color':'#060d18', 'text-halo-width':2 } })

      mapInst.current = map
      setMapReady(true)
    })
    return () => { map.remove(); mapInst.current = null; setMapReady(false) }
  }, [zone])

  // Tourist markers on zone map
  useEffect(() => {
    if (!mapReady || !mapInst.current || !tourists.length) return
    tourists.forEach(t => {
      if (!t.lastLat || !t.lastLng) return
      const el = document.createElement('div')
      el.style.cssText = 'cursor:pointer;'
      const color = t.latestAlert && ['FALL','SOS','CRITICAL'].includes(t.latestAlert.type?.toUpperCase()) ? '#ef4444' : '#00e5cc'
      el.innerHTML = `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #060d18;box-shadow:0 0 6px ${color}"></div>`
      new maplibregl.Marker({ element: el, anchor:'center' })
        .setLngLat([t.lastLng, t.lastLat])
        .setPopup(new maplibregl.Popup({ offset:14, closeButton:false }).setHTML(`
          <div style="font-family:Outfit,sans-serif;font-size:12px;color:#fff;background:#0d1a2e;padding:8px 10px;border-radius:8px;border:1px solid rgba(0,229,204,0.2)">
            <b>${t.name}</b><br/><span style="font-size:10px;color:rgba(0,229,204,0.7)">${t.touristId}</span>
          </div>`))
        .addTo(mapInst.current)
    })
  }, [tourists, mapReady])

  if (loading) return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ fontFamily:'Inter,sans-serif', fontSize:'13px', color:'rgba(255,255,255,0.3)' }}>Loading zone...</p>
    </div>
  )

  if (!zone) return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ fontFamily:'Inter,sans-serif', fontSize:'13px', color:'rgba(255,255,255,0.3)' }}>Zone not found.</p>
    </div>
  )

  const color = RISK[zone.dangerLevel]?.color ?? '#22c55e'
  const visAlerts = alerts.filter(a => !ackAlert.has(a.id))

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div style={{ padding:'16px 24px', borderBottom:'1px solid rgba(0,229,204,0.07)', flexShrink:0, display:'flex', alignItems:'center', gap:'16px', background:'#0a1628' }}>
        <button onClick={() => navigate('/admin/zones')} style={{ background:'none', border:'none', cursor:'pointer', padding:'6px', borderRadius:'8px', color:'rgba(255,255,255,0.4)', display:'flex', alignItems:'center' }}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
          onMouseLeave={e=>e.currentTarget.style.background='none'}>
          <ArrowLeft size={16} />
        </button>

        <div style={{ height:'32px', width:'1px', background:'rgba(255,255,255,0.08)' }} />

        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <h1 style={{ fontFamily:'Outfit,sans-serif', fontSize:'18px', fontWeight:'700', color:'#fff' }}>{zone.name}</h1>
            <span style={{ fontFamily:'Inter,sans-serif', fontSize:'10px', fontWeight:'700', color, background:`${color}18`, padding:'3px 10px', borderRadius:'20px', border:`1px solid ${color}44` }}>
              {RISK[zone.dangerLevel]?.label}
            </span>
            {!zone.active && <span style={{ fontFamily:'Inter,sans-serif', fontSize:'10px', color:'rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.06)', padding:'3px 8px', borderRadius:'20px' }}>Inactive</span>}
          </div>
          {zone.description && <p style={{ fontFamily:'Inter,sans-serif', fontSize:'12px', color:'rgba(255,255,255,0.4)', marginTop:'3px' }}>{zone.description}</p>}
        </div>

        {/* Quick stats */}
        <div style={{ display:'flex', gap:'10px' }}>
          {[
            { icon:Users,         val: tourists.length,  label:'In Zone',   col:'#00e5cc' },
            { icon:AlertTriangle, val: visAlerts.length,  label:'Alerts',    col: visAlerts.length > 0 ? '#ef4444' : 'rgba(255,255,255,0.3)' },
            { icon:Mountain,      val: zone.maxAltitude > 0 ? `${zone.maxAltitude}m` : '—', label:'Max Alt', col:'rgba(255,255,255,0.4)' },
          ].map(s => (
            <div key={s.label} style={{ textAlign:'center', padding:'8px 14px', borderRadius:'10px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'20px', color:s.col, lineHeight:1 }}>{s.val}</p>
              <p style={{ fontFamily:'Inter,sans-serif', fontSize:'9px', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.5px', marginTop:'3px' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <button onClick={() => navigate(`/admin/zones`)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', borderRadius:'10px', cursor:'pointer', fontFamily:'Outfit,sans-serif', fontSize:'11px', fontWeight:'700', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)' }}>
          <MapPin size={12} /> All Zones
        </button>
      </div>

      {/* ── Body: map + panels ───────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* Map */}
        <div style={{ flex:1, position:'relative' }}>
          <div ref={mapRef} style={{ width:'100%', height:'100%' }} />
          <div style={{ position:'absolute', bottom:'16px', left:'16px', background:'rgba(10,22,40,0.9)', backdropFilter:'blur(8px)', border:`1px solid ${color}33`, borderRadius:'10px', padding:'10px 14px', fontFamily:'JetBrains Mono,monospace', fontSize:'10px', color:'rgba(255,255,255,0.4)', lineHeight:1.8 }}>
            <p>{zone.minLat.toFixed(5)}, {zone.minLon.toFixed(5)}</p>
            <p>{zone.maxLat.toFixed(5)}, {zone.maxLon.toFixed(5)}</p>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ width:'340px', flexShrink:0, display:'flex', flexDirection:'column', background:'#0a1628', borderLeft:'1px solid rgba(0,229,204,0.07)', overflow:'hidden' }}>

          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.05)', flexShrink:0 }}>
            {[
              { key:'tourists', label:'In Zone', count: tourists.length },
              { key:'alerts',   label:'Alerts',  count: visAlerts.length },
              { key:'info',     label:'Details', count: null },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ flex:1, padding:'11px 6px', background:'none', border:'none', borderBottom:`2px solid ${tab===t.key ? color : 'transparent'}`, cursor:'pointer', fontFamily:'Outfit,sans-serif', fontSize:'11px', fontWeight:'600', letterSpacing:'0.7px', textTransform:'uppercase', color: tab===t.key ? color : 'rgba(255,255,255,0.3)', transition:'color 0.15s' }}>
                {t.label}{t.count != null && t.count > 0 ? ` (${t.count})` : ''}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex:1, overflowY:'auto' }}>
            <AnimatePresence mode="wait">

              {/* Tourists in zone */}
              {tab === 'tourists' && (
                <motion.div key="tourists" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} style={{ padding:'14px' }}>
                  {tourists.length === 0
                    ? <div style={{ textAlign:'center', padding:'40px 0' }}>
                        <Users size={28} color="rgba(255,255,255,0.08)" style={{ margin:'0 auto 10px' }} />
                        <p style={{ fontFamily:'Inter,sans-serif', fontSize:'12px', color:'rgba(255,255,255,0.2)' }}>No tourists currently in this zone</p>
                      </div>
                    : tourists.map(t => {
                        const tColor = t.latestAlert && ['FALL','SOS','CRITICAL'].includes(t.latestAlert.type?.toUpperCase()) ? '#ef4444' : '#00e5cc'
                        return (
                          <div key={t.touristId} style={{ marginBottom:'8px', padding:'11px 13px', borderRadius:'10px', background:`${tColor}08`, border:`1px solid ${tColor}22`, cursor:'pointer' }}
                            onClick={() => navigate(`/admin/tourists/${t.touristId}`)}>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'5px' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:tColor, boxShadow:`0 0 5px ${tColor}` }} />
                                <span style={{ fontFamily:'Outfit,sans-serif', fontSize:'13px', fontWeight:'600', color:'#fff' }}>{t.name}</span>
                              </div>
                              <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'10px', color:`${tColor}cc`, background:`${tColor}18`, padding:'1px 6px', borderRadius:'4px' }}>{t.touristId}</span>
                            </div>
                            <div style={{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
                              {t.child       && <span style={{ display:'flex', alignItems:'center', gap:'3px', fontSize:'10px', fontWeight:'600', color:'#d4a843', fontFamily:'Inter,sans-serif' }}><Baby size={10} /> Child</span>}
                              {t.elder       && <span style={{ display:'flex', alignItems:'center', gap:'3px', fontSize:'10px', fontWeight:'600', color:'#2979ff', fontFamily:'Inter,sans-serif' }}><PersonStanding size={10} /> Senior</span>}
                              {t.handicapped && <span style={{ display:'flex', alignItems:'center', gap:'3px', fontSize:'10px', fontWeight:'600', color:'#00e5cc', fontFamily:'Inter,sans-serif' }}><Accessibility size={10} /> Special Needs</span>}
                              {t.lastSeen && <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', fontFamily:'Inter,sans-serif', display:'flex', alignItems:'center', gap:'3px', marginLeft:'auto' }}><Clock size={9} /> {formatTs(t.lastSeen)}</span>}
                            </div>
                            {t.latestAlert && ['FALL','SOS','CRITICAL'].includes(t.latestAlert.type?.toUpperCase()) && (
                              <div style={{ marginTop:'6px', padding:'4px 8px', borderRadius:'6px', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', fontSize:'10px', color:'#ef4444', fontFamily:'Outfit,sans-serif', fontWeight:'600' }}>
                                {t.latestAlert.type} — {t.latestAlert.message?.slice(0,50)}
                              </div>
                            )}
                          </div>
                        )
                      })
                  }
                </motion.div>
              )}

              {/* Alerts */}
              {tab === 'alerts' && (
                <motion.div key="alerts" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} style={{ padding:'14px' }}>
                  {visAlerts.length === 0
                    ? <div style={{ textAlign:'center', padding:'40px 0' }}>
                        <Shield size={28} color="rgba(255,255,255,0.08)" style={{ margin:'0 auto 10px' }} />
                        <p style={{ fontFamily:'Inter,sans-serif', fontSize:'12px', color:'rgba(255,255,255,0.2)' }}>No active alerts for this zone</p>
                      </div>
                    : visAlerts.map(a => {
                        const aColors = { FALL:'#c0392b', SOS:'#c0392b', CRITICAL:'#c0392b', HIGH:'#d4a843', MEDIUM:'#d4a843', OVERDUE:'#d4a843', ZONE:'#2979ff' }
                        const ac = aColors[a.type?.toUpperCase()] ?? '#2979ff'
                        return (
                          <div key={a.id} style={{ padding:'10px 12px', borderRadius:'9px', background:`${ac}11`, border:`1px solid ${ac}33`, borderLeft:`2px solid ${ac}`, marginBottom:'8px' }}>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'4px' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                                <span style={{ fontFamily:'Outfit,sans-serif', fontSize:'10px', fontWeight:'700', color:ac, letterSpacing:'1px' }}>{a.type}</span>
                                <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'9px', color:'rgba(255,255,255,0.3)' }}>{a.touristId}</span>
                              </div>
                              <button onClick={() => setAckAlert(prev => new Set([...prev, a.id]))}
                                style={{ display:'flex', alignItems:'center', gap:'3px', padding:'2px 7px', borderRadius:'6px', cursor:'pointer', fontFamily:'Inter,sans-serif', fontSize:'9px', fontWeight:'600', background:'rgba(0,229,204,0.08)', border:'1px solid rgba(0,229,204,0.2)', color:'#00e5cc' }}>
                                <CheckCircle size={9} /> Ack
                              </button>
                            </div>
                            <p style={{ fontFamily:'Inter,sans-serif', fontSize:'11px', color:'rgba(255,255,255,0.6)', lineHeight:1.5 }}>{a.message}</p>
                            <p style={{ fontFamily:'Inter,sans-serif', fontSize:'10px', color:'rgba(255,255,255,0.25)', marginTop:'4px' }}>{formatTs(a.timestamp)}</p>
                          </div>
                        )
                      })
                  }
                </motion.div>
              )}

              {/* Zone info */}
              {tab === 'info' && (
                <motion.div key="info" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} style={{ padding:'14px', display:'flex', flexDirection:'column', gap:'10px' }}>
                  {[
                    { label:'Risk Level',   value: RISK[zone.dangerLevel]?.label },
                    { label:'Status',       value: zone.active ? 'Active' : 'Inactive' },
                    { label:'Max Altitude', value: zone.maxAltitude > 0 ? `${zone.maxAltitude}m` : 'No limit' },
                    { label:'Restricted',   value: zone.restricted ? 'Yes — alerts on entry' : 'No' },
                    { label:'SW Corner',    value: `${zone.minLat.toFixed(5)}, ${zone.minLon.toFixed(5)}` },
                    { label:'NE Corner',    value: `${zone.maxLat.toFixed(5)}, ${zone.maxLon.toFixed(5)}` },
                  ].map(row => (
                    <div key={row.label} style={{ display:'flex', justifyContent:'space-between', padding:'9px 12px', borderRadius:'8px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontFamily:'Inter,sans-serif', fontSize:'11px', color:'rgba(255,255,255,0.35)' }}>{row.label}</span>
                      <span style={{ fontFamily:'Inter,sans-serif', fontSize:'11px', color:'rgba(255,255,255,0.75)' }}>{row.value}</span>
                    </div>
                  ))}
                  <button onClick={() => navigate('/admin/zones')} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', padding:'10px', borderRadius:'10px', cursor:'pointer', fontFamily:'Outfit,sans-serif', fontSize:'12px', fontWeight:'700', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', marginTop:'6px' }}>
                    <Edit3 size={12} /> Edit in Zones Manager
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}