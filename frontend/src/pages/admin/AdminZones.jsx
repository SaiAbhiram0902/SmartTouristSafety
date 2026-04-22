import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Trash2, Edit3, X, Check, ChevronRight,
  MapPin, Eye, EyeOff, Mountain,
  ShieldAlert, Shield, Layers, RotateCcw,
  Baby, PersonStanding, Accessibility,
} from 'lucide-react'
import api from '../../lib/api'

const MAPTILER_KEY = 'jbYIDNeXWpUkQx80YgXc'

const RISK = {
  0: { label: 'Safe',        color: '#22c55e', opacity: 0.13 },
  1: { label: 'Caution',     color: '#eab308', opacity: 0.13 },
  2: { label: 'Medium Risk', color: '#f97316', opacity: 0.15 },
  3: { label: 'High Risk',   color: '#ef4444', opacity: 0.17 },
  4: { label: 'Prohibited',  color: '#b91c1c', opacity: 0.22 },
}

// ── Helpers ───────────────────────────────────────────────────────
function riskColor(level)   { return RISK[level]?.color   ?? '#22c55e' }
function riskLabel(level)   { return RISK[level]?.label   ?? 'Safe'    }

// ── Zone breach item ──────────────────────────────────────────────
function ZoneBreachItem({ breach, onAcknowledge }) {
  const color = riskColor(breach.dangerLevel ?? 1)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', borderRadius:'10px', background:`${color}11`, border:`1px solid ${color}33`, borderLeft:`3px solid ${color}`, marginBottom:'8px' }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
          <span style={{ fontFamily:'Outfit,sans-serif', fontSize:'12px', fontWeight:'700', color:'#fff' }}>{breach.touristId}</span>
        </div>
        <p style={{ fontFamily:'Inter,sans-serif', fontSize:'11px', color:'rgba(255,255,255,0.45)', lineHeight:1.4 }}>{breach.message}</p>
      </div>
      <button onClick={() => onAcknowledge(breach.id)} style={{ display:'flex', alignItems:'center', gap:'4px', padding:'5px 10px', borderRadius:'7px', cursor:'pointer', fontFamily:'Inter,sans-serif', fontSize:'10px', fontWeight:'600', background:'rgba(0,229,204,0.08)', border:'1px solid rgba(0,229,204,0.2)', color:'#00e5cc', flexShrink:0 }}>
        <Check size={11} /> Ack
      </button>
    </div>
  )
}

// ── Zone list item ─────────────────────────────────────────────────
function ZoneItem({ zone, selected, onClick, onToggle, onDelete, onEdit }) {
  const color = riskColor(zone.dangerLevel)
  const [hover, setHover] = useState(false)
  return (
    <motion.div layout initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ borderRadius:'12px', overflow:'hidden', marginBottom:'6px', border:`1px solid ${selected ? color+'55' : hover ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`, background: selected ? `${color}08` : 'transparent', transition:'border 0.15s,background 0.15s', cursor:'pointer', opacity: zone.active ? 1 : 0.45 }}
    >
      <div style={{ height:'2px', background: zone.active ? color : 'rgba(255,255,255,0.08)' }} />
      <div style={{ padding:'12px 14px' }} onClick={onClick}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom: zone.description ? '6px' : '0' }}>
          <div style={{ width:'7px', height:'7px', flexShrink:0, borderRadius:'50%', background: zone.active ? color : 'rgba(255,255,255,0.2)', boxShadow: zone.active ? `0 0 5px ${color}` : 'none' }} />
          <p style={{ fontFamily:'Outfit,sans-serif', fontSize:'13px', fontWeight:'600', color: zone.active ? '#fff' : 'rgba(255,255,255,0.4)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{zone.name}</p>
          <span style={{ fontFamily:'Inter,sans-serif', fontSize:'10px', fontWeight:'600', color, background:`${color}18`, padding:'2px 8px', borderRadius:'20px', border:`1px solid ${color}33`, flexShrink:0 }}>{riskLabel(zone.dangerLevel)}</span>
        </div>
        {zone.description && <p style={{ fontFamily:'Inter,sans-serif', fontSize:'11px', color:'rgba(255,255,255,0.3)', paddingLeft:'15px', lineHeight:1.5 }}>{zone.description}</p>}
        {zone.maxAltitude > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:'4px', paddingLeft:'15px', marginTop:'4px' }}>
            <Mountain size={9} color="rgba(255,255,255,0.25)" />
            <span style={{ fontFamily:'Inter,sans-serif', fontSize:'10px', color:'rgba(255,255,255,0.25)' }}>Max {zone.maxAltitude}m</span>
          </div>
        )}
      </div>
      <AnimatePresence>
        {hover && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
            style={{ borderTop:'1px solid rgba(255,255,255,0.04)', display:'flex', overflow:'hidden' }}
          >
            {[
              { icon:Edit3,  label:'Edit',   fn:(e)=>{ e.stopPropagation(); onEdit(zone) },              col:'rgba(255,255,255,0.45)' },
              { icon: zone.active ? EyeOff : Eye, label: zone.active ? 'Disable' : 'Enable', fn:(e)=>{ e.stopPropagation(); onToggle(zone.id) }, col: zone.active ? '#d4a843' : '#00e5cc' },
              { icon:Trash2, label:'Delete', fn:(e)=>{ e.stopPropagation(); onDelete(zone.id, zone.name) }, col:'#ef4444' },
            ].map(({ icon:Icon, label, fn, col }) => (
              <button key={label} onClick={fn}
                style={{ flex:1, padding:'8px', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'4px', fontFamily:'Inter,sans-serif', fontSize:'10px', fontWeight:'600', color:col }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background='none'}
              >
                <Icon size={11} strokeWidth={2} /> {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Zone form ─────────────────────────────────────────────────────
function ZoneForm({ zone, drawBounds, polygonCoords, onSave, onCancel, onStartDraw, onStartPolygon, onClearDraw, isDrawing, isPolygon }) {
  const [form, setForm] = useState(() => ({
    name:        zone?.name        ?? '',
    description: zone?.description ?? '',
    dangerLevel: zone?.dangerLevel ?? 0,
    maxAltitude: zone?.maxAltitude ?? 0,
    restricted:  zone?.restricted  ?? false,
    minLat: zone?.minLat ?? '', maxLat: zone?.maxLat ?? '',
    minLon: zone?.minLon ?? '', maxLon: zone?.maxLon ?? '',
    active: zone?.active ?? true,
  }))
  const [errors, setErrors] = useState({})

  // Sync when drawBounds changes (after drag draw completes)
  useEffect(() => {
    if (!drawBounds) return
    setForm(prev => ({ ...prev,
      minLat: drawBounds.minLat, maxLat: drawBounds.maxLat,
      minLon: drawBounds.minLon, maxLon: drawBounds.maxLon,
    }))
  }, [drawBounds])

  // Sync bounding box from polygon coords
  useEffect(() => {
    if (!polygonCoords?.length) return
    const lats = polygonCoords.map(c => c[1])
    const lons = polygonCoords.map(c => c[0])
    setForm(prev => ({
      ...prev,
      minLat: Math.min(...lats).toFixed(6),
      maxLat: Math.max(...lats).toFixed(6),
      minLon: Math.min(...lons).toFixed(6),
      maxLon: Math.max(...lons).toFixed(6),
    }))
  }, [polygonCoords])

  function validate() {
    const e = {}
    if (!form.name.trim())  e.name   = 'Required'
    if (form.minLat === '') e.minLat = 'Required'
    if (form.maxLat === '') e.maxLat = 'Required'
    if (form.minLon === '') e.minLon = 'Required'
    if (form.maxLon === '') e.maxLon = 'Required'
    setErrors(e)
    return !Object.keys(e).length
  }

  function handleSave() {
    if (!validate()) return
    onSave({
      ...form, id: zone?.id,
      minLat: parseFloat(form.minLat), maxLat: parseFloat(form.maxLat),
      minLon: parseFloat(form.minLon), maxLon: parseFloat(form.maxLon),
      maxAltitude: parseFloat(form.maxAltitude) || 0,
      dangerLevel: parseInt(form.dangerLevel),
      polygonCoords: polygonCoords?.length >= 3 ? polygonCoords : null,
    })
  }

  const inp = field => e => setForm(p => ({ ...p, [field]: e.target.value }))
  const IS  = (err) => ({ width:'100%', padding:'9px 11px', borderRadius:'8px', fontSize:'12px', fontFamily:'Inter,sans-serif', color:'#fff', outline:'none', boxSizing:'border-box', background:'rgba(255,255,255,0.04)', border:`1px solid ${err ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}` })
  const LS  = { fontFamily:'Inter,sans-serif', fontSize:'10px', color:'rgba(0,229,204,0.7)', letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:'4px', display:'block' }

  const hasBounds = form.minLat !== '' && form.minLon !== ''

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'14px', padding:'16px' }}>

      {/* Draw tools */}
      <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
        <label style={LS}>Draw Zone on Map</label>
        <div style={{ display:'flex', gap:'6px' }}>
          <button type="button" onClick={onStartDraw}
            style={{ flex:1, padding:'8px', borderRadius:'8px', cursor:'pointer', fontFamily:'Inter,sans-serif', fontSize:'11px', fontWeight:'600', background: isDrawing && !isPolygon ? 'rgba(0,229,204,0.15)' : 'rgba(0,229,204,0.06)', border:`1px solid ${isDrawing && !isPolygon ? 'rgba(0,229,204,0.4)' : 'rgba(0,229,204,0.2)'}`, color:'#00e5cc', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px' }}>
            <Edit3 size={11} /> Rectangle
          </button>
          <button type="button" onClick={onStartPolygon}
            style={{ flex:1, padding:'8px', borderRadius:'8px', cursor:'pointer', fontFamily:'Inter,sans-serif', fontSize:'11px', fontWeight:'600', background: isPolygon ? 'rgba(0,229,204,0.15)' : 'rgba(0,229,204,0.06)', border:`1px solid ${isPolygon ? 'rgba(0,229,204,0.4)' : 'rgba(0,229,204,0.2)'}`, color:'#00e5cc', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px' }}>
            <Layers size={11} /> Polygon
          </button>
          {hasBounds && (
            <button type="button" onClick={onClearDraw}
              style={{ padding:'8px 10px', borderRadius:'8px', cursor:'pointer', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', display:'flex', alignItems:'center' }}>
              <RotateCcw size={11} />
            </button>
          )}
        </div>
        <p style={{ fontFamily:'Inter,sans-serif', fontSize:'10px', color: hasBounds ? '#22c55e' : 'rgba(255,255,255,0.25)', margin:0 }}>
          {isDrawing && !isPolygon ? 'Click and drag on the map...' :
           isPolygon ? 'Click points on map. Double-click to finish.' :
           hasBounds ? '✓ Boundary set — or enter manually below' :
           'Draw on map or enter coordinates manually below'}
        </p>
      </div>

      {/* Name */}
      <div>
        <label style={LS}>Zone Name *</label>
        <input value={form.name} onChange={inp('name')} placeholder="e.g. North Ridge Cliff" style={IS(errors.name)} />
        {errors.name && <p style={{ color:'#ef4444', fontSize:'10px', marginTop:'3px', fontFamily:'Inter,sans-serif' }}>{errors.name}</p>}
      </div>

      {/* Description */}
      <div>
        <label style={LS}>Description</label>
        <textarea value={form.description} onChange={inp('description')} placeholder="Hazards, restrictions, notes..." rows={2} style={{ ...IS(false), resize:'vertical', lineHeight:1.5 }} />
      </div>

      {/* Risk level */}
      <div>
        <label style={LS}>Risk Level *</label>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'5px' }}>
          {Object.entries(RISK).map(([level, cfg]) => (
            <button key={level} type="button"
              onClick={() => setForm(p => ({ ...p, dangerLevel: parseInt(level), restricted: parseInt(level) >= 3 }))}
              style={{ padding:'7px 4px', borderRadius:'8px', cursor:'pointer', border:`1px solid ${form.dangerLevel === parseInt(level) ? cfg.color : 'rgba(255,255,255,0.07)'}`, background: form.dangerLevel === parseInt(level) ? `${cfg.color}22` : 'rgba(255,255,255,0.02)', fontFamily:'Inter,sans-serif', fontSize:'9px', fontWeight:'600', color: form.dangerLevel === parseInt(level) ? cfg.color : 'rgba(255,255,255,0.3)', textAlign:'center', lineHeight:1.4 }}>
              <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:cfg.color, margin:'0 auto 4px' }} />
              {cfg.label}
            </button>
          ))}
        </div>
        <p style={{ fontFamily:'Inter,sans-serif', fontSize:'10px', color:'rgba(255,255,255,0.2)', marginTop:'5px' }}>Level 3+ marks restricted — tourists trigger alerts on entry.</p>
      </div>

      {/* Bounding box (always shown, populated by draw or manually) */}
      <div>
        <label style={LS}>Bounding Box *</label>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'7px' }}>
          {[['minLat','Min Lat'],['maxLat','Max Lat'],['minLon','Min Lon'],['maxLon','Max Lon']].map(([f, l]) => (
            <div key={f}>
              <label style={{ ...LS, fontSize:'9px', color:'rgba(255,255,255,0.25)' }}>{l}</label>
              <input value={form[f]} onChange={inp(f)} type="number" step="0.0001" style={IS(errors[f])} />
            </div>
          ))}
        </div>
      </div>

      {/* Max altitude */}
      <div>
        <label style={LS}>Max Altitude (m) — optional</label>
        <input value={form.maxAltitude} onChange={inp('maxAltitude')} type="number" placeholder="0 = no limit" style={IS(false)} />
      </div>

      <div style={{ display:'flex', gap:'8px' }}>
        <button onClick={handleSave} style={{ flex:1, padding:'10px', borderRadius:'10px', cursor:'pointer', fontFamily:'Outfit,sans-serif', fontSize:'12px', fontWeight:'700', background:'linear-gradient(135deg,#00e5cc,#00b8a4)', border:'none', color:'#060d18' }}>
          {zone ? 'Save Changes' : 'Create Zone'}
        </button>
        <button onClick={onCancel} style={{ padding:'10px 14px', borderRadius:'10px', cursor:'pointer', fontFamily:'Inter,sans-serif', fontSize:'12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function AdminZones() {
  const navigate      = useNavigate()
  const mapRef           = useRef(null)
  const mapInstance      = useRef(null)
  const drawStart        = useRef(null)
  const polygonPts       = useRef([])
  const zonesRef         = useRef([])
  const showZonesRef     = useRef(true)
  const selectedPopupRef = useRef(null)

  const [zones,        setZones]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [mapReady,     setMapReady]     = useState(false)  // STATE not ref — triggers zone redraw
  const [selectedZone, setSelectedZone] = useState(null)
  const [panel,        setPanel]        = useState('list')
  const [editZone,     setEditZone]     = useState(null)
  const [drawBounds,   setDrawBounds]   = useState(null)
  const [isDrawing,    setIsDrawing]    = useState(false)   // rect drag mode
  const [isPolygon,    setIsPolygon]    = useState(false)   // polygon click mode
  const [polygonCoords,setPolygonCoords]= useState([])      // completed polygon
  const [drawRect,     setDrawRect]     = useState(null)
  const [breaches,     setBreaches]     = useState([])
  const [ackBreaches,  setAckBreaches]  = useState(new Set())
  const [filterLevel,  setFilterLevel]  = useState('all')
  const [showZones,    setShowZones]    = useState(true)    // map toggle

  // ── Load data ─────────────────────────────────────────────────
  const loadZones = useCallback(() => {
    api.get('/zones').then(r => { setZones(r.data); zonesRef.current = r.data }).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadZones() }, [loadZones])

  useEffect(() => {
    api.get('/alerts').then(r => {
      setBreaches(r.data.filter(a => a.type?.toUpperCase() === 'ZONE'))
    }).catch(console.error)
  }, [])

  // ── Map init ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`,
      center: [77.0595, 10.0889],
      zoom: 11,
      pitch: 35,
    })
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')
    map.on('load', () => {
      map.addSource('terrain', { type:'raster-dem', url:`https://api.maptiler.com/tiles/terrain-rgb/tiles.json?key=${MAPTILER_KEY}`, tileSize:256 })
      map.setTerrain({ source:'terrain', exaggeration:1.5 })

      // Sources for zones and polygon preview
      map.addSource('zones-src', { type:'geojson', data:{ type:'FeatureCollection', features:[] } })
      map.addSource('poly-preview', { type:'geojson', data:{ type:'FeatureCollection', features:[] } })

      map.addLayer({ id:'zone-fill',   type:'fill',   source:'zones-src', paint:{ 'fill-color':['get','color'], 'fill-opacity':['get','opacity'] } })
      map.addLayer({ id:'zone-line',   type:'line',   source:'zones-src', paint:{ 'line-color':['get','color'], 'line-width':2, 'line-dasharray':[2,1.5] } })
      map.addLayer({ id:'zone-label',  type:'symbol', source:'zones-src', layout:{ 'text-field':['get','name'], 'text-font':['Open Sans Semibold','Arial Unicode MS Bold'], 'text-size':12, 'text-anchor':'center' }, paint:{ 'text-color':['get','color'], 'text-halo-color':'#060d18', 'text-halo-width':2 } })

      // Polygon preview layers
      map.addLayer({ id:'poly-line',   type:'line',   source:'poly-preview', paint:{ 'line-color':'#00e5cc', 'line-width':2, 'line-dasharray':[3,2] } })
      map.addLayer({ id:'poly-fill',   type:'fill',   source:'poly-preview', paint:{ 'fill-color':'#00e5cc', 'fill-opacity':0.08 } })

      // Click zone on map
      map.on('click', 'zone-fill', (e) => {
        const id = e.features[0]?.properties?.id
        if (id) setSelectedZone(prev => prev?.id === id ? null : zones.find(z => z.id === id) ?? null)
      })
      map.on('mouseenter', 'zone-fill', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'zone-fill', () => { map.getCanvas().style.cursor = '' })

      mapInstance.current = map
      setMapReady(true)

      // Seed zones immediately in case they loaded before the map was ready
      const initialZones = zonesRef.current
      if (initialZones.length) {
        const src = map.getSource('zones-src')
        if (src) src.setData(buildGeoJSON(initialZones, showZonesRef.current))
      }
    })
    return () => { map.remove(); mapInstance.current = null; setMapReady(false) }
  }, [])

  // ── Redraw zones whenever data, toggle, or map ready changes ────
  function buildGeoJSON(zoneList, show) {
    const visible = show ? zoneList.filter(z => z.active) : []
    return {
      type: 'FeatureCollection',
      features: visible.map(z => ({
        type: 'Feature',
        properties: { id:z.id, name:z.name, color:riskColor(z.dangerLevel), opacity:RISK[z.dangerLevel]?.opacity ?? 0.13 },
        geometry: z.polygonCoords?.length >= 3
          ? { type:'Polygon', coordinates:[[...z.polygonCoords, z.polygonCoords[0]]] }
          : { type:'Polygon', coordinates:[[[z.minLon,z.minLat],[z.maxLon,z.minLat],[z.maxLon,z.maxLat],[z.minLon,z.maxLat],[z.minLon,z.minLat]]] },
      })),
    }
  }

  useEffect(() => {
    if (!mapReady || !mapInstance.current) return
    const src = mapInstance.current.getSource('zones-src')
    if (!src) return
    showZonesRef.current = showZones
    src.setData(buildGeoJSON(zones, showZones))
  }, [zones, showZones, mapReady])

  // ── Update polygon preview on map ─────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return
    const src = mapInstance.current.getSource('poly-preview')
    if (!src) return
    if (polygonCoords.length < 2) { src.setData({ type:'FeatureCollection', features:[] }); return }
    const ring = [...polygonCoords, polygonCoords[0]]
    src.setData({
      type:'FeatureCollection',
      features:[
        { type:'Feature', geometry:{ type:'Polygon', coordinates:[ring] }, properties:{} },
        { type:'Feature', geometry:{ type:'LineString', coordinates: polygonCoords }, properties:{} },
      ],
    })
  }, [polygonCoords, mapReady])

  // Fit map to selected zone + show popup anchored to zone center
  useEffect(() => {
    // Close any existing popup
    if (selectedPopupRef.current) { selectedPopupRef.current.remove(); selectedPopupRef.current = null }
    if (!selectedZone || !mapInstance.current) return

    const map = mapInstance.current
    const color = riskColor(selectedZone.dangerLevel)
    const centerLat = (selectedZone.minLat + selectedZone.maxLat) / 2
    const centerLon = (selectedZone.minLon + selectedZone.maxLon) / 2

    map.fitBounds(
      [[selectedZone.minLon, selectedZone.minLat],[selectedZone.maxLon, selectedZone.maxLat]],
      { padding: 80, maxZoom: 16, duration: 900 }
    )

    // Small delay so the map has moved before popup opens
    setTimeout(() => {
      if (!mapInstance.current) return
      const popup = new maplibregl.Popup({ closeButton: false, maxWidth: '340px', anchor:'bottom', offset: 10 })
        .setLngLat([centerLon, centerLat])
        .setHTML(`
          <div style="background:rgba(10,22,40,0.97);backdrop-filter:blur(12px);border:1px solid ${color}55;border-bottom:3px solid ${color};border-radius:14px;padding:14px 18px;min-width:280px;box-shadow:0 8px 32px rgba(0,0,0,0.6)">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px">
              <div>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                  <span style="font-family:Outfit,sans-serif;font-size:15px;font-weight:700;color:#fff">${selectedZone.name}</span>
                  <span style="font-family:Inter,sans-serif;font-size:10px;font-weight:700;color:${color};background:${color}22;padding:2px 8px;border-radius:20px;border:1px solid ${color}44">${riskLabel(selectedZone.dangerLevel)}</span>
                </div>
                ${selectedZone.description ? `<p style="font-family:Inter,sans-serif;font-size:12px;color:rgba(255,255,255,0.5);line-height:1.5">${selectedZone.description}</p>` : ''}
              </div>
              <button onclick="window.__zonePopupClose&&window.__zonePopupClose()" style="background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.35);font-size:16px;line-height:1;padding:0">×</button>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
              <span style="font-family:JetBrains Mono,monospace;font-size:9px;color:rgba(255,255,255,0.25)">${parseFloat(selectedZone.minLat).toFixed(4)},${parseFloat(selectedZone.minLon).toFixed(4)} → ${parseFloat(selectedZone.maxLat).toFixed(4)},${parseFloat(selectedZone.maxLon).toFixed(4)}</span>
              <div style="display:flex;align-items:center;gap:4px">
                <div style="width:6px;height:6px;border-radius:50%;background:${selectedZone.active ? '#00e5cc' : 'rgba(255,255,255,0.2)'}"></div>
                <span style="font-family:Inter,sans-serif;font-size:10px;color:${selectedZone.active ? '#00e5cc' : 'rgba(255,255,255,0.3)'}">${selectedZone.active ? 'Active' : 'Inactive'}</span>
              </div>
              <button onclick="window.__zoneDetailNav&&window.__zoneDetailNav(${selectedZone.id})" style="margin-left:auto;display:flex;align-items:center;gap:5px;padding:5px 12px;border-radius:7px;cursor:pointer;font-family:Outfit,sans-serif;font-size:11px;font-weight:700;background:linear-gradient(135deg,${color},${color}99);border:none;color:#fff">
                View Details →
              </button>
            </div>
          </div>
        `)
        .addTo(map)
      window.__zonePopupClose = () => { popup.remove(); selectedPopupRef.current = null; setSelectedZone(null) }
      window.__zoneDetailNav  = (id) => navigate(`/admin/zones/${id}`)
      selectedPopupRef.current = popup
    }, 500)
  }, [selectedZone])

  // ── Draw mode: disable/enable map drag ────────────────────────
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    if (isDrawing) {
      map.dragPan.disable()
      map.getCanvas().style.cursor = 'crosshair'
    } else {
      map.dragPan.enable()
      map.getCanvas().style.cursor = ''
    }
  }, [isDrawing])

  // Polygon mode: bind click handler on map
  useEffect(() => {
    const map = mapInstance.current
    if (!map || !mapReady) return

    if (isPolygon) {
      map.dragPan.disable()
      map.getCanvas().style.cursor = 'crosshair'

      const onClick = (e) => {
        polygonPts.current = [...polygonPts.current, [e.lngLat.lng, e.lngLat.lat]]
        setPolygonCoords([...polygonPts.current])
      }
      const onDblClick = (e) => {
        e.preventDefault()
        if (polygonPts.current.length >= 3) {
          setPolygonCoords([...polygonPts.current])
        }
        // Finish
        map.off('click', onClick)
        map.off('dblclick', onDblClick)
        map.dragPan.enable()
        map.getCanvas().style.cursor = ''
        setIsPolygon(false)
      }
      map.on('click', onClick)
      map.on('dblclick', onDblClick)
      return () => {
        map.off('click', onClick)
        map.off('dblclick', onDblClick)
        map.dragPan.enable()
        map.getCanvas().style.cursor = ''
      }
    }
  }, [isPolygon, mapReady])

  // ── Rect draw handlers (on the overlay div, not the map) ──────
  function onOverlayMouseDown(e) {
    if (!isDrawing) return
    e.preventDefault()
    const rect = mapRef.current.getBoundingClientRect()
    drawStart.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function onOverlayMouseMove(e) {
    if (!isDrawing || !drawStart.current) return
    const rect = mapRef.current.getBoundingClientRect()
    const x2 = e.clientX - rect.left, y2 = e.clientY - rect.top
    setDrawRect({
      x: Math.min(drawStart.current.x, x2), y: Math.min(drawStart.current.y, y2),
      w: Math.abs(x2 - drawStart.current.x), h: Math.abs(y2 - drawStart.current.y),
    })
  }

  function onOverlayMouseUp(e) {
    if (!isDrawing || !drawStart.current || !mapInstance.current) return
    const rect = mapRef.current.getBoundingClientRect()
    const x2   = e.clientX - rect.left, y2 = e.clientY - rect.top
    const map  = mapInstance.current
    const sw   = map.unproject([Math.min(drawStart.current.x, x2), Math.max(drawStart.current.y, y2)])
    const ne   = map.unproject([Math.max(drawStart.current.x, x2), Math.min(drawStart.current.y, y2)])
    setDrawBounds({
      minLat: sw.lat.toFixed(6), maxLat: ne.lat.toFixed(6),
      minLon: sw.lng.toFixed(6), maxLon: ne.lng.toFixed(6),
    })
    setIsDrawing(false)
    setDrawRect(null)
    drawStart.current = null
  }

  function startDraw() {
    setIsPolygon(false)
    setPolygonCoords([])
    polygonPts.current = []
    setDrawBounds(null)
    setIsDrawing(true)
  }

  function startPolygon() {
    setIsDrawing(false)
    setDrawBounds(null)
    setPolygonCoords([])
    polygonPts.current = []
    setIsPolygon(true)
  }

  function clearDraw() {
    setDrawBounds(null)
    setPolygonCoords([])
    polygonPts.current = []
    setIsDrawing(false)
    setIsPolygon(false)
    const src = mapInstance.current?.getSource('poly-preview')
    if (src) src.setData({ type:'FeatureCollection', features:[] })
  }

  // ── CRUD ──────────────────────────────────────────────────────
  async function handleSave(data) {
    if (data.id) await api.put(`/zones/${data.id}`, data)
    else         await api.post('/zones', data)
    loadZones(); setPanel('list'); setEditZone(null); clearDraw()
  }

  async function handleToggle(id) { await api.patch(`/zones/${id}/toggle`); loadZones() }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete zone "${name}"?`)) return
    await api.delete(`/zones/${id}`)
    if (selectedZone?.id === id) setSelectedZone(null)
    loadZones()
  }

  const filtered       = zones.filter(z => filterLevel === 'all' ? true : z.dangerLevel === parseInt(filterLevel))
  const visibleBreaches = breaches.filter(b => !ackBreaches.has(b.id))
  const activeZones     = zones.filter(z => z.active).length

  return (
    <div style={{ height:'100%', display:'flex', overflow:'hidden' }}>

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <div style={{ width:'320px', flexShrink:0, display:'flex', flexDirection:'column', background:'#0a1628', borderRight:'1px solid rgba(0,229,204,0.07)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'16px', borderBottom:'1px solid rgba(0,229,204,0.07)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
            <div>
              <h2 style={{ fontFamily:'Outfit,sans-serif', fontSize:'16px', fontWeight:'700', color:'#fff', marginBottom:'2px' }}>Danger Zones</h2>
              <p style={{ fontFamily:'Inter,sans-serif', fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>{activeZones} active · {zones.length} total</p>
            </div>
            <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
              {/* Zone toggle */}
              <button onClick={() => setShowZones(s => !s)} title={showZones ? 'Hide zones on map' : 'Show zones on map'}
                style={{ padding:'7px 9px', borderRadius:'8px', cursor:'pointer', background: showZones ? 'rgba(0,229,204,0.1)' : 'rgba(255,255,255,0.04)', border:`1px solid ${showZones ? 'rgba(0,229,204,0.3)' : 'rgba(255,255,255,0.08)'}`, color: showZones ? '#00e5cc' : 'rgba(255,255,255,0.3)', display:'flex', alignItems:'center' }}>
                {showZones ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
              {/* Breaches button */}
              <button onClick={() => setPanel(p => p === 'breaches' ? 'list' : 'breaches')}
                style={{ position:'relative', padding:'7px 9px', borderRadius:'8px', cursor:'pointer', background: panel === 'breaches' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)', border:`1px solid ${panel === 'breaches' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`, color: panel === 'breaches' ? '#ef4444' : 'rgba(255,255,255,0.4)', display:'flex', alignItems:'center' }}>
                <ShieldAlert size={13} />
                {visibleBreaches.length > 0 && (
                  <span style={{ position:'absolute', top:'-5px', right:'-5px', minWidth:'15px', height:'15px', borderRadius:'8px', background:'#ef4444', border:'1.5px solid #0a1628', fontFamily:'Inter,sans-serif', fontSize:'9px', fontWeight:'700', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 2px' }}>
                    {visibleBreaches.length > 9 ? '9+' : visibleBreaches.length}
                  </span>
                )}
              </button>
              {/* Add */}
              <button onClick={() => { setPanel(p => p === 'create' ? 'list' : 'create'); setEditZone(null); clearDraw() }}
                style={{ padding:'7px 10px', borderRadius:'8px', cursor:'pointer', background: panel === 'create' ? 'rgba(0,229,204,0.15)' : 'linear-gradient(135deg,#00e5cc,#00b8a4)', border:'none', color: panel === 'create' ? '#00e5cc' : '#060d18', display:'flex', alignItems:'center', gap:'5px', fontFamily:'Inter,sans-serif', fontSize:'11px', fontWeight:'600' }}>
                <Plus size={13} /> Add
              </button>
            </div>
          </div>

          {/* Risk filter */}
          <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
            <button onClick={() => setFilterLevel('all')} style={{ padding:'3px 9px', borderRadius:'20px', cursor:'pointer', fontFamily:'Inter,sans-serif', fontSize:'10px', fontWeight:'500', background: filterLevel === 'all' ? 'rgba(0,229,204,0.12)' : 'rgba(255,255,255,0.04)', border:`1px solid ${filterLevel === 'all' ? 'rgba(0,229,204,0.3)' : 'rgba(255,255,255,0.06)'}`, color: filterLevel === 'all' ? '#00e5cc' : 'rgba(255,255,255,0.3)' }}>All</button>
            {Object.entries(RISK).map(([level, cfg]) => (
              <button key={level} onClick={() => setFilterLevel(level)}
                style={{ padding:'3px 9px', borderRadius:'20px', cursor:'pointer', fontFamily:'Inter,sans-serif', fontSize:'10px', fontWeight:'500', background: filterLevel === level ? `${cfg.color}22` : 'rgba(255,255,255,0.04)', border:`1px solid ${filterLevel === level ? cfg.color+'55' : 'rgba(255,255,255,0.06)'}`, color: filterLevel === level ? cfg.color : 'rgba(255,255,255,0.3)' }}>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Panel */}
        <div style={{ flex:1, overflowY:'auto' }}>
          <AnimatePresence mode="wait">

            {(panel === 'create' || panel === 'edit') && (
              <motion.div key="form" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
                <ZoneForm
                  zone={editZone}
                  drawBounds={drawBounds}
                  polygonCoords={polygonCoords}
                  isDrawing={isDrawing}
                  isPolygon={isPolygon}
                  onStartDraw={startDraw}
                  onStartPolygon={startPolygon}
                  onClearDraw={clearDraw}
                  onSave={handleSave}
                  onCancel={() => { setPanel('list'); setEditZone(null); clearDraw() }}
                />
              </motion.div>
            )}

            {panel === 'breaches' && (
              <motion.div key="breaches" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} style={{ padding:'14px' }}>
                <p style={{ fontFamily:'Outfit,sans-serif', fontSize:'12px', fontWeight:'600', color:'#ef4444', letterSpacing:'0.5px', marginBottom:'12px', textTransform:'uppercase' }}>Zone Breaches</p>
                {visibleBreaches.length === 0
                  ? <div style={{ textAlign:'center', padding:'40px 0' }}>
                      <Shield size={24} color="rgba(0,229,204,0.15)" style={{ margin:'0 auto 10px' }} />
                      <p style={{ fontFamily:'Inter,sans-serif', fontSize:'12px', color:'rgba(255,255,255,0.2)' }}>No active zone breaches</p>
                    </div>
                  : visibleBreaches.map(b => (
                      <ZoneBreachItem key={b.id} breach={b} onAcknowledge={id => setAckBreaches(prev => new Set([...prev, id]))} />
                    ))
                }
              </motion.div>
            )}

            {panel === 'list' && (
              <motion.div key="list" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} style={{ padding:'10px' }}>
                {loading
                  ? <p style={{ textAlign:'center', padding:'40px', fontFamily:'Inter,sans-serif', fontSize:'12px', color:'rgba(255,255,255,0.2)' }}>Loading...</p>
                  : filtered.length === 0
                  ? <div style={{ textAlign:'center', padding:'40px 0' }}>
                      <MapPin size={24} color="rgba(0,229,204,0.12)" style={{ margin:'0 auto 10px' }} />
                      <p style={{ fontFamily:'Inter,sans-serif', fontSize:'12px', color:'rgba(255,255,255,0.2)' }}>No zones yet — add one</p>
                    </div>
                  : filtered.map(zone => (
                      <ZoneItem key={zone.id} zone={zone} selected={selectedZone?.id === zone.id}
                        onClick={() => setSelectedZone(prev => prev?.id === zone.id ? null : zone)}
                        onToggle={handleToggle} onDelete={handleDelete}
                        onEdit={z => { setEditZone(z); setPanel('edit') }}
                      />
                    ))
                }
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Legend */}
        <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(0,229,204,0.06)', flexShrink:0, display:'flex', gap:'10px', flexWrap:'wrap' }}>
          {Object.entries(RISK).map(([level, cfg]) => (
            <div key={level} style={{ display:'flex', alignItems:'center', gap:'4px' }}>
              <div style={{ width:'7px', height:'7px', borderRadius:'2px', background:cfg.color }} />
              <span style={{ fontFamily:'Inter,sans-serif', fontSize:'9px', color:'rgba(255,255,255,0.3)' }}>{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Map area ─────────────────────────────────────────────── */}
      <div style={{ flex:1, position:'relative' }}>
        {/* Map canvas */}
        <div ref={mapRef} style={{ width:'100%', height:'100%' }} />

        {/* Draw overlay — sits on top of map to capture mouse events during draw */}
        {isDrawing && (
          <div
            style={{ position:'absolute', inset:0, cursor:'crosshair', zIndex:10 }}
            onMouseDown={onOverlayMouseDown}
            onMouseMove={onOverlayMouseMove}
            onMouseUp={onOverlayMouseUp}
          >
            {/* Drag rectangle */}
            {drawRect && (
              <div style={{ position:'absolute', left:drawRect.x, top:drawRect.y, width:drawRect.w, height:drawRect.h, border:'2px dashed #00e5cc', background:'rgba(0,229,204,0.08)', pointerEvents:'none' }} />
            )}
          </div>
        )}

        {/* Mode hint banner */}
        {(isDrawing || isPolygon) && (
          <div style={{ position:'absolute', top:'16px', left:'50%', transform:'translateX(-50%)', background:'rgba(0,229,204,0.95)', color:'#060d18', padding:'8px 20px', borderRadius:'20px', fontFamily:'Outfit,sans-serif', fontSize:'12px', fontWeight:'700', pointerEvents:'none', boxShadow:'0 4px 20px rgba(0,229,204,0.35)', zIndex:20 }}>
            {isDrawing ? 'Click and drag to draw rectangle' : 'Click to add points · Double-click to finish'}
          </div>
        )}

      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}