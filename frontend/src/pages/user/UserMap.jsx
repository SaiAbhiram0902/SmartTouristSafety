import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import useAuthStore from '../../store/authStore'
import api from '../../lib/api'

const MAPTILER_KEY = 'jbYIDNeXWpUkQx80YgXc'
const MAP_STYLE    = `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_KEY}`

// dangerLevel 0-4 → color
const DL_COLORS = ['#22c55e','#84cc16','#f59e0b','#f97316','#ef4444']
const DL_LABELS = ['Safe Zone','Low Risk','Medium Risk','High Risk','Extreme']

const CAT_CFG = {
  VIEWPOINT:      { color:'#2979ff', bg:'#0d1f5e', icon:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' },
  REST_STOP:      { color:'#00e5cc', bg:'#012e2a', icon:'<path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><path d="M6 2c0 1.5 1.5 2 1.5 3.5S6 7 6 8"/><path d="M10 2c0 1.5 1.5 2 1.5 3.5S10 7 10 8"/><path d="M14 2c0 1.5 1.5 2 1.5 3.5S14 7 14 8"/>' },
  MEDICAL:        { color:'#22c55e', bg:'#052e16', icon:'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>' },
  WATER:          { color:'#38bdf8', bg:'#082f49', icon:'<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>' },
  SHELTER:        { color:'#a78bfa', bg:'#2e1065', icon:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
  FOOD_STALL:     { color:'#f97316', bg:'#431407', icon:'<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><line x1="7" y1="2" x2="7" y2="22"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3v5"/>' },
  DANGER_CLUSTER: { color:'#ef4444', bg:'#450a0a', icon:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.5" fill="#ef4444"/>' },
}
const CAT_EMOJIS = { VIEWPOINT:'🏔️', REST_STOP:'☕', MEDICAL:'🏥', WATER:'💧', SHELTER:'🏕️', FOOD_STALL:'🍲' }

function makePinSVG(color, bg, iconD) {
  const el = document.createElementNS('http://www.w3.org/2000/svg','svg')
  el.setAttribute('width','28'); el.setAttribute('height','38'); el.setAttribute('viewBox','0 0 30 38')
  el.style.cssText = 'display:block;overflow:visible;cursor:pointer;'
  el.innerHTML = `
    <path d="M15 37 C15 37 1 24 1 15 A14 14 0 1 1 29 15 C29 24 15 37 15 37Z"
          fill="${bg}" stroke="${color}" stroke-width="1.2" opacity="0.85"/>
    <g transform="translate(3,3)">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}"
           stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.95">
        ${iconD}
      </svg>
    </g>`
  return el
}
function makeMyPin() {
  const el = document.createElementNS('http://www.w3.org/2000/svg','svg')
  el.setAttribute('width','36'); el.setAttribute('height','48'); el.setAttribute('viewBox','0 0 36 48')
  el.style.cssText = 'display:block;overflow:visible;'
  el.innerHTML = `
    <ellipse cx="18" cy="46" rx="8" ry="3" fill="#6aab5e" opacity="0.2"/>
    <path d="M18 46 C18 46 2 30 2 18 A16 16 0 1 1 34 18 C34 30 18 46 18 46Z"
          fill="rgba(13,31,16,0.92)" stroke="#6aab5e" stroke-width="2"/>
    <circle cx="18" cy="18" r="7" fill="#6aab5e" opacity="0.9"/>
    <circle cx="18" cy="18" r="4" fill="#fff" opacity="0.95"/>
    <circle cx="18" cy="18" r="18" fill="none" stroke="#6aab5e" stroke-width="1.5" opacity="0">
      <animate attributeName="r" values="16;26;16" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite"/>
    </circle>`
  return el
}
function makeGroupPin(name, color) {
  const el = document.createElementNS('http://www.w3.org/2000/svg','svg')
  el.setAttribute('width','32'); el.setAttribute('height','42'); el.setAttribute('viewBox','0 0 32 42')
  el.style.cssText = 'display:block;overflow:visible;cursor:pointer;'
  el.innerHTML = `
    <path d="M16 42 C16 42 1 28 1 16 A15 15 0 1 1 31 16 C31 28 16 42 16 42Z"
          fill="rgba(13,31,16,0.88)" stroke="${color}" stroke-width="1.8"/>
    <circle cx="16" cy="16" r="10" fill="${color}" opacity="0.2"/>
    <text x="16" y="21" text-anchor="middle" font-family="Playfair Display,serif"
          font-size="11" font-weight="700" fill="${color}">${name?.[0]?.toUpperCase()??'?'}</text>`
  return el
}

function MapBtn({ onClick, active, title, children, badge }) {
  return (
    <motion.button whileTap={{scale:0.9}} onClick={onClick} title={title}
      style={{width:'40px',height:'40px',borderRadius:'12px',
              border:`1px solid ${active?'rgba(106,171,94,0.5)':'rgba(106,171,94,0.2)'}`,
              cursor:'pointer',background:active?'rgba(106,171,94,0.18)':'rgba(8,20,10,0.92)',
              backdropFilter:'blur(12px)',color:'#6aab5e',
              display:'flex',alignItems:'center',justifyContent:'center',
              position:'relative',fontFamily:'DM Sans,sans-serif'}}>
      {children}
      {badge > 0 && (
        <span style={{position:'absolute',top:'-4px',right:'-4px',width:'16px',height:'16px',
          borderRadius:'50%',background:'#6aab5e',fontSize:'8px',fontWeight:'700',color:'#0d1f10',
          display:'flex',alignItems:'center',justifyContent:'center'}}>{badge}</span>
      )}
    </motion.button>
  )
}

function memberColor(id) {
  const p = ['#f97316','#a78bfa','#38bdf8','#f472b6','#34d399','#d4a843']
  let h = 0; for (let c of id) h = (h*31+c.charCodeAt(0)) & 0xffffffff
  return p[Math.abs(h) % p.length]
}

export default function UserMap() {
  const { touristId } = useAuthStore()
  const mapContainer  = useRef(null)
  const map           = useRef(null)
  const myMarker      = useRef(null)
  const groupMarkers  = useRef({})
  const hotMarkers    = useRef({})
  const popupRef      = useRef(null)
  const hasCenteredRef = useRef(false)

  const [mapReady,     setMapReady]     = useState(false)
  const [panel,        setPanel]        = useState(null)
  const [hotspots,     setHotspots]     = useState([])
  const [zones,        setZones]        = useState([])
  const [tourists,     setTourists]     = useState([])
  const [myLoc,        setMyLoc]        = useState(null)
  const [schedule,     setSchedule]     = useState([])
  const [showHotspots, setShowHotspots] = useState(true)
  const [showGroup,    setShowGroup]    = useState(true)
  const [showZones,    setShowZones]    = useState(true)

  // ── Init map ──────────────────────────────────────────────────
  useEffect(() => {
    if (map.current || !mapContainer.current) return
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [77.6309, 13.1150],
      zoom: 13, pitch: 40,
    })
    map.current.addControl(new maplibregl.NavigationControl({showCompass:true}), 'top-right')
    map.current.on('load', () => setMapReady(true))
    return () => { map.current?.remove(); map.current = null }
  }, [])

  // ── Fetch data ────────────────────────────────────────────────
  const [groupMemberIds, setGroupMemberIds] = useState(new Set())

  useEffect(() => {
    api.get('/hotspots').then(r => setHotspots(r.data)).catch(() => {})
    api.get('/zones').then(r => setZones(r.data)).catch(() => {})

    // Determine group membership once on mount
    api.get(`/tourists/${touristId}/dashboard`).then(async d => {
      const me = d.data.tourist
      if (!me) return
      let memberIds = []
      if (!me.parentId) {
        memberIds = (d.data.familyMembers ?? []).map(m => m.touristId)
      } else {
        const ld = await api.get(`/tourists/${me.parentId}/dashboard`).catch(() => ({data:{}}))
        memberIds = (ld.data.familyMembers ?? []).map(m => m.touristId)
        if (ld.data.tourist) memberIds.push(ld.data.tourist.touristId)
      }
      setGroupMemberIds(new Set(memberIds))
    }).catch(() => {})

    const fetchPositions = () => {
      api.get('/tourists/dashboard').then(r => {
        setTourists(r.data)
        const me = r.data.find(d => d.tourist?.touristId === touristId)
        if (me?.lastLocation) setMyLoc(me.lastLocation)
      }).catch(() => {})
    }
    fetchPositions()
    const t = setInterval(fetchPositions, 10000)
    return () => clearInterval(t)
  }, [touristId])

  // ── Zone layers — built from minLat/maxLat/minLon/maxLon ──────
  useEffect(() => {
    if (!mapReady || !map.current || zones.length === 0) return
    zones.forEach(zone => {
      const srcId = `zone-${zone.id}`
      if (map.current.getSource(srcId)) return

      // Build polygon from polygonCoords JSON string (polygon draw) or bounding box
      let coords
      const rawPoly = zone.polygonCoords
      if (rawPoly) {
        try {
          const parsed = typeof rawPoly === 'string' ? JSON.parse(rawPoly) : rawPoly
          if (Array.isArray(parsed) && parsed.length >= 3) {
            coords = [...parsed, parsed[0]] // close the ring
          }
        } catch {}
      }
      if (!coords) {
        const { minLat, maxLat, minLon, maxLon } = zone
        if (minLat == null || maxLat == null || minLon == null || maxLon == null) return
        coords = [
          [minLon, minLat],[maxLon, minLat],
          [maxLon, maxLat],[minLon, maxLat],[minLon, minLat]
        ]
      }

      try {
        map.current.addSource(srcId, { type:'geojson', data:{
          type:'Feature', geometry:{ type:'Polygon', coordinates:[coords] }
        }})
        const dl = zone.dangerLevel ?? 0
        const color = DL_COLORS[dl] ?? '#22c55e'
        map.current.addLayer({ id:`${srcId}-fill`, type:'fill', source:srcId,
          paint:{ 'fill-color':color, 'fill-opacity': showZones ? 0.12 : 0 }})
        map.current.addLayer({ id:`${srcId}-line`, type:'line', source:srcId,
          paint:{ 'line-color':color, 'line-width':1.8, 'line-opacity': showZones ? 0.7 : 0, 'line-dasharray':[4,2] }})
        map.current.addLayer({ id:`${srcId}-label`, type:'symbol', source:srcId,
          layout:{ 'symbol-placement':'line-center', 'text-field':zone.name ?? '', 'text-size':10,
                   'text-font':['Open Sans Regular','Arial Unicode MS Regular'] },
          paint:{ 'text-color':color, 'text-halo-color':'rgba(0,0,0,0.6)', 'text-halo-width':1.5,
                  'text-opacity': showZones ? 1 : 0 }})
      } catch(e) { console.warn('Zone layer error', zone.id, e) }
    })
  }, [zones, mapReady])

  useEffect(() => {
    if (!mapReady || !map.current) return
    zones.forEach(zone => {
      const s = `zone-${zone.id}`
      if (map.current.getLayer(`${s}-fill`)) {
        map.current.setPaintProperty(`${s}-fill`,'fill-opacity', showZones ? 0.12 : 0)
        map.current.setPaintProperty(`${s}-line`,'line-opacity', showZones ? 0.7 : 0)
        map.current.setPaintProperty(`${s}-label`,'text-opacity', showZones ? 1 : 0)
      }
    })
  }, [showZones, mapReady])

  // ── My location marker ────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !map.current || !myLoc) return
    if (myMarker.current) {
      myMarker.current.setLngLat([myLoc.longitude, myLoc.latitude])
    } else {
      const el = document.createElement('div')
      el.appendChild(makeMyPin())
      myMarker.current = new maplibregl.Marker({ element:el, anchor:'bottom' })
        .setLngLat([myLoc.longitude, myLoc.latitude]).addTo(map.current)
      if (!hasCenteredRef.current) {
        hasCenteredRef.current = true
        map.current.flyTo({ center:[myLoc.longitude, myLoc.latitude], zoom:15, pitch:40, duration:1200 })
      }
    }
  }, [myLoc, mapReady])

  // ── Group markers ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !map.current) return
    Object.values(groupMarkers.current).forEach(m => m.remove())
    groupMarkers.current = {}
    if (!showGroup) return
    tourists.forEach(({ tourist, lastLocation }) => {
      if (!tourist || tourist.touristId === touristId) return
      if (!groupMemberIds.has(tourist.touristId)) return  // only show group members
      if (!lastLocation) return
      const color = memberColor(tourist.touristId)
      const el = document.createElement('div')
      el.appendChild(makeGroupPin(tourist.name, color))
      el.addEventListener('click', () => {
        if (popupRef.current) { popupRef.current.remove(); popupRef.current = null }
        popupRef.current = new maplibregl.Popup({ offset:[0,-42], closeButton:false, maxWidth:'200px' })
          .setLngLat([lastLocation.longitude, lastLocation.latitude])
          .setHTML(`<div style="font-family:DM Sans,sans-serif;background:#0d1f10;padding:12px;border-radius:12px;border:1px solid ${color}44">
            <p style="font-family:Playfair Display,serif;font-size:14px;color:#fff;font-weight:600;margin-bottom:4px">${tourist.name}</p>
            <p style="font-size:10px;color:rgba(200,230,192,0.4)">${tourist.active?'🟢 On trek':'⚫ Inactive'}</p>
            <p style="font-size:10px;color:rgba(200,230,192,0.3);margin-top:4px;font-family:JetBrains Mono,monospace">
              ${lastLocation.latitude?.toFixed(4)}, ${lastLocation.longitude?.toFixed(4)}
            </p>
          </div>`)
          .addTo(map.current)
      })
      groupMarkers.current[tourist.touristId] = new maplibregl.Marker({ element:el, anchor:'bottom' })
        .setLngLat([lastLocation.longitude, lastLocation.latitude]).addTo(map.current)
    })
  }, [tourists, showGroup, mapReady, touristId, groupMemberIds])

  // ── Hotspot markers ───────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !map.current) return
    Object.values(hotMarkers.current).forEach(m => m.remove())
    hotMarkers.current = {}
    if (!showHotspots) return
    hotspots.forEach(h => {
      const cfg = CAT_CFG[h.category] ?? CAT_CFG.VIEWPOINT
      const isDanger = h.category === 'DANGER_CLUSTER'
      const el = document.createElement('div')
      el.appendChild(makePinSVG(cfg.color, cfg.bg, cfg.icon))
      el.addEventListener('click', e => {
        e.stopPropagation()
        if (popupRef.current) { popupRef.current.remove(); popupRef.current = null }
        const scheduleBtn = !isDanger
          ? `<button onclick="window.__scheduleAdd&&window.__scheduleAdd(${h.id},'${h.name.replace(/'/g,'')}','${h.category}',${h.latitude},${h.longitude})"
               style="width:100%;padding:7px;border-radius:8px;border:1px solid ${cfg.color}44;background:${cfg.color}15;
               color:${cfg.color};font-size:10px;cursor:pointer;font-weight:600;font-family:DM Sans,sans-serif;margin-top:10px">
               + Add to Visit Schedule
             </button>` : ''
        const exploreBtn = !isDanger
          ? `<button onclick="window.__exploreHotspot&&window.__exploreHotspot(${h.id})"
               style="width:100%;padding:7px;border-radius:8px;border:1px solid rgba(200,230,192,0.15);background:rgba(200,230,192,0.06);
               color:rgba(200,230,192,0.6);font-size:10px;cursor:pointer;font-weight:600;font-family:DM Sans,sans-serif;margin-top:6px">
               View Details &amp; Reviews →
             </button>` : ''
        popupRef.current = new maplibregl.Popup({ offset:[0,-38], closeButton:false, maxWidth:'220px' })
          .setLngLat([h.longitude, h.latitude])
          .setHTML(`<div style="font-family:DM Sans,sans-serif;background:#0d1f10;padding:14px;border-radius:14px;border:1px solid ${cfg.color}33">
            <p style="font-family:Playfair Display,serif;font-size:14px;color:#fff;font-weight:600;margin-bottom:6px">${h.name}</p>
            <span style="font-size:9px;color:${cfg.color};background:${cfg.color}18;padding:2px 8px;border-radius:20px">${h.category.replace(/_/g,' ')}</span>
            ${h.description&&h.description!=='null'?`<p style="font-size:11px;color:rgba(200,230,192,0.45);margin-top:8px;line-height:1.5">${h.description.slice(0,90)}</p>`:''}
            ${h.openingTime?`<p style="font-size:10px;color:rgba(200,230,192,0.4);margin-top:6px">🕐 ${h.openingTime}–${h.closingTime||'?'}${h.breakStart?' · Break '+h.breakStart+'–'+(h.breakEnd||'?'):''}</p>`:''}
            ${h.alertCount>0?`<p style="font-size:10px;color:#ef4444;margin-top:4px">⚠ ${h.alertCount} incident${h.alertCount>1?'s':''} nearby</p>`:''}
            ${scheduleBtn}
            ${exploreBtn}
          </div>`)
          .addTo(map.current)
      })
      hotMarkers.current[h.id] = new maplibregl.Marker({ element:el, anchor:'bottom' })
        .setLngLat([h.longitude, h.latitude]).addTo(map.current)
    })
  }, [hotspots, showHotspots, mapReady])

  useEffect(() => {
    window.__scheduleAdd = (id, name, category, lat, lng) => {
      setSchedule(prev => prev.some(s => s.id === id) ? prev : [...prev, { id, name, category, lat, lng, done:false }])
      setPanel('schedule')
      if (popupRef.current) { popupRef.current.remove(); popupRef.current = null }
    }
    window.__exploreHotspot = (id) => {
      if (popupRef.current) { popupRef.current.remove(); popupRef.current = null }
      window.location.href = `/user/explore?hotspot=${id}`
    }
    return () => { delete window.__scheduleAdd; delete window.__exploreHotspot }
  }, [])

  function flyToMe() {
    if (!myLoc || !map.current) return
    map.current.flyTo({ center:[myLoc.longitude, myLoc.latitude], zoom:16, pitch:45, duration:900 })
  }

  function flyToMember(tid) {
    const found = tourists.find(t => t.tourist?.touristId === tid)
    if (!found?.lastLocation || !map.current) return
    map.current.flyTo({ center:[found.lastLocation.longitude, found.lastLocation.latitude], zoom:16, duration:900 })
    setPanel(null)
  }

  const doneCount = schedule.filter(s => s.done).length

  return (
    <div style={{width:'100%',height:'100%',position:'relative',background:'#0d1f10',fontFamily:'DM Sans,sans-serif'}}>
      <div ref={mapContainer} style={{width:'100%',height:'100%'}}/>

      {/* Left action buttons */}
      <div style={{position:'absolute',top:'16px',left:'16px',display:'flex',flexDirection:'column',gap:'8px',zIndex:10}}>
        <MapBtn onClick={flyToMe} title="Center on my location">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
          </svg>
        </MapBtn>
        <MapBtn onClick={()=>setPanel(p=>p==='layers'?null:'layers')} active={panel==='layers'} title="Map layers">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
          </svg>
        </MapBtn>
        <MapBtn onClick={()=>setPanel(p=>p==='group'?null:'group')} active={panel==='group'} title="Track group">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </MapBtn>
        <MapBtn onClick={()=>setPanel(p=>p==='schedule'?null:'schedule')} active={panel==='schedule'} title="Visit schedule" badge={schedule.length - doneCount}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        </MapBtn>
        {zones.length > 0 && (
          <MapBtn onClick={()=>{
            if (!map.current) return
            const allLats = zones.flatMap(z=>[z.minLat,z.maxLat]).filter(Boolean)
            const allLons = zones.flatMap(z=>[z.minLon,z.maxLon]).filter(Boolean)
            if (allLats.length && allLons.length) {
              map.current.fitBounds([[Math.min(...allLons),Math.min(...allLats)],[Math.max(...allLons),Math.max(...allLats)]],{padding:40,duration:900})
            }
          }} title="Fit to safety zones">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
          </MapBtn>
        )}
      </div>

      {/* Panel backdrop */}
      <AnimatePresence>
        {panel && panel !== 'schedule' && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={()=>setPanel(null)}
            style={{position:'absolute',inset:0,zIndex:15}}/>
        )}
      </AnimatePresence>

      {/* Layers panel */}
      <AnimatePresence>
        {panel==='layers' && (
          <motion.div initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-16}}
            style={{position:'absolute',top:'16px',left:'64px',zIndex:20,
                    background:'rgba(8,20,10,0.97)',backdropFilter:'blur(20px)',
                    border:'1px solid rgba(106,171,94,0.15)',borderRadius:'16px',padding:'16px',minWidth:'200px'}}>
            <p style={{fontSize:'10px',color:'rgba(200,230,192,0.4)',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'14px'}}>Map Layers</p>
            {[
              { label:'Hotspots',      val:showHotspots, set:setShowHotspots },
              { label:'Group Members', val:showGroup,    set:setShowGroup },
              { label:'Safety Zones',  val:showZones,    set:setShowZones },
            ].map(item=>(
              <div key={item.label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
                <span style={{fontSize:'12px',color:'rgba(200,230,192,0.65)'}}>{item.label}</span>
                <button onClick={()=>item.set(v=>!v)} style={{
                  width:'36px',height:'20px',borderRadius:'10px',border:'none',cursor:'pointer',
                  background:item.val?'#6aab5e':'rgba(255,255,255,0.1)',transition:'background 0.2s',position:'relative',fontFamily:'DM Sans,sans-serif'}}>
                  <div style={{position:'absolute',top:'2px',left:item.val?'18px':'2px',width:'16px',height:'16px',
                    borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
                </button>
              </div>
            ))}
            {/* Zone legend */}
            {showZones && (
              <div style={{marginTop:'12px',paddingTop:'12px',borderTop:'1px solid rgba(200,230,192,0.08)'}}>
                <p style={{fontSize:'9px',color:'rgba(200,230,192,0.3)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'8px'}}>Risk Levels</p>
                {DL_LABELS.map((l,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'5px'}}>
                    <div style={{width:'10px',height:'10px',borderRadius:'3px',background:DL_COLORS[i],flexShrink:0}}/>
                    <span style={{fontSize:'10px',color:'rgba(200,230,192,0.5)'}}>{l}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Group tracking panel */}
      <AnimatePresence>
        {panel==='group' && (
          <motion.div initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-16}}
            style={{position:'absolute',top:'16px',left:'64px',zIndex:20,
                    background:'rgba(8,20,10,0.97)',backdropFilter:'blur(20px)',
                    border:'1px solid rgba(106,171,94,0.15)',borderRadius:'16px',padding:'16px',minWidth:'220px',maxWidth:'260px'}}>
            <p style={{fontSize:'10px',color:'rgba(200,230,192,0.4)',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'14px'}}>Group Tracking</p>
            {tourists.filter(t => t.tourist && t.tourist.touristId !== touristId && groupMemberIds.has(t.tourist.touristId)).length === 0 ? (
              <div style={{textAlign:'center',padding:'12px 0'}}>
                <p style={{fontSize:'12px',color:'rgba(200,230,192,0.3)',lineHeight:'1.6'}}>No other group members have live GPS data yet.</p>
              </div>
            ) : tourists.filter(t => t.tourist && t.tourist.touristId !== touristId && groupMemberIds.has(t.tourist.touristId)).map(({ tourist, lastLocation }) => {
              const color = memberColor(tourist.touristId)
              const hasLoc = !!lastLocation
              return (
                <div key={tourist.touristId} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px',
                  padding:'10px',borderRadius:'12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(200,230,192,0.06)'}}>
                  <div style={{width:'32px',height:'32px',borderRadius:'50%',flexShrink:0,
                    background:`${color}22`,border:`1.5px solid ${color}`,
                    display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Playfair Display,serif',fontSize:'13px',color,fontWeight:'700'}}>
                    {tourist.name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:'12px',fontWeight:'600',color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{tourist.name}</p>
                    <p style={{fontSize:'9px',color: hasLoc?'rgba(200,230,192,0.4)':'rgba(200,230,192,0.2)',marginTop:'2px'}}>
                      {hasLoc ? `${lastLocation.latitude?.toFixed(3)}, ${lastLocation.longitude?.toFixed(3)}` : 'No GPS signal'}
                    </p>
                  </div>
                  {hasLoc && (
                    <button onClick={()=>flyToMember(tourist.touristId)}
                      style={{padding:'5px 8px',borderRadius:'8px',border:`1px solid ${color}44`,background:`${color}12`,
                              color,fontSize:'9px',cursor:'pointer',fontWeight:'600',fontFamily:'DM Sans,sans-serif',whiteSpace:'nowrap'}}>
                      Find
                    </button>
                  )}
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visit Schedule panel */}
      <AnimatePresence>
        {panel==='schedule' && (
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}}
            style={{position:'absolute',bottom:'16px',left:'16px',right:'16px',zIndex:20,
                    background:'rgba(8,20,10,0.97)',backdropFilter:'blur(24px)',
                    border:'1px solid rgba(106,171,94,0.18)',borderRadius:'20px',padding:'18px',
                    maxHeight:'60vh',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px',flexShrink:0}}>
              <div>
                <p style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:'700',color:'#fff'}}>Visit Schedule</p>
                <p style={{fontSize:'10px',color:'rgba(200,230,192,0.35)',marginTop:'2px'}}>
                  {doneCount}/{schedule.length} visited · tap hotspot pins to add
                </p>
              </div>
              <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                {schedule.length>0&&<button onClick={()=>setSchedule([])}
                  style={{padding:'4px 10px',borderRadius:'20px',border:'1px solid rgba(239,68,68,0.25)',
                          background:'rgba(239,68,68,0.07)',color:'#e87070',fontSize:'10px',cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>
                  Clear
                </button>}
                <button onClick={()=>setPanel(null)}
                  style={{width:'26px',height:'26px',borderRadius:'50%',border:'1px solid rgba(200,230,192,0.15)',
                          background:'rgba(255,255,255,0.05)',color:'rgba(200,230,192,0.4)',fontSize:'14px',
                          cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif'}}>×</button>
              </div>
            </div>

            <div style={{overflowY:'auto',flex:1}}>
              {schedule.length===0 ? (
                <div style={{textAlign:'center',padding:'24px 0'}}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(200,230,192,0.2)" strokeWidth="1.5" style={{margin:'0 auto 12px',display:'block'}}>
                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  <p style={{fontSize:'12px',color:'rgba(200,230,192,0.3)',lineHeight:'1.6'}}>
                    Tap any hotspot on the map<br/>and choose "Add to Visit Schedule"
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {schedule.map((s,i)=>{
                    const color = CAT_CFG[s.category]?.color ?? '#6aab5e'
                    return (
                      <motion.div key={s.id} layout initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}}
                        style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 0',
                                borderBottom:'1px solid rgba(200,230,192,0.06)',opacity:s.done?0.45:1}}>
                        <button onClick={()=>setSchedule(prev=>prev.map((p,j)=>j===i?{...p,done:!p.done}:p))}
                          style={{width:'22px',height:'22px',borderRadius:'6px',flexShrink:0,cursor:'pointer',
                                  border:`1.5px solid ${s.done?'#6aab5e':color+'88'}`,
                                  background:s.done?'#6aab5e':'transparent',
                                  display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif'}}>
                          {s.done&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0d1f10" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </button>
                        <div style={{width:'20px',height:'20px',borderRadius:'50%',background:`${color}22`,
                          border:`1px solid ${color}44`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <span style={{fontSize:'9px',fontWeight:'700',color}}>{i+1}</span>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontSize:'13px',fontWeight:'600',color:s.done?'rgba(200,230,192,0.4)':'#fff',
                                     textDecoration:s.done?'line-through':'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                            {s.name}
                          </p>
                          <p style={{fontSize:'10px',color:`${color}88`,marginTop:'1px'}}>
                            {CAT_EMOJIS[s.category]??'📍'} {s.category.replace(/_/g,' ')}
                          </p>
                        </div>
                        <button onClick={()=>{map.current?.flyTo({center:[s.lng,s.lat],zoom:17,duration:800});setPanel(null)}}
                          style={{padding:'5px 10px',borderRadius:'20px',border:`1px solid ${color}44`,
                                  background:`${color}12`,color,fontSize:'10px',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontWeight:'600'}}>
                          Go
                        </button>
                        <button onClick={()=>setSchedule(prev=>prev.filter((_,j)=>j!==i))}
                          style={{width:'22px',height:'22px',borderRadius:'50%',border:'1px solid rgba(200,230,192,0.12)',
                                  background:'rgba(255,255,255,0.04)',color:'rgba(200,230,192,0.35)',fontSize:'12px',
                                  cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif'}}>×</button>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              )}
            </div>

            {schedule.length > 0 && (
              <div style={{marginTop:'12px',flexShrink:0}}>
                <div style={{height:'3px',background:'rgba(200,230,192,0.1)',borderRadius:'2px',overflow:'hidden'}}>
                  <motion.div animate={{width:`${(doneCount/schedule.length)*100}%`}} transition={{duration:0.4}}
                    style={{height:'100%',background:'linear-gradient(90deg,#4a8c3f,#6aab5e)',borderRadius:'2px'}}/>
                </div>
                <p style={{fontSize:'10px',color:'rgba(200,230,192,0.3)',marginTop:'6px',textAlign:'right'}}>
                  {doneCount===schedule.length?'🎉 All spots visited!':`${schedule.length-doneCount} remaining`}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}