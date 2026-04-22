import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import api from '../../lib/api'

// ── Time-aware image sets ─────────────────────────────────────────
const IMAGE_SETS = {
  // Night: milky way over mountains, starry forest, moonlit mist
  night:   [ 'https://res.cloudinary.com/dmtad0slr/image/upload/q_auto,f_auto,w_3000/v1772995519/benjamin-grull-WbgnQUCxBuk-unsplash_yrbekk.jpg',
             'https://res.cloudinary.com/dmtad0slr/image/upload/q_auto,f_auto,w_3000/v1772997378/joshua-woroniecki-lruHubmBzl0-unsplash_exxbeh.jpg',
             'https://res.cloudinary.com/dmtad0slr/image/upload/q_auto,f_auto,w_3000/v1772997430/sour--fmAApuGbYM-unsplash_mubzlv.jpg' ],
  // Sunrise: golden fog valley, orange ridge, dawn forest light
  sunrise: [ 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2400&q=95',
             'https://res.cloudinary.com/dmtad0slr/image/upload/q_auto,f_auto,w_3000/v1772998338/andreas-psaltis-ki_vy43OMZY-unsplash_ddvedo.jpg',
             'https://res.cloudinary.com/dmtad0slr/image/upload/q_auto,f_auto,w_3000/v1772998338/w-m-CZqL6ba6hvI-unsplash_cszkuu.jpg' ],
  // Day: lush green forest, sunlit canopy, mountain meadow
  day:     [ 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=2400&q=95',
             'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=2400&q=95',
             'https://res.cloudinary.com/dmtad0slr/image/upload/q_auto,f_auto,w_3000/v1772998794/andreas-weilguny--r7OS3uOke4-unsplash_1_l9vj9d.jpg' ],
  // Sunset: warm amber sky over hills, silhouette treeline, orange glow valley
  sunset:  [ 'https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?w=2400&q=95',
             'https://images.unsplash.com/photo-1490682143684-14369e18dce8?w=2400&q=95',
             'https://res.cloudinary.com/dmtad0slr/image/upload/q_auto,f_auto,w_3000/v1772999443/sergey-churikov-bl35Rw2BcRI-unsplash_uuepk1.jpg' ],
  // Mist: fog through forest trees, misty mountain valley, ethereal low cloud
  mist:    [ 'https://images.unsplash.com/photo-1487621167305-5d248087c724?w=2400&q=95',
             'https://res.cloudinary.com/dmtad0slr/image/upload/q_auto,f_auto,w_3000/v1772999601/nikita-kulikov-bsgNlLrdO0w-unsplash_xb2fae.jpg',
             'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=2400&q=95' ],
  // Rain: rain on jungle leaves, forest in storm, wet mountain trail
  rain:    [ 'https://res.cloudinary.com/dmtad0slr/image/upload/q_auto,f_auto,w_3000/v1773000133/subhadip-kanjilal-nXz7qi-Qrt4-unsplash_1_evlwyx.jpg',
             'https://res.cloudinary.com/dmtad0slr/image/upload/q_auto,f_auto,w_3000/v1772999975/milin-john-PmE-IERJjr0-unsplash_gkefkx.jpg',
             'https://images.unsplash.com/photo-1438449805896-28a666819a20?w=2400&q=95' ],
}
const DEMO_MODES = ['auto','night','sunrise','day','sunset','mist','rain']
const DEMO_LABELS = { auto:'🕐 Auto', night:'🌙 Night', sunrise:'🌅 Sunrise', day:'☀️ Day', sunset:'🌇 Sunset', mist:'🌫 Mist', rain:'🌧 Rain' }

function getTimeMode(hour) {
  if (hour < 5)  return 'night'
  if (hour < 7)  return 'sunrise'
  if (hour < 18) return 'day'
  if (hour < 20) return 'sunset'
  return 'night'
}

// ── Weather widget ────────────────────────────────────────────────
function WeatherWidget({ lat, lng, onWeatherLoad }) {
  const [wx, setWx] = useState(null)
  useEffect(() => {
    if (!lat || !lng) return
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m&hourly=precipitation_probability&timezone=auto&forecast_days=1`)
      .then(r => r.json()).then(d => {
        const rain = d.hourly?.precipitation_probability?.[new Date().getHours()] ?? 0
        const wx = { ...d.current, rainChance: rain }
        setWx(wx)
        onWeatherLoad?.(wx)
      }).catch(() => {})
  }, [lat, lng])
  if (!wx) return null

  const code = wx.weathercode
  const icon = code <= 1 ? '☀️' : code <= 3 ? '⛅' : code <= 48 ? '🌫️' : code <= 67 ? '🌧️' : code <= 77 ? '❄️' : '⛈️'
  const feel = code <= 1  ? 'Clear skies — perfect for trekking'
             : code <= 3  ? 'Partly cloudy — great conditions'
             : code <= 48 ? 'Misty — watch your step'
             : code <= 67 ? 'Rain expected — carry a poncho'
             : '⚠️ Severe weather — stay safe'

  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.35}}
      style={{background:'rgba(255,255,255,0.06)',backdropFilter:'blur(16px)',
              border:'1px solid rgba(200,230,192,0.1)',borderRadius:'20px',padding:'16px 18px',
              display:'flex',alignItems:'center',gap:'14px',marginBottom:'16px'}}>
      <span style={{fontSize:'36px',flexShrink:0}}>{icon}</span>
      <div style={{flex:1}}>
        <div style={{display:'flex',alignItems:'baseline',gap:'10px',marginBottom:'3px'}}>
          <p style={{fontFamily:'Playfair Display,serif',fontSize:'28px',fontWeight:'700',color:'#fff',lineHeight:1}}>
            {Math.round(wx.temperature_2m)}°C
          </p>
          <p style={{fontSize:'11px',color:'rgba(200,230,192,0.5)'}}>{Math.round(wx.relative_humidity_2m ?? 0)}% humidity</p>
        </div>
        <p style={{fontSize:'11px',color:'rgba(200,230,192,0.6)',marginBottom:'4px'}}>{feel}</p>
        <div style={{display:'flex',gap:'12px'}}>
          <p style={{fontSize:'10px',color:'rgba(200,230,192,0.35)'}}>💨 {Math.round(wx.windspeed_10m)} km/h</p>
          <p style={{fontSize:'10px',color: wx.rainChance > 50 ? '#38bdf8':'rgba(200,230,192,0.35)'}}>
            🌧️ {wx.rainChance}% rain
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ── Weather hero inline (transparent, inside hero) ──────────────
function WeatherHeroInline({ lat, lng }) {
  const [wx, setWx] = useState(null)
  useEffect(() => {
    if (!lat || !lng) return
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode,windspeed_10m&hourly=precipitation_probability&timezone=auto&forecast_days=1`)
      .then(r => r.json()).then(d => {
        const rain = d.hourly?.precipitation_probability?.[new Date().getHours()] ?? 0
        setWx({ ...d.current, rainChance: rain })
      }).catch(() => {})
  }, [lat, lng])
  if (!wx) return null
  const code = wx.weathercode
  const icon = code <= 1 ? '☀️' : code <= 3 ? '⛅' : code <= 48 ? '🌫️' : code <= 67 ? '🌧️' : code <= 77 ? '❄️' : '⛈️'
  return (
    <div style={{display:'flex',alignItems:'center',gap:'14px',
                 background:'rgba(0,0,0,0.28)',backdropFilter:'blur(14px)',
                 borderRadius:'16px',padding:'10px 16px',border:'1px solid rgba(200,230,192,0.12)'}}>
      <span style={{fontSize:'28px'}}>{icon}</span>
      <div style={{flex:1}}>
        <div style={{display:'flex',alignItems:'baseline',gap:'10px'}}>
          <p style={{fontFamily:'Playfair Display,serif',fontSize:'26px',fontWeight:'700',color:'#fff',lineHeight:1}}>
            {Math.round(wx.temperature_2m)}°C
          </p>
          <p style={{fontSize:'10px',color:'rgba(200,230,192,0.45)'}}>
            💨 {Math.round(wx.windspeed_10m)} km/h
          </p>
        </div>
        <p style={{fontSize:'10px',color: wx.rainChance > 50 ? '#38bdf8' : 'rgba(200,230,192,0.4)',marginTop:'3px'}}>
          🌧️ {wx.rainChance}% chance of rain
        </p>
      </div>
    </div>
  )
}

// ── Group member row ──────────────────────────────────────────────
function GroupMemberRow({ member, isLeader }) {
  const statusColor = member.active ? '#6aab5e' : 'rgba(200,230,192,0.2)'
  return (
    <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 0',borderBottom:'1px solid rgba(200,230,192,0.06)'}}>
      <div style={{position:'relative',width:'36px',height:'36px',borderRadius:'50%',flexShrink:0,
                   background:'rgba(106,171,94,0.1)',border:`2px solid ${statusColor}`,
                   display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
        {member.photoUrl
          ? <img src={member.photoUrl} alt={member.name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>
          : <span style={{fontFamily:'Playfair Display,serif',fontSize:'14px',color:'#6aab5e',fontWeight:'700'}}>{member.name?.[0]}</span>
        }
        <div style={{position:'absolute',bottom:'0px',right:'0px',width:'8px',height:'8px',
                     borderRadius:'50%',background:statusColor,border:'1.5px solid #0d1f10'}}/>
      </div>
      <div style={{flex:1}}>
        <p style={{fontSize:'13px',fontWeight:'600',color:'#fff'}}>
          {member.name}
          {isLeader && <span style={{fontSize:'9px',color:'#d4a843',background:'rgba(212,168,67,0.15)',padding:'1px 6px',borderRadius:'8px',marginLeft:'6px'}}>Leader</span>}
        </p>
        <p style={{fontSize:'10px',color:'rgba(200,230,192,0.35)',marginTop:'1px'}}>
          {member.active
              ? <span style={{display:'flex',alignItems:'center',gap:'4px'}}><span style={{width:'6px',height:'6px',borderRadius:'50%',background:'#6aab5e',display:'inline-block'}}/>On trek</span>
              : <span style={{display:'flex',alignItems:'center',gap:'4px'}}><span style={{width:'6px',height:'6px',borderRadius:'50%',background:'rgba(200,230,192,0.2)',display:'inline-block'}}/>Checked out</span>
            }
        </p>
      </div>
    </div>
  )
}

export default function UserHome() {
  const navigate = useNavigate()
  const { touristId } = useAuthStore()

  const [profile,     setProfile]     = useState(null)
  const [loc,         setLoc]         = useState(null)
  const [latestAlert, setLatestAlert] = useState(null)
  const [totalAlerts, setTotalAlerts] = useState(0)
  const [group,       setGroup]       = useState(null)
  const [alerts,      setAlerts]      = useState([])
  const [imgIdx,      setImgIdx]      = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [time,        setTime]        = useState(new Date())
  const [demoMode,    setDemoMode]    = useState('auto')
  const [showDemo,    setShowDemo]    = useState(false)

  const hour = time.getHours()
  const timeMode = demoMode === 'auto' ? getTimeMode(hour) : demoMode
  const images = IMAGE_SETS[timeMode] ?? IMAGE_SETS.day

  // Cycle images
  useEffect(() => {
    setImgIdx(0)
    const t = setInterval(() => setImgIdx(i => (i + 1) % images.length), 7000)
    return () => clearInterval(t)
  }, [timeMode])

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!touristId) return
    api.get(`/tourists/${touristId}/dashboard`).then(r => {
      const d = r.data
      setProfile(d.tourist ?? null)
      setLoc(d.lastLocation ?? null)
      setLatestAlert(d.latestAlert ?? null)
      setTotalAlerts(d.totalAlerts ?? 0)
      const me = d.tourist
      if (!me) return
      if (!me.parentId) {
        setGroup({ leader: me, members: d.familyMembers ?? [] })
      } else {
        api.get(`/tourists/${me.parentId}/dashboard`).then(r2 => {
          const ld = r2.data
          setGroup({ leader: ld.tourist, members: (ld.familyMembers ?? []).filter(m => m.touristId !== touristId) })
        }).catch(() => {})
      }
    }).catch(console.error)
    api.get('/alerts').then(r => {
      setAlerts((r.data ?? []).filter(a => a.touristId === touristId).slice(0, 3))
    }).catch(() => {})
      .finally(() => setLoading(false))
  }, [touristId])

  const greetHour = hour
  const greeting = greetHour < 5 ? 'Good night' : greetHour < 12 ? 'Good morning' : greetHour < 17 ? 'Good afternoon' : greetHour < 21 ? 'Good evening' : 'Good night'

  if (loading) return (
    <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#0d1f10'}}>
      <motion.div animate={{opacity:[0.3,1,0.3]}} transition={{repeat:Infinity,duration:1.8}}
        style={{fontFamily:'Playfair Display,serif',fontSize:'18px',color:'rgba(106,171,94,0.6)',fontStyle:'italic'}}>
        Loading your trail...
      </motion.div>
    </div>
  )

  return (
    <div style={{height:'100%',overflowY:'auto',background:'#0d1f10',fontFamily:'DM Sans,sans-serif'}}>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div style={{position:'relative',height:'92dvh',overflow:'hidden',flexShrink:0}}>
        <AnimatePresence mode="sync">
          <motion.div key={`${timeMode}-${imgIdx}`}
            initial={{opacity:0,scale:1.04}} animate={{opacity:1,scale:1}} exit={{opacity:0}}
            transition={{duration:1.4}}
            style={{position:'absolute',inset:0,
                    backgroundImage:`url(${images[imgIdx]})`,
                    backgroundSize:'cover',backgroundPosition:'center',
                    filter:'brightness(0.62) saturate(1.1)'}}/>
        </AnimatePresence>

        <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom, rgba(13,31,16,0.1) 0%, rgba(13,31,16,0) 30%, rgba(13,31,16,0.65) 72%, #0d1f10 100%)'}}/>

        {/* Image dots */}
        <div style={{position:'absolute',top:'18px',left:'50%',transform:'translateX(-50%)',display:'flex',gap:'5px',zIndex:2}}>
          {images.map((_,i)=>(
            <div key={i} style={{width:i===imgIdx?'18px':'5px',height:'5px',borderRadius:'3px',
              background:i===imgIdx?'rgba(200,230,192,0.9)':'rgba(200,230,192,0.25)',transition:'all 0.4s ease'}}/>
          ))}
        </div>

        {/* Top bar */}
        <div style={{position:'absolute',top:0,left:0,right:0,padding:'16px 18px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <p style={{fontFamily:'Playfair Display,serif',fontSize:'13px',fontStyle:'italic',color:'rgba(200,230,192,0.7)',letterSpacing:'1px'}}>TourSafe</p>
          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            {/* Demo mode toggle (show button) */}
            <button onClick={()=>setShowDemo(s=>!s)}
              style={{background:'rgba(0,0,0,0.3)',backdropFilter:'blur(10px)',borderRadius:'20px',padding:'4px 10px',
                      border:'1px solid rgba(200,230,192,0.12)',color:'rgba(200,230,192,0.55)',fontSize:'9px',
                      cursor:'pointer',letterSpacing:'0.5px',fontFamily:'DM Sans,sans-serif'}}>DEMO</button>
            <div style={{background:'rgba(0,0,0,0.35)',backdropFilter:'blur(10px)',borderRadius:'20px',padding:'5px 14px',border:'1px solid rgba(200,230,192,0.1)'}}>
              <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'12px',color:'rgba(200,230,192,0.7)'}}>
                {time.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
              </p>
            </div>
          </div>
        </div>

        {/* Demo mode picker */}
        <AnimatePresence>
          {showDemo && (
            <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
              style={{position:'absolute',top:'52px',right:'18px',zIndex:10,
                      background:'rgba(8,20,10,0.96)',backdropFilter:'blur(16px)',
                      border:'1px solid rgba(200,230,192,0.12)',borderRadius:'14px',padding:'10px',
                      display:'flex',flexDirection:'column',gap:'4px',minWidth:'130px'}}>
              {DEMO_MODES.map(m=>(
                <button key={m} onClick={()=>{setDemoMode(m);setShowDemo(false)}}
                  style={{padding:'7px 12px',borderRadius:'10px',border:'none',cursor:'pointer',textAlign:'left',
                          background:demoMode===m?'rgba(106,171,94,0.18)':'transparent',
                          color:demoMode===m?'#6aab5e':'rgba(200,230,192,0.5)',fontSize:'11px',fontFamily:'DM Sans,sans-serif',
                          fontWeight:demoMode===m?'600':'400'}}>
                  {DEMO_LABELS[m]}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero text + inline weather */}
        <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'0 20px 24px'}}>
          <motion.p initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.1}}
            style={{fontSize:'12px',color:'rgba(200,230,192,0.55)',letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:'5px'}}>
            {greeting}
          </motion.p>
          <motion.h1 initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.2}}
            style={{fontFamily:'Playfair Display,serif',fontSize:'32px',fontWeight:'700',color:'#fff',lineHeight:1.15,marginBottom:'10px'}}>
            {profile?.name || 'Adventurer'}
          </motion.h1>
          <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}}
            style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap',marginBottom:'14px'}}>
            {profile?.active
              ? <span style={{background:'rgba(106,171,94,0.2)',border:'1px solid rgba(106,171,94,0.4)',color:'#6aab5e',fontSize:'11px',padding:'3px 10px',borderRadius:'20px',display:'flex',alignItems:'center',gap:'5px'}}><span style={{width:'6px',height:'6px',borderRadius:'50%',background:'#6aab5e',display:'inline-block',boxShadow:'0 0 4px #6aab5e'}}/>Active Trek</span>
              : <span style={{background:'rgba(200,230,192,0.07)',border:'1px solid rgba(200,230,192,0.12)',color:'rgba(200,230,192,0.35)',fontSize:'11px',padding:'3px 10px',borderRadius:'20px'}}>Inactive</span>
            }
            <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'10px',color:'rgba(200,230,192,0.35)'}}>{touristId}</span>
          </motion.div>
          {/* Weather inline — transparent glass over hero */}
          {loc && <WeatherHeroInline lat={loc.latitude} lng={loc.longitude}/>}
          {/* Scroll hint */}
          <motion.div animate={{y:[0,5,0]}} transition={{repeat:Infinity,duration:2,ease:'easeInOut'}}
            style={{display:'flex',justifyContent:'center',marginTop:'10px'}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(200,230,192,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </motion.div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div style={{padding:'0 16px 120px'}}>

        {/* Tappable stat pills */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.25}}
          style={{display:'flex',gap:'10px',marginBottom:'20px'}}>
          {[
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={loc?'#6aab5e':'rgba(200,230,192,0.25)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'block',margin:'0 auto 2px'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
              label:'Location', value: loc ? 'Live GPS' : 'No GPS',
              color: loc?'#6aab5e':'rgba(200,230,192,0.25)',
              onClick: ()=>navigate('/user/map'), tappable: !!loc },
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={totalAlerts>0?'#d4a843':'#6aab5e'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'block',margin:'0 auto 2px'}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
              label:'Alerts', value: totalAlerts,
              color: totalAlerts>0?'#d4a843':'#6aab5e',
              onClick: ()=>navigate('/user/alerts'), tappable: true },
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6aab5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'block',margin:'0 auto 2px'}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
              label:'Group', value: group?(group.members.length+1):'—',
              color:'#6aab5e',
              onClick: ()=>navigate('/user/map'), tappable: !!group },
          ].map((s,i)=>(
            <motion.button key={i} whileTap={s.tappable?{scale:0.94}:{}} onClick={s.tappable?s.onClick:undefined}
              style={{flex:1,background:'rgba(255,255,255,0.05)',borderRadius:'16px',padding:'14px 10px',
                      border:`1px solid ${s.tappable?'rgba(200,230,192,0.1)':'rgba(200,230,192,0.06)'}`,
                      textAlign:'center',cursor:s.tappable?'pointer':'default',fontFamily:'DM Sans,sans-serif',
                      transition:'background 0.15s'}}>
              <div style={{marginBottom:'4px',display:'flex',justifyContent:'center'}}>{s.icon}</div>
              <p style={{fontFamily:'Playfair Display,serif',fontSize:'18px',fontWeight:'700',color:s.color,lineHeight:1}}>{s.value}</p>
              <p style={{fontSize:'9px',color:'rgba(200,230,192,0.35)',marginTop:'3px',letterSpacing:'0.5px',textTransform:'uppercase'}}>{s.label}</p>
              {s.tappable&&<p style={{fontSize:'8px',color:'rgba(200,230,192,0.2)',marginTop:'3px'}}>tap to view →</p>}
            </motion.button>
          ))}
        </motion.div>

        {/* Alert banner */}
        <AnimatePresence>
          {latestAlert && ['FALL','SOS','CRITICAL','OVERDUE'].some(t=>latestAlert.type?.toUpperCase().includes(t)) && (
            <motion.div initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} exit={{opacity:0}}
              style={{background:'rgba(192,57,43,0.1)',border:'1px solid rgba(192,57,43,0.3)',borderRadius:'16px',
                      padding:'14px 16px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'12px'}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e87070" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div>
                <p style={{fontSize:'12px',fontWeight:'600',color:'#e87070',marginBottom:'2px'}}>{latestAlert.type}</p>
                <p style={{fontSize:'11px',color:'rgba(255,255,255,0.45)',lineHeight:'1.4'}}>{latestAlert.message?.slice(0,100)}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick actions */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.3}}
          style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'}}>
          {[
            { icon: <svg width='26' height='26' viewBox='0 0 24 24' fill='none' stroke='#6aab5e' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><polygon points='1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6'/><line x1='8' y1='2' x2='8' y2='18'/><line x1='16' y1='6' x2='16' y2='22'/></svg>, label:'Open Map', sub:'Track your location', path:'/user/map', grad:'linear-gradient(135deg,#1a3a2a,#0d2018)' },
            { icon: <svg width='26' height='26' viewBox='0 0 24 24' fill='none' stroke='#6aab5e' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='10'/><polygon points='16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76'/></svg>, label:'Explore', sub:'Discover hotspots', path:'/user/explore', grad:'linear-gradient(135deg,#1a2a3a,#0d1820)' },
          ].map(a=>(
            <motion.button key={a.path} whileHover={{y:-2}} whileTap={{scale:0.97}} onClick={()=>navigate(a.path)}
              style={{padding:'18px 14px',borderRadius:'20px',border:'1px solid rgba(200,230,192,0.1)',
                      background:a.grad,cursor:'pointer',textAlign:'left',fontFamily:'DM Sans,sans-serif'}}>
              <div style={{marginBottom:'8px'}}>{a.icon}</div>
              <p style={{fontSize:'13px',fontWeight:'600',color:'#fff',marginBottom:'2px'}}>{a.label}</p>
              <p style={{fontSize:'10px',color:'rgba(200,230,192,0.4)'}}>{a.sub}</p>
            </motion.button>
          ))}
        </motion.div>

        {/* Last location */}
        {loc && (
          <motion.button whileTap={{scale:0.98}} onClick={()=>navigate('/user/map')}
            initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.35}}
            style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(200,230,192,0.08)',
                    borderRadius:'20px',padding:'16px',marginBottom:'16px',textAlign:'left',cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>
            <p style={{fontSize:'11px',color:'rgba(200,230,192,0.4)',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'10px',display:'flex',alignItems:'center',gap:'5px'}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>Last Known Location</p>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
              <div>
                <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'15px',color:'#6aab5e',marginBottom:'4px'}}>
                  {loc.latitude?.toFixed(5)}, {loc.longitude?.toFixed(5)}
                </p>
                <p style={{fontSize:'10px',color:'rgba(200,230,192,0.3)'}}>
                  {loc.activity?`${loc.activity} · `:''}{new Date(loc.timestamp).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                </p>
              </div>
              <span style={{fontSize:'12px',color:'rgba(106,171,94,0.6)'}}>View Map →</span>
            </div>
          </motion.button>
        )}

        {/* Group panel */}
        {group && (
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.4}}
            style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(200,230,192,0.08)',borderRadius:'20px',padding:'16px',marginBottom:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <p style={{fontSize:'11px',color:'rgba(200,230,192,0.4)',letterSpacing:'1px',textTransform:'uppercase',display:'flex',alignItems:'center',gap:'5px'}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>My Group</p>
              <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                <span style={{fontSize:'11px',color:'#6aab5e',background:'rgba(106,171,94,0.1)',
                              padding:'2px 10px',borderRadius:'20px',border:'1px solid rgba(106,171,94,0.2)'}}>
                  {[group.leader,...group.members].filter(m=>m?.active).length} active
                </span>
                <motion.button whileTap={{scale:0.92}} onClick={()=>navigate('/user/map')}
                  style={{fontSize:'10px',color:'rgba(200,230,192,0.4)',background:'rgba(255,255,255,0.05)',
                          border:'1px solid rgba(200,230,192,0.1)',padding:'3px 10px',borderRadius:'20px',
                          cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Track →</motion.button>
              </div>
            </div>
            <GroupMemberRow member={group.leader} isLeader={true}/>
            {group.members.map(m=><GroupMemberRow key={m.touristId} member={m} isLeader={false}/>)}
          </motion.div>
        )}

        {/* Return time */}
        {profile?.expectedReturnTime && (
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.45}}
            style={{background:'rgba(212,168,67,0.07)',border:'1px solid rgba(212,168,67,0.18)',borderRadius:'20px',padding:'16px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'14px'}}>
            <span style={{fontSize:'28px'}}>🕐</span>
            <div>
              <p style={{fontSize:'10px',color:'rgba(212,168,67,0.6)',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:'4px'}}>Expected Return</p>
              <p style={{fontFamily:'Playfair Display,serif',fontSize:'15px',color:'#d4a843',fontWeight:'600'}}>
                {new Date(profile.expectedReturnTime).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}
              </p>
            </div>
          </motion.div>
        )}

        {/* Recent alerts */}
        {alerts.length > 0 && (
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.5}}>
            <p style={{fontSize:'11px',color:'rgba(200,230,192,0.4)',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'10px'}}>🔔 Recent Alerts</p>
            {alerts.map(a=>(
              <div key={a.id} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(200,230,192,0.07)',borderRadius:'14px',padding:'12px 14px',marginBottom:'8px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                  <span style={{fontSize:'11px',fontWeight:'600',color:'#d4a843'}}>{a.type}</span>
                  <span style={{fontSize:'9px',color:'rgba(200,230,192,0.3)',fontFamily:'JetBrains Mono,monospace'}}>
                    {new Date(a.timestamp).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                  </span>
                </div>
                <p style={{fontSize:'11px',color:'rgba(200,230,192,0.45)',lineHeight:'1.4'}}>{a.message?.slice(0,80)}</p>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}