import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'
import useAuthStore from '../../store/authStore'
import api from '../../lib/api'
import TrailChatbot from '../../components/TrailChatbot'

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; }
  :root {
    --forest: #1a3a1f; --moss: #2d5a27; --leaf: #4a8c3f;
    --fern: #6aab5e; --sage: #8fbc82; --morning: #c8e6c0;
    --amber: #d4a843; --gold: #f0c060; --bark: #8b6340;
    --mist: #e8f0e5; --sky: #7eb8d4; --danger: #c0392b; --bg: #0d1f10;
  }
  body { background: var(--bg); }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: rgba(106,171,94,0.3); border-radius: 2px; }
  @keyframes sosPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(192,57,43,0.6), 0 4px 24px rgba(192,57,43,0.4); }
    60%     { box-shadow: 0 0 0 14px rgba(192,57,43,0), 0 4px 24px rgba(192,57,43,0.4); }
  }
  @keyframes breatheGlow {
    0%,100% { opacity: 0.7; } 50% { opacity: 1; }
  }
`

function SOSModal({ onClose, touristId }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [type, setType]       = useState('SOS')
  const [note, setNote]       = useState('')
  const SvgIcon = ({path, path2, size=26, stroke='#fff'}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path}/>{path2 && <path d={path2}/>}
    </svg>
  )
  const types = [
    { id:'SOS',
      Icon: ({s}) => <SvgIcon stroke={s} path="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" path2="M12 9v4M12 17h.01"/>,
      label:'Emergency SOS',  desc:'Immediate danger' },
    { id:'MEDICAL',
      Icon: ({s}) => <SvgIcon stroke={s} path="M22 12h-4l-3 9L9 3l-3 9H2"/>,
      label:'Medical Help',    desc:'Injury or illness' },
    { id:'LOST',
      Icon: ({s}) => <SvgIcon stroke={s} path="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0" path2="M12 8v4l3 3"/>,
      label:'Lost / Stranded', desc:'Cannot find trail' },
    { id:'WILDLIFE',
      Icon: ({s}) => <SvgIcon stroke={s} path="M8 3v4l4 2 4-2V3M4 9l4 2v6l4 2 4-2v-6l4-2"/>,
      label:'Wildlife Threat', desc:'Dangerous animal' },
  ]
  async function send() {
    setSending(true)
    try { await api.post('/alerts', { touristId, type, severity:'CRITICAL', message: note || types.find(t=>t.id===type)?.desc }) }
    catch {}
    setSent(true); setSending(false)
  }
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'flex-end',
              background:'rgba(0,0,0,0.8)',backdropFilter:'blur(8px)'}} onClick={onClose}>
      <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
        transition={{type:'spring',damping:28,stiffness:280}} onClick={e=>e.stopPropagation()}
        style={{width:'100%',background:'linear-gradient(180deg,#1c0808 0%,#0d0505 100%)',
                borderTop:'1px solid rgba(192,57,43,0.4)',borderRadius:'24px 24px 0 0',
                padding:'28px 24px 44px',fontFamily:'DM Sans,sans-serif'}}>
        {sent ? (
          <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} style={{textAlign:'center',padding:'16px 0'}}>
            <div style={{fontSize:'52px',marginBottom:'14px'}}>✅</div>
            <p style={{fontFamily:'Playfair Display,serif',fontSize:'22px',color:'#fff',marginBottom:'8px'}}>Alert Sent</p>
            <p style={{fontSize:'13px',color:'rgba(255,255,255,0.45)',marginBottom:'24px',lineHeight:'1.5'}}>
              The safety team has been notified and will respond immediately.
            </p>
            <button onClick={onClose} style={{padding:'12px 36px',borderRadius:'50px',
              background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',
              color:'#fff',fontSize:'14px',cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Close</button>
          </motion.div>
        ) : (
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'22px'}}>
              <div>
                <p style={{fontFamily:'Playfair Display,serif',fontSize:'22px',fontWeight:'700',color:'#fff'}}>Emergency Alert</p>
                <p style={{fontSize:'12px',color:'rgba(255,255,255,0.35)',marginTop:'3px'}}>Notifies safety team immediately</p>
              </div>
              <button onClick={onClose} style={{width:'30px',height:'30px',borderRadius:'50%',border:'1px solid rgba(255,255,255,0.15)',
                background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.5)',fontSize:'16px',cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif'}}>×</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
              {types.map(t=>(
                <button key={t.id} onClick={()=>setType(t.id)} style={{
                  padding:'14px 12px',borderRadius:'14px',cursor:'pointer',textAlign:'left',
                  background:type===t.id?'rgba(192,57,43,0.2)':'rgba(255,255,255,0.04)',
                  border:`1.5px solid ${type===t.id?'rgba(192,57,43,0.7)':'rgba(255,255,255,0.08)'}`,
                  transition:'all 0.15s',fontFamily:'DM Sans,sans-serif'}}>
                  <div style={{marginBottom:'6px'}}><t.Icon s={type===t.id?'#fff':'rgba(255,255,255,0.4)'}/></div>
                  <div style={{fontSize:'12px',fontWeight:'600',color:'#fff',marginBottom:'2px'}}>{t.label}</div>
                  <div style={{fontSize:'10px',color:'rgba(255,255,255,0.35)'}}>{t.desc}</div>
                </button>
              ))}
            </div>
            <textarea value={note} onChange={e=>setNote(e.target.value)}
              placeholder="Additional details (optional)..."
              style={{width:'100%',padding:'12px 16px',borderRadius:'12px',fontSize:'13px',color:'#fff',
                      background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',
                      resize:'none',height:'68px',fontFamily:'DM Sans,sans-serif',outline:'none',marginBottom:'16px'}}/>
            <motion.button whileTap={{scale:0.97}} onClick={send} disabled={sending} style={{
              width:'100%',padding:'16px',borderRadius:'14px',border:'none',cursor:'pointer',
              background:'linear-gradient(135deg,#c0392b,#8b1a10)',fontSize:'16px',fontWeight:'700',
              color:'#fff',fontFamily:'Playfair Display,serif',letterSpacing:'0.5px',
              boxShadow:'0 6px 24px rgba(192,57,43,0.5)'}}>
              {sending?'Sending...':`Send ${types.find(t=>t.id===type)?.label}`}
            </motion.button>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

const NAV = [
  { path:'/user/home',    label:'Home',    D:<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>, D2:<polyline points="9 22 9 12 15 12 15 22"/> },
  { path:'/user/map',     label:'Map',     D:<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>, D2:<><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></> },
  { path:'/user/explore', label:'Explore', D:<circle cx="12" cy="12" r="10"/>, D2:<polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/> },
  { path:'/user/profile', label:'Me',      D:<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
]

export default function UserLayout() {
  const [sosOpen, setSosOpen] = useState(false)
  const [liveAlerts, setLiveAlerts] = useState([])   // real-time push toasts
  const touristId = useAuthStore(s => s.touristId)

  // Alert types that warrant a push notification to the tourist
  const PUSH_TYPES = new Set(['ZONE','CRITICAL','FALL','SOS','HIGH','NO_SIGNAL','OVERDUE'])

  const dismissLiveAlert = useCallback((id) => {
    setLiveAlerts(prev => prev.filter(a => a._toastId !== id))
  }, [])

  // ── Real-time WebSocket subscription ──────────────────────────
  useEffect(() => {
    if (!touristId) return
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      onConnect: () => {
        client.subscribe('/topic/alerts', (msg) => {
          const alert = JSON.parse(msg.body)
          // Only show alerts that belong to this tourist
          if (alert.touristId !== touristId) return
          // Only show alert types worth interrupting the tourist for
          if (!PUSH_TYPES.has(alert.type?.toUpperCase())) return

          const toastId = `${alert.id ?? Date.now()}-${Math.random()}`
          setLiveAlerts(prev => [{ ...alert, _toastId: toastId }, ...prev.slice(0, 2)])
          // Auto-dismiss after 8s
          setTimeout(() => dismissLiveAlert(toastId), 8000)
        })
      },
      reconnectDelay: 5000,
    })
    client.activate()
    return () => client.deactivate()
  }, [touristId, dismissLiveAlert])

  function alertColor(type) {
    const t = type?.toUpperCase()
    if (t === 'FALL' || t === 'SOS' || t === 'CRITICAL') return { bg:'rgba(192,57,43,0.18)', border:'rgba(192,57,43,0.55)', dot:'#ef4444' }
    if (t === 'ZONE') return { bg:'rgba(212,168,67,0.15)', border:'rgba(212,168,67,0.45)', dot:'#d4a843' }
    if (t === 'OVERDUE') return { bg:'rgba(212,168,67,0.15)', border:'rgba(212,168,67,0.45)', dot:'#d4a843' }
    return { bg:'rgba(41,121,255,0.14)', border:'rgba(41,121,255,0.4)', dot:'#2979ff' }
  }
  return (
    <>
      <style>{FONTS}</style>
      <div style={{height:'100dvh',display:'flex',flexDirection:'column',background:'var(--bg)',position:'relative'}}>
        <div style={{flex:1,overflow:'hidden',position:'relative'}}>
          <Outlet />
        </div>

        {/* Bottom nav */}
        <div style={{background:'rgba(8,16,9,0.95)',backdropFilter:'blur(24px)',
                     borderTop:'1px solid rgba(106,171,94,0.1)',padding:'8px 8px 14px',
                     display:'flex',justifyContent:'space-around',flexShrink:0,position:'relative',zIndex:50}}>
          {NAV.map(item=>(
            <NavLink key={item.path} to={item.path} style={{textDecoration:'none',flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
              {({isActive})=>(
                <>
                  <motion.div whileTap={{scale:0.82}} style={{padding:'6px 18px',borderRadius:'12px',
                    background:isActive?'rgba(106,171,94,0.15)':'transparent',transition:'background 0.2s'}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill={isActive?'rgba(106,171,94,0.2)':'none'}
                         stroke={isActive?'#6aab5e':'rgba(200,230,192,0.35)'} strokeWidth="1.8"
                         strokeLinecap="round" strokeLinejoin="round">
                      {item.D}{item.D2}
                    </svg>
                  </motion.div>
                  <span style={{fontSize:'10px',fontWeight:isActive?'600':'400',letterSpacing:'0.4px',
                    color:isActive?'#6aab5e':'rgba(200,230,192,0.3)',transition:'color 0.2s'}}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Floating SOS */}
        <motion.button whileTap={{scale:0.88}} onClick={()=>setSosOpen(true)}
          style={{position:'fixed',bottom:'76px',right:'18px',zIndex:200,width:'52px',height:'52px',
                  borderRadius:'50%',border:'none',cursor:'pointer',
                  background:'linear-gradient(135deg,#c0392b,#8b1a10)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  animation:'sosPulse 2.4s ease-in-out infinite',fontFamily:'DM Sans,sans-serif'}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.5" fill="#fff"/>
          </svg>
        </motion.button>

        <TrailChatbot />

        {/* ── Real-time alert toasts ── */}
        <div style={{position:'fixed',top:'12px',left:'12px',right:'12px',zIndex:500,
                     display:'flex',flexDirection:'column',gap:'8px',pointerEvents:'none'}}>
          <AnimatePresence>
            {liveAlerts.map(a => {
              const c = alertColor(a.type)
              return (
                <motion.div key={a._toastId}
                  initial={{opacity:0,y:-18,scale:0.96}} animate={{opacity:1,y:0,scale:1}}
                  exit={{opacity:0,y:-14,scale:0.94}} transition={{duration:0.25}}
                  style={{background:c.bg,backdropFilter:'blur(16px)',
                          border:`1px solid ${c.border}`,borderRadius:'14px',
                          padding:'12px 14px',display:'flex',alignItems:'flex-start',gap:'10px',
                          pointerEvents:'all',cursor:'pointer',boxShadow:'0 4px 24px rgba(0,0,0,0.5)'}}
                  onClick={() => dismissLiveAlert(a._toastId)}>
                  <div style={{width:'8px',height:'8px',borderRadius:'50%',background:c.dot,
                               marginTop:'4px',flexShrink:0,boxShadow:`0 0 6px ${c.dot}`}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontFamily:'DM Sans,sans-serif',fontSize:'12px',fontWeight:'700',
                               color:'#fff',marginBottom:'2px'}}>{a.type}</p>
                    <p style={{fontFamily:'DM Sans,sans-serif',fontSize:'11px',
                               color:'rgba(255,255,255,0.55)',lineHeight:'1.4',
                               overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {a.message}
                    </p>
                  </div>
                  <button onClick={() => dismissLiveAlert(a._toastId)}
                    style={{background:'none',border:'none',color:'rgba(255,255,255,0.3)',
                            fontSize:'14px',cursor:'pointer',padding:0,lineHeight:1,flexShrink:0}}>×</button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {sosOpen && <SOSModal onClose={()=>setSosOpen(false)} touristId={touristId}/>}
        </AnimatePresence>
      </div>
    </>
  )
}