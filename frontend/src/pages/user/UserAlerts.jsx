import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import api from '../../lib/api'

// SVG icon paths for severity levels
const SevIcon = ({ d, d2, color, size=16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
       strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    {d  && <path d={d}/>}
    {d2 && <path d={d2}/>}
  </svg>
)
const SEV = {
  CRITICAL: { color:'#ef4444', bg:'rgba(239,68,68,0.1)',  border:'rgba(239,68,68,0.3)',
    Icon: ({c}) => <SevIcon color={c} d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" d2="M12 9v4M12 17h.01"/> },
  HIGH:     { color:'#f97316', bg:'rgba(249,115,22,0.1)', border:'rgba(249,115,22,0.3)',
    Icon: ({c}) => <SevIcon color={c} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/> },
  MEDIUM:   { color:'#d4a843', bg:'rgba(212,168,67,0.1)', border:'rgba(212,168,67,0.3)',
    Icon: ({c}) => <SevIcon color={c} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/> },
  LOW:      { color:'#6aab5e', bg:'rgba(106,171,94,0.08)',border:'rgba(106,171,94,0.2)',
    Icon: ({c}) => <SevIcon color={c} d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" d2="M12 8v4M12 16h.01"/> },
}
// severity is an int 0-100 in the DB; type is the string label ("CRITICAL","SOS" etc.)
// Map display colour from type string OR severity score
const sevCfg = a => {
  const t = String(a.type ?? '').toUpperCase()
  if (t === 'CRITICAL' || t === 'SOS' || t === 'FALL')        return SEV.CRITICAL
  if (t === 'HIGH' || t === 'WILDLIFE' || t === 'MEDICAL')     return SEV.HIGH
  if (t === 'MEDIUM' || t === 'LOST')                          return SEV.MEDIUM
  // fall back to numeric severity score
  const score = Number(a.severity ?? 50)
  if (score >= 80) return SEV.CRITICAL
  if (score >= 60) return SEV.HIGH
  if (score >= 35) return SEV.MEDIUM
  return SEV.LOW
}

function AlertCard({ alert, ownerName }) {
  const c = sevCfg(alert)
  const time = alert.timestamp ? new Date(alert.timestamp).toLocaleString('en-IN', { dateStyle:'short', timeStyle:'short' }) : ''
  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
      style={{background:c.bg, border:`1px solid ${c.border}`, borderRadius:'16px',
              padding:'14px 16px', marginBottom:'10px', fontFamily:'DM Sans,sans-serif'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
          <c.Icon c={c.color}/>
          <div>
            <p style={{fontSize:'13px', fontWeight:'700', color:c.color}}>{alert.type ?? 'ALERT'}</p>
            {ownerName && <p style={{fontSize:'9px', color:'rgba(200,230,192,0.4)', marginTop:'1px'}}>{ownerName}</p>}
          </div>
        </div>
        <div style={{textAlign:'right', flexShrink:0, marginLeft:'8px'}}>
          <span style={{fontSize:'9px', color:`${c.color}99`, background:`${c.color}18`,
                        padding:'2px 8px', borderRadius:'20px'}}>
            {alert.type ?? 'ALERT'}
          </span>
          <p style={{fontSize:'9px', color:'rgba(200,230,192,0.3)', marginTop:'4px',
                     fontFamily:'JetBrains Mono,monospace'}}>{time}</p>
        </div>
      </div>
      {alert.message && (
        <p style={{fontSize:'12px', color:'rgba(200,230,192,0.6)', lineHeight:'1.5'}}>{alert.message}</p>
      )}
    </motion.div>
  )
}

export default function UserAlerts() {
  const navigate = useNavigate()
  const { touristId } = useAuthStore()
  const [tab,         setTab]         = useState('mine')
  const [myAlerts,    setMyAlerts]    = useState([])
  const [groupAlerts, setGroupAlerts] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  useEffect(() => {
    if (!touristId) { setLoading(false); return }

    const load = async () => {
      try {
        // 1. Get my dashboard
        const dashRes = await api.get(`/tourists/${touristId}/dashboard`)
        const dash    = dashRes.data ?? {}
        const me      = dash.tourist ?? null

        // 2. Determine group member IDs
        let members = []
        if (me) {
          if (!me.parentId) {
            members = dash.familyMembers ?? []
          } else {
            try {
              const ldRes = await api.get(`/tourists/${me.parentId}/dashboard`)
              const ld = ldRes.data ?? {}
              members = (ld.familyMembers ?? []).filter(m => m.touristId !== touristId)
              if (ld.tourist) members = [ld.tourist, ...members]
            } catch (_) { /* group leader fetch failed, show no group alerts */ }
          }
        }

        // 3. Fetch all alerts
        const allRes   = await api.get('/alerts')
        const allAlerts = allRes.data ?? []

        // 4. Split
        setMyAlerts(allAlerts.filter(a => a.touristId === touristId))

        const memberMap = {}
        members.forEach(m => { memberMap[m.touristId] = m.name })
        setGroupAlerts(
          allAlerts
            .filter(a => memberMap[a.touristId])
            .map(a => ({ alert: a, ownerName: memberMap[a.touristId] ?? a.touristId }))
        )
      } catch (err) {
        console.error('UserAlerts load failed:', err)
        setError('Could not load alerts. Please check your connection.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [touristId])

  const shown  = tab === 'mine' ? myAlerts.map(a => ({ alert:a, ownerName:null })) : groupAlerts
  const sorted = [...shown].sort((a,b) => new Date(b.alert.timestamp) - new Date(a.alert.timestamp))

  return (
    <div style={{height:'100%', overflowY:'auto', background:'#0d1f10', fontFamily:'DM Sans,sans-serif'}}>

      {/* Sticky header */}
      <div style={{position:'sticky', top:0, zIndex:10,
                   background:'rgba(8,20,10,0.97)', backdropFilter:'blur(16px)',
                   borderBottom:'1px solid rgba(200,230,192,0.08)', padding:'14px 16px'}}>
        {/* Back + title */}
        <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px'}}>
          <button onClick={() => navigate(-1)}
            style={{width:'36px', height:'36px', borderRadius:'50%', flexShrink:0,
                    border:'1px solid rgba(200,230,192,0.15)', background:'rgba(255,255,255,0.05)',
                    color:'rgba(200,230,192,0.6)', cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <h1 style={{fontFamily:'Playfair Display,serif', fontSize:'20px', fontWeight:'700', color:'#fff'}}>
              Alerts
            </h1>
            <p style={{fontSize:'10px', color:'rgba(200,230,192,0.35)', marginTop:'1px'}}>
              Your safety notifications
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex', gap:'8px'}}>
          {[
            { id:'mine',  label:'My Alerts',    count: myAlerts.length },
            { id:'group', label:'Group Alerts',  count: groupAlerts.length },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{flex:1, padding:'9px', borderRadius:'10px', cursor:'pointer',
                      border:`1px solid ${tab===t.id ? 'rgba(106,171,94,0.35)' : 'rgba(200,230,192,0.08)'}`,
                      background:tab===t.id ? 'rgba(106,171,94,0.12)' : 'rgba(255,255,255,0.03)',
                      color:tab===t.id ? '#6aab5e' : 'rgba(200,230,192,0.4)',
                      fontSize:'12px', fontWeight:tab===t.id ? '600' : '400',
                      fontFamily:'DM Sans,sans-serif'}}>
              {t.label}
              <span style={{marginLeft:'6px', fontSize:'10px',
                            background:tab===t.id ? 'rgba(106,171,94,0.2)' : 'rgba(255,255,255,0.06)',
                            padding:'1px 6px', borderRadius:'20px'}}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{padding:'14px 16px 100px'}}>
        {loading ? (
          <div style={{textAlign:'center', padding:'48px 0'}}>
            <motion.div animate={{opacity:[0.3,1,0.3]}} transition={{repeat:Infinity, duration:1.6}}
              style={{fontSize:'12px', color:'rgba(200,230,192,0.4)', fontStyle:'italic'}}>
              Loading alerts...
            </motion.div>
          </div>
        ) : error ? (
          <div style={{textAlign:'center', padding:'48px 16px',
                       background:'rgba(239,68,68,0.08)', borderRadius:'16px',
                       border:'1px solid rgba(239,68,68,0.2)', marginTop:'8px'}}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e87070" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:'10px'}}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p style={{fontSize:'13px', color:'#e87070'}}>{error}</p>
          </div>
        ) : sorted.length === 0 ? (
          <div style={{textAlign:'center', padding:'48px 0'}}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#6aab5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:'12px'}}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
            <p style={{fontSize:'14px', color:'rgba(200,230,192,0.5)',
                       fontFamily:'Playfair Display,serif'}}>No alerts</p>
            <p style={{fontSize:'11px', color:'rgba(200,230,192,0.25)', marginTop:'6px'}}>
              {tab === 'mine' ? 'You have no recorded alerts' : 'No alerts from group members yet'}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {sorted.map((item, i) => (
              <AlertCard key={`${item.alert.id}-${i}`} alert={item.alert} ownerName={item.ownerName}/>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}