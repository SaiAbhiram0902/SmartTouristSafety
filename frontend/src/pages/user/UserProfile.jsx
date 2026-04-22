import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'

function Ic({ size=16, stroke='currentColor', strokeWidth=2, children, style={} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={stroke} strokeWidth={strokeWidth}
         strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,...style}}>
      {children}
    </svg>
  )
}

function InfoRow({ label, value, mono=false }) {
  if (!value) return null
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                 padding:'12px 0',borderBottom:'1px solid rgba(200,230,192,0.06)'}}>
      <span style={{fontSize:'11px',color:'rgba(200,230,192,0.4)',letterSpacing:'0.5px'}}>{label}</span>
      <span style={{fontSize:'12px',color:'#fff',fontWeight:'500',
                    fontFamily:mono?'JetBrains Mono,monospace':'DM Sans,sans-serif'}}>{value}</span>
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
      style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(200,230,192,0.08)',
              borderRadius:'20px',padding:'18px',marginBottom:'14px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}>
        {icon}
        <p style={{fontSize:'11px',color:'rgba(200,230,192,0.4)',letterSpacing:'1px',textTransform:'uppercase'}}>
          {title}
        </p>
      </div>
      {children}
    </motion.div>
  )
}

export default function UserProfile() {
  const { touristId, username, logout } = useAuthStore()
  const navigate = useNavigate()
  const [profile,   setProfile]   = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [showLogout,setShowLogout]= useState(false)

  useEffect(() => {
    if (!touristId) return
    api.get(`/tourists/${touristId}/dashboard`)
      .then(r => { setDashboard(r.data); setProfile(r.data?.tourist) })
      .catch(()=>{})
      .finally(()=>setLoading(false))
  }, [touristId])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  if (loading) return (
    <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#0d1f10'}}>
      <motion.div animate={{opacity:[0.3,1,0.3]}} transition={{repeat:Infinity,duration:1.8}}
        style={{fontFamily:'Playfair Display,serif',fontSize:'16px',color:'rgba(106,171,94,0.6)',fontStyle:'italic'}}>
        Loading profile...
      </motion.div>
    </div>
  )

  const age = profile?.age

  return (
    <div style={{height:'100%',overflowY:'auto',background:'#0d1f10',fontFamily:'DM Sans,sans-serif'}}>

      {/* Hero header */}
      <div style={{position:'relative',padding:'40px 20px 28px',
                   background:'linear-gradient(180deg,rgba(26,58,31,0.9) 0%,rgba(13,31,16,0) 100%)'}}>
        {/* Avatar */}
        <div style={{display:'flex',alignItems:'flex-end',gap:'18px',marginBottom:'16px'}}>
          <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:'spring',damping:16}}
            style={{width:'80px',height:'80px',borderRadius:'50%',flexShrink:0,position:'relative',
                    border:'2px solid rgba(106,171,94,0.5)',background:'rgba(106,171,94,0.1)',
                    display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
            {profile?.photoUrl
              ? <img src={profile.photoUrl} alt={profile.name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>
              : <span style={{fontFamily:'Playfair Display,serif',fontSize:'32px',color:'#6aab5e',fontWeight:'700'}}>{profile?.name?.[0]??'?'}</span>
            }
            {profile?.active && (
              <div style={{position:'absolute',bottom:'4px',right:'4px',width:'14px',height:'14px',borderRadius:'50%',
                           background:'#6aab5e',border:'2px solid #0d1f10',boxShadow:'0 0 8px rgba(106,171,94,0.6)'}}/>
            )}
          </motion.div>
          <div>
            <motion.h1 initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}}
              style={{fontFamily:'Playfair Display,serif',fontSize:'24px',fontWeight:'700',color:'#fff',lineHeight:1.2}}>
              {profile?.name ?? username}
            </motion.h1>
            <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.1}}
              style={{fontSize:'11px',color:'rgba(200,230,192,0.4)',marginTop:'4px',fontFamily:'JetBrains Mono,monospace'}}>
              {touristId}
            </motion.p>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.15}}
              style={{marginTop:'6px'}}>
              {profile?.active
                ? <span style={{display:'inline-flex',alignItems:'center',gap:'5px',fontSize:'10px',color:'#6aab5e',background:'rgba(106,171,94,0.12)',padding:'3px 10px',borderRadius:'20px',border:'1px solid rgba(106,171,94,0.3)'}}>
                    <div style={{width:'5px',height:'5px',borderRadius:'50%',background:'#6aab5e'}}/>
                    Active Trek
                  </span>
                : <span style={{fontSize:'10px',color:'rgba(200,230,192,0.3)',background:'rgba(255,255,255,0.05)',padding:'3px 10px',borderRadius:'20px'}}>Inactive</span>
              }
            </motion.div>
          </div>
        </div>

        {/* Stats strip */}
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.2}}
          style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px'}}>
          {[
            { icon: <Ic size={18} stroke={dashboard?.totalAlerts>0?'#d4a843':'#6aab5e'} strokeWidth={1.8}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.5" fill={dashboard?.totalAlerts>0?'#d4a843':'#6aab5e'}/></Ic>,
              val: dashboard?.totalAlerts??0, label:'Alerts', onClick: ()=>navigate('/user/alerts') },
            { icon: <Ic size={18} stroke="#6aab5e" strokeWidth={1.8}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></Ic>,
              val: profile?.active?'On Trek':'Inactive', label:'Status', onClick: null },
            { icon: <Ic size={18} stroke="#6aab5e" strokeWidth={1.8}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Ic>,
              val: profile?.parentId?'Member':'Leader', label:'Role', onClick: null },
          ].map((s,i)=>(
            <div key={i} onClick={s.onClick} style={{background:'rgba(255,255,255,0.05)',borderRadius:'14px',padding:'12px',textAlign:'center',
                                  border:'1px solid rgba(200,230,192,0.07)',cursor:s.onClick?'pointer':'default',
                                  transition:'background 0.15s'}}>
              <div style={{display:'flex',justifyContent:'center',marginBottom:'5px'}}>{s.icon}</div>
              <p style={{fontFamily:'Playfair Display,serif',fontSize:'14px',fontWeight:'700',color:'#fff',lineHeight:1}}>{s.val}</p>
              <p style={{fontSize:'9px',color:'rgba(200,230,192,0.35)',marginTop:'2px',textTransform:'uppercase',letterSpacing:'0.5px'}}>{s.label}</p>
              {s.onClick&&<p style={{fontSize:'8px',color:'rgba(200,230,192,0.2)',marginTop:'2px'}}>tap →</p>}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Content */}
      <div style={{padding:'0 16px 120px'}}>

        {/* Personal info */}
        <Section title="Personal Information" icon={
          <Ic size={14} stroke="rgba(200,230,192,0.4)" strokeWidth={2}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </Ic>
        }>
          <InfoRow label="Full Name"   value={profile?.name}/>
          <InfoRow label="Phone"       value={profile?.phone} mono/>
          <InfoRow label="Age"         value={age ? `${age} years` : null}/>
          <InfoRow label="Tourist ID"  value={touristId} mono/>
          <InfoRow label="Registered"  value={profile?.registeredAt ? new Date(profile.registeredAt).toLocaleDateString('en-IN',{dateStyle:'medium'}) : null}/>
        </Section>

        {/* Trek info */}
        <Section title="Trek Details" icon={
          <Ic size={14} stroke="rgba(200,230,192,0.4)" strokeWidth={2}>
            <path d="m3 17 4-8 4 4 3-5 4 9"/><path d="M2 20h20"/>
          </Ic>
        }>
          <InfoRow label="Status"        value={profile?.active ? 'Active on trek' : 'Not on trek'}/>
          <InfoRow label="Expected Return" value={profile?.expectedReturnTime
            ? new Date(profile.expectedReturnTime).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})
            : null}/>
          <InfoRow label="Return Notes"  value={profile?.returnNotes}/>
          {dashboard?.lastLocation && <>
            <InfoRow label="Last GPS"    value={`${dashboard.lastLocation.latitude?.toFixed(5)}, ${dashboard.lastLocation.longitude?.toFixed(5)}`} mono/>
            <InfoRow label="Activity"    value={dashboard.lastLocation.activity}/>
            <InfoRow label="Last Seen"   value={new Date(dashboard.lastLocation.timestamp).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}/>
          </>}
        </Section>

        {/* Special needs — only shown if there's something relevant */}
        {(profile?.child || profile?.elder || profile?.handicapped) && (
          <Section title="Health & Accessibility" icon={
            <Ic size={14} stroke="rgba(200,230,192,0.4)" strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </Ic>
          }>
            {profile?.elder && (
              <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 0',borderBottom:'1px solid rgba(200,230,192,0.06)'}}>
                <div style={{width:'32px',height:'32px',borderRadius:'10px',background:'rgba(212,168,67,0.1)',border:'1px solid rgba(212,168,67,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <Ic size={16} stroke="#d4a843" strokeWidth={1.8}>
                    <path d="M12 2a5 5 0 0 1 5 5c0 2.76-2.24 5-5 5S7 9.76 7 7a5 5 0 0 1 5-5z"/>
                    <path d="M5 22c0-3.87 3.13-7 7-7s7 3.13 7 7"/>
                    <path d="M3 17l3 5M21 17l-3 5"/>
                  </Ic>
                </div>
                <div>
                  <p style={{fontSize:'12px',color:'#fff',fontWeight:'500'}}>Senior Traveller</p>
                  <p style={{fontSize:'10px',color:'rgba(200,230,192,0.35)'}}>Priority assistance available</p>
                </div>
              </div>
            )}
            {profile?.child && (
              <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 0',borderBottom:'1px solid rgba(200,230,192,0.06)'}}>
                <div style={{width:'32px',height:'32px',borderRadius:'10px',background:'rgba(56,189,248,0.1)',border:'1px solid rgba(56,189,248,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <Ic size={16} stroke="#38bdf8" strokeWidth={1.8}>
                    <path d="M12 2a5 5 0 0 1 5 5c0 2.76-2.24 5-5 5S7 9.76 7 7a5 5 0 0 1 5-5z"/>
                    <path d="M5 22c0-3.87 3.13-7 7-7s7 3.13 7 7"/>
                  </Ic>
                </div>
                <div>
                  <p style={{fontSize:'12px',color:'#fff',fontWeight:'500'}}>Child Traveller</p>
                  <p style={{fontSize:'10px',color:'rgba(200,230,192,0.35)'}}>Adult supervision required</p>
                </div>
              </div>
            )}
            {profile?.handicapped && (
              <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 0',borderBottom:'1px solid rgba(200,230,192,0.06)'}}>
                <div style={{width:'32px',height:'32px',borderRadius:'10px',background:'rgba(167,139,250,0.1)',border:'1px solid rgba(167,139,250,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <Ic size={16} stroke="#a78bfa" strokeWidth={1.8}>
                    <circle cx="12" cy="6" r="2"/>
                    <path d="M12 8v8M8 20h8M17 14l2 6"/>
                  </Ic>
                </div>
                <div>
                  <p style={{fontSize:'12px',color:'#fff',fontWeight:'500'}}>Accessibility Needs</p>
                  <p style={{fontSize:'10px',color:'rgba(200,230,192,0.35)'}}>Accessible routes prioritised</p>
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Emergency contact */}
        {(profile?.emergencyName||profile?.emergencyContact) && (
          <Section title="Emergency Contact" icon={
            <Ic size={14} stroke="rgba(200,230,192,0.4)" strokeWidth={2}>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.57 3.7 2 2 0 0 1 3.55 1.5h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </Ic>
          }>
            <div style={{display:'flex',alignItems:'center',gap:'14px',padding:'8px 0'}}>
              <div style={{width:'44px',height:'44px',borderRadius:'50%',background:'rgba(212,168,67,0.15)',
                           border:'1.5px solid rgba(212,168,67,0.3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span style={{fontFamily:'Playfair Display,serif',fontSize:'18px',color:'#d4a843',fontWeight:'700'}}>
                  {profile.emergencyName?.[0]??'?'}
                </span>
              </div>
              <div style={{flex:1}}>
                <p style={{fontSize:'14px',fontWeight:'600',color:'#fff',marginBottom:'3px'}}>{profile.emergencyName}</p>
                <p style={{fontSize:'12px',color:'rgba(200,230,192,0.45)',fontFamily:'JetBrains Mono,monospace'}}>{profile.emergencyContact}</p>
              </div>
              {profile.emergencyContact && (
                <a href={`tel:${profile.emergencyContact}`}
                   style={{padding:'10px 16px',borderRadius:'20px',background:'rgba(212,168,67,0.12)',
                           border:'1px solid rgba(212,168,67,0.3)',color:'#d4a843',fontSize:'12px',
                           textDecoration:'none',fontWeight:'600',fontFamily:'DM Sans,sans-serif',
                           display:'flex',alignItems:'center',gap:'6px'}}>
                  <Ic size={14} stroke="#d4a843" strokeWidth={2.5}>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.57 3.7 2 2 0 0 1 3.55 1.5h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </Ic>
                  Call
                </a>
              )}
            </div>
          </Section>
        )}

        {/* Safety tips */}
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.3}}
          style={{background:'linear-gradient(135deg,rgba(26,58,31,0.6),rgba(13,48,18,0.6))',
                  border:'1px solid rgba(106,171,94,0.15)',borderRadius:'20px',padding:'18px',marginBottom:'14px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'14px'}}>
            <Ic size={14} stroke="rgba(200,230,192,0.4)" strokeWidth={2}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </Ic>
            <p style={{fontSize:'11px',color:'rgba(200,230,192,0.4)',letterSpacing:'1px',textTransform:'uppercase'}}>
              Trail Safety Reminders
            </p>
          </div>
          {[
            { icon: <Ic size={13} stroke="rgba(56,189,248,0.7)" strokeWidth={2}><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></Ic>,
              text: 'Stay hydrated — drink water every 20 minutes' },
            { icon: <Ic size={13} stroke="rgba(106,171,94,0.7)" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></Ic>,
              text: 'Check in with your group leader regularly' },
            { icon: <Ic size={13} stroke="rgba(249,115,22,0.7)" strokeWidth={2}><path d="M19 16.9A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><polyline points="13 11 9 17 15 17 11 23"/></Ic>,
              text: 'Seek shelter immediately if you hear thunder' },
            { icon: <Ic size={13} stroke="rgba(239,68,68,0.7)" strokeWidth={2}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/></Ic>,
              text: 'Use the SOS button for any emergency' },
            { icon: <Ic size={13} stroke="rgba(212,168,67,0.7)" strokeWidth={2}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></Ic>,
              text: 'Keep your device charged — IoT tracker needs power' },
          ].map((tip,i)=>(
            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'8px',marginBottom:'8px'}}>
              <div style={{marginTop:'2px',flexShrink:0}}>{tip.icon}</div>
              <p style={{fontSize:'12px',color:'rgba(200,230,192,0.55)',lineHeight:'1.5'}}>{tip.text}</p>
            </div>
          ))}
        </motion.div>

        {/* Logout */}
        <motion.button whileTap={{scale:0.97}} onClick={()=>setShowLogout(true)}
          style={{width:'100%',padding:'15px',borderRadius:'16px',border:'1px solid rgba(239,68,68,0.2)',
                  background:'rgba(239,68,68,0.06)',color:'#e87070',fontSize:'14px',fontWeight:'600',
                  cursor:'pointer',fontFamily:'Playfair Display,serif',letterSpacing:'0.5px'}}>
          Sign Out
        </motion.button>
      </div>

      {/* Logout confirm */}
      <AnimatePresence>
        {showLogout && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:'fixed',inset:0,zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',
                    background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',padding:'24px'}}>
            <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}}
              style={{background:'rgba(10,22,12,0.98)',border:'1px solid rgba(200,230,192,0.12)',
                      borderRadius:'24px',padding:'28px 24px',maxWidth:'320px',width:'100%',textAlign:'center',
                      fontFamily:'DM Sans,sans-serif'}}>
              <div style={{display:'flex',justifyContent:'center',marginBottom:'14px'}}>
                <Ic size={40} stroke="rgba(106,171,94,0.4)" strokeWidth={1.2}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </Ic>
              </div>
              <p style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:'700',color:'#fff',marginBottom:'8px'}}>
                End Session?
              </p>
              <p style={{fontSize:'13px',color:'rgba(200,230,192,0.4)',lineHeight:'1.6',marginBottom:'24px'}}>
                You'll be signed out of TourSafe. Your IoT device will continue tracking independently.
              </p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <button onClick={()=>setShowLogout(false)}
                  style={{padding:'12px',borderRadius:'14px',border:'1px solid rgba(200,230,192,0.15)',
                          background:'rgba(255,255,255,0.06)',color:'rgba(200,230,192,0.6)',fontSize:'13px',
                          cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Stay</button>
                <button onClick={handleLogout}
                  style={{padding:'12px',borderRadius:'14px',border:'none',
                          background:'linear-gradient(135deg,#c0392b,#8b1a10)',color:'#fff',fontSize:'13px',
                          fontWeight:'600',cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Sign Out</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}