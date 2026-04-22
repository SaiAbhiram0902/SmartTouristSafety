import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import api from '../../lib/api'

const UNSPLASH = {
  // Mountain ridge panoramic viewpoint
  VIEWPOINT:      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1800&q=95',
  // Forest campfire rest area — warm, inviting
  REST_STOP:      'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1800&q=95',
  // Outdoor first aid / rescue team in forest — nature-medical, not clinical
  MEDICAL:        'https://res.cloudinary.com/dmtad0slr/image/upload/v1773000816/86581540-stethoscope-on-green-grass-close-up-nature-and-medicine_v2ns50.jpg?w=1800&q=95',
  // Crystal clear waterfall in lush green forest
  WATER:          'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1800&q=95',
  // Forest trail shelter
  SHELTER:        'https://res.cloudinary.com/dmtad0slr/image/upload/v1773001273/richard-burlton-RAvKetzcTWM-unsplash_1_iqdsvf.jpg?w=1800&q=95',
  // Rustic outdoor food stall / local chai shop at trailhead
  FOOD_STALL:     'https://res.cloudinary.com/dmtad0slr/image/upload/v1773001099/fresh-organic-vegetables-on-blurred-nature-background-healthy-food-and-diet-concept-photo_1_mp11pv.jpg?w=1800&q=95',
  // Danger — stormy mountain
  DANGER_CLUSTER: 'https://res.cloudinary.com/dmtad0slr/image/upload/v1773001446/ricardo-gomez-angel-zGq5AOIBD3E-unsplash_bhhmse.jpg?w=1800&q=95',
}

const CAT_COLORS = {
  FOOD_STALL: '#f97316',
  VIEWPOINT:'#2979ff', REST_STOP:'#00e5cc', MEDICAL:'#22c55e',
  WATER:'#38bdf8', SHELTER:'#a78bfa', DANGER_CLUSTER:'#ef4444',
}
const CAT_LABELS = {
  FOOD_STALL:'Food Spot', VIEWPOINT:'Viewpoint', REST_STOP:'Rest Stop',
  MEDICAL:'Medical', WATER:'Water Source', SHELTER:'Shelter', DANGER_CLUSTER:'Danger Zone'
}
const catLabel = k => CAT_LABELS[k] ?? k.replace(/_/g,' ')

// ── Category SVG icons ────────────────────────────────────────────
function CatIcon({ category, size=16, color }) {
  const c = color ?? (CAT_COLORS[category] ?? '#6aab5e')
  const props = { width:size, height:size, viewBox:'0 0 24 24', fill:'none',
                  stroke:c, strokeWidth:1.8, strokeLinecap:'round', strokeLinejoin:'round',
                  style:{flexShrink:0} }
  switch(category) {
    case 'VIEWPOINT':
      return <svg {...props}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    case 'REST_STOP':
      return <svg {...props}><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><path d="M6 2c0 1.5 1.5 2 1.5 3.5S6 7 6 8"/><path d="M10 2c0 1.5 1.5 2 1.5 3.5S10 7 10 8"/><path d="M14 2c0 1.5 1.5 2 1.5 3.5S14 7 14 8"/></svg>
    case 'MEDICAL':
      return <svg {...props}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
    case 'WATER':
      return <svg {...props}><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
    case 'SHELTER':
      return <svg {...props}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    case 'FOOD_STALL':
      return <svg {...props}><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><line x1="7" y1="2" x2="7" y2="22"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3v5"/></svg>
    case 'DANGER_CLUSTER':
      return <svg {...props}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.5" fill={c}/></svg>
    default:
      return <svg {...props}><circle cx="12" cy="12" r="10"/></svg>
  }
}

// Safely parse facilities — Java may store as comma-string or JSON array string
function parseFacilities(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  try { const p = JSON.parse(raw); if (Array.isArray(p)) return p.filter(Boolean) } catch {}
  return String(raw).replace(/[\[\]"]/g,'').split(',').map(s=>s.trim()).filter(Boolean)
}

function StarRating({ value, onChange, readonly=false, size=16 }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{display:'flex',gap:'3px'}}>
      {[1,2,3,4,5].map(s=>(
        <span key={s}
          style={{fontSize:size,cursor:readonly?'default':'pointer',
                  color: (hover||value)>=s ? '#d4a843':'rgba(200,230,192,0.2)',
                  transition:'color 0.1s'}}
          onMouseEnter={()=>!readonly&&setHover(s)}
          onMouseLeave={()=>!readonly&&setHover(0)}
          onClick={()=>!readonly&&onChange&&onChange(s)}>★</span>
      ))}
    </div>
  )
}

function ReviewCard({ review }) {
  return (
    <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(200,230,192,0.07)',
                 borderRadius:'14px',padding:'14px',marginBottom:'10px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <div style={{width:'30px',height:'30px',borderRadius:'50%',background:'rgba(106,171,94,0.15)',
                       display:'flex',alignItems:'center',justifyContent:'center',
                       border:'1px solid rgba(106,171,94,0.2)',flexShrink:0}}>
            <span style={{fontFamily:'Playfair Display,serif',fontSize:'13px',color:'#6aab5e',fontWeight:'700'}}>
              {review.authorName?.[0]?.toUpperCase()??'?'}
            </span>
          </div>
          <div>
            <p style={{fontSize:'12px',fontWeight:'600',color:'#fff'}}>{review.authorName ?? 'Anonymous'}</p>
            <p style={{fontSize:'9px',color:'rgba(200,230,192,0.3)',fontFamily:'JetBrains Mono,monospace'}}>
              {new Date(review.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
            </p>
          </div>
        </div>
        <StarRating value={review.rating} readonly size={13}/>
      </div>
      {review.comment && (
        <p style={{fontSize:'12px',color:'rgba(200,230,192,0.55)',lineHeight:'1.6',fontStyle:'italic'}}>
          "{review.comment}"
        </p>
      )}
    </div>
  )
}

function ReviewForm({ hotspotId, onSubmitted }) {
  const { touristId, username } = useAuthStore()
  const [rating,  setRating]  = useState(0)
  const [comment, setComment] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [done,    setDone]    = useState(false)

  async function submit() {
    if (!rating) return
    setSaving(true)
    try {
      await api.post(`/hotspots/${hotspotId}/reviews`, {
        touristId, authorName: username, rating, comment
      })
      setDone(true)
      onSubmitted?.()
    } catch {}
    setSaving(false)
  }

  if (done) return (
    <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}}
      style={{textAlign:'center',padding:'16px',background:'rgba(106,171,94,0.08)',
              border:'1px solid rgba(106,171,94,0.2)',borderRadius:'14px'}}>
      <div style={{display:'flex',justifyContent:'center',marginBottom:'6px'}}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6aab5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
      <p style={{fontSize:'12px',color:'#6aab5e',fontWeight:'600'}}>Review submitted — thank you!</p>
    </motion.div>
  )

  return (
    <div style={{background:'rgba(106,171,94,0.06)',border:'1px solid rgba(106,171,94,0.15)',
                 borderRadius:'16px',padding:'16px'}}>
      <p style={{fontSize:'12px',color:'rgba(200,230,192,0.6)',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:'12px'}}>
        Leave a Review
      </p>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
        <StarRating value={rating} onChange={setRating} size={24}/>
        {rating>0&&<span style={{fontSize:'11px',color:'rgba(200,230,192,0.4)'}}>
          {['','Terrible','Poor','Okay','Good','Excellent!'][rating]}
        </span>}
      </div>
      <textarea value={comment} onChange={e=>setComment(e.target.value)}
        placeholder="Share your experience at this spot..."
        style={{width:'100%',padding:'12px 14px',borderRadius:'12px',fontSize:'12px',color:'#fff',
                background:'rgba(255,255,255,0.05)',border:'1px solid rgba(200,230,192,0.1)',
                resize:'none',height:'80px',fontFamily:'DM Sans,sans-serif',
                lineHeight:'1.5',outline:'none',marginBottom:'12px'}}/>
      <motion.button whileTap={{scale:0.97}} onClick={submit} disabled={!rating||saving}
        style={{width:'100%',padding:'12px',borderRadius:'12px',border:'none',cursor:rating?'pointer':'not-allowed',
                background:rating?'linear-gradient(135deg,#4a8c3f,#2d5a27)':'rgba(255,255,255,0.05)',
                color:rating?'#c8e6c0':'rgba(200,230,192,0.25)',fontSize:'13px',fontWeight:'600',
                fontFamily:'DM Sans,sans-serif',transition:'all 0.2s',display:'flex',alignItems:'center',
                justifyContent:'center',gap:'8px'}}>
        {saving ? 'Submitting...' : (
          <>
            Submit Review
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </>
        )}
      </motion.button>
    </div>
  )
}

function HotspotSheet({ hotspot, onClose, myId }) {
  const [reviews,    setReviews]    = useState([])
  const [loadingRev, setLoadingRev] = useState(true)
  const [tab,        setTab]        = useState('info')
  const color = CAT_COLORS[hotspot.category] ?? '#6aab5e'

  useEffect(() => {
    api.get(`/hotspots/${hotspot.id}/reviews`)
      .then(r => setReviews(r.data ?? []))
      .catch(()=>setReviews([]))
      .finally(()=>setLoadingRev(false))
  }, [hotspot.id])

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1)
    : null

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{position:'fixed',inset:0,zIndex:500,display:'flex',alignItems:'flex-end',
              background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)'}} onClick={onClose}>
      <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
        transition={{type:'spring',damping:28,stiffness:280}}
        onClick={e=>e.stopPropagation()}
        style={{width:'100%',background:'linear-gradient(180deg,#0f2212 0%,#0a1a0d 100%)',
                borderTop:'1px solid rgba(106,171,94,0.15)',borderRadius:'24px 24px 0 0',
                maxHeight:'88vh',display:'flex',flexDirection:'column',fontFamily:'DM Sans,sans-serif'}}>

        {/* Hero image */}
        <div style={{position:'relative',height:'220px',borderRadius:'24px 24px 0 0',overflow:'hidden',flexShrink:0}}>
          <img src={UNSPLASH[hotspot.category]} alt={hotspot.name}
               style={{width:'100%',height:'100%',objectFit:'cover',filter:'brightness(0.6)'}}
               onError={e=>e.target.style.display='none'}/>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,#0f2212 0%,transparent 60%)'}}/>
          <button onClick={onClose} style={{position:'absolute',top:'14px',right:'14px',width:'30px',height:'30px',
            borderRadius:'50%',border:'1px solid rgba(255,255,255,0.2)',background:'rgba(0,0,0,0.4)',
            color:'rgba(255,255,255,0.7)',fontSize:'16px',cursor:'pointer',display:'flex',
            alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)',fontFamily:'DM Sans,sans-serif'}}>×</button>
          <div style={{position:'absolute',bottom:'14px',left:'18px',right:'18px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
              <CatIcon category={hotspot.category} size={16} color={color}/>
              <span style={{fontSize:'10px',color,background:`${color}22`,padding:'2px 8px',borderRadius:'20px',border:`1px solid ${color}44`}}>
                {catLabel(hotspot.category)}
              </span>
            </div>
            <h2 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:'700',color:'#fff',lineHeight:1.2}}>
              {hotspot.name}
            </h2>
          </div>
        </div>

        {/* Rating summary */}
        {avgRating && (
          <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 20px',
                       borderBottom:'1px solid rgba(200,230,192,0.07)',flexShrink:0}}>
            <span style={{fontFamily:'Playfair Display,serif',fontSize:'32px',color:'#d4a843',fontWeight:'700'}}>{avgRating}</span>
            <div>
              <StarRating value={Math.round(avgRating)} readonly size={15}/>
              <p style={{fontSize:'10px',color:'rgba(200,230,192,0.35)',marginTop:'2px'}}>{reviews.length} review{reviews.length!==1?'s':''}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{display:'flex',padding:'0 20px',borderBottom:'1px solid rgba(200,230,192,0.07)',flexShrink:0}}>
          {[
            { id:'info',    label:'Info',    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
            { id:'reviews', label:'Reviews', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
          ].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{flex:1,padding:'12px 0',border:'none',background:'none',cursor:'pointer',fontFamily:'DM Sans,sans-serif',
                      fontSize:'12px',fontWeight:tab===t.id?'600':'400',letterSpacing:'0.5px',textTransform:'uppercase',
                      color:tab===t.id?'#6aab5e':'rgba(200,230,192,0.35)',
                      borderBottom:tab===t.id?'2px solid #6aab5e':'2px solid transparent',
                      transition:'all 0.15s',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{overflowY:'auto',flex:1,padding:'18px 20px 32px'}}>
          {tab==='info' && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}}>
              {hotspot.description && hotspot.description!=='null' && (
                <p style={{fontSize:'13px',color:'rgba(200,230,192,0.6)',lineHeight:'1.7',marginBottom:'16px'}}>{hotspot.description}</p>
              )}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
                {hotspot.capacity&&<div style={{background:'rgba(255,255,255,0.04)',borderRadius:'12px',padding:'12px',border:'1px solid rgba(200,230,192,0.07)'}}>
                  <p style={{fontSize:'9px',color:'rgba(200,230,192,0.35)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'4px'}}>Capacity</p>
                  <p style={{fontSize:'16px',fontWeight:'700',color:'#fff',fontFamily:'Playfair Display,serif'}}>{hotspot.capacity}</p>
                  <p style={{fontSize:'9px',color:'rgba(200,230,192,0.3)'}}>people</p>
                </div>}
                {hotspot.radius&&<div style={{background:'rgba(255,255,255,0.04)',borderRadius:'12px',padding:'12px',border:'1px solid rgba(200,230,192,0.07)'}}>
                  <p style={{fontSize:'9px',color:'rgba(200,230,192,0.35)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'4px'}}>Detection Radius</p>
                  <p style={{fontSize:'16px',fontWeight:'700',color:'#fff',fontFamily:'Playfair Display,serif'}}>{hotspot.radius}m</p>
                </div>}
              </div>

              {/* Operating hours */}
              {hotspot.openingTime && (
                <div style={{background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.18)',
                             borderRadius:'14px',padding:'14px',marginBottom:'16px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'10px'}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(212,168,67,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <p style={{fontSize:'10px',color:'rgba(212,168,67,0.6)',textTransform:'uppercase',letterSpacing:'0.8px'}}>Operating Hours</p>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                    <div>
                      <p style={{fontSize:'9px',color:'rgba(200,230,192,0.35)',marginBottom:'2px'}}>Opens</p>
                      <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'15px',color:'#d4a843',fontWeight:'600'}}>{hotspot.openingTime}</p>
                    </div>
                    <div>
                      <p style={{fontSize:'9px',color:'rgba(200,230,192,0.35)',marginBottom:'2px'}}>Closes</p>
                      <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'15px',color:'#d4a843',fontWeight:'600'}}>{hotspot.closingTime || '—'}</p>
                    </div>
                    {hotspot.breakStart && <>
                      <div>
                        <p style={{fontSize:'9px',color:'rgba(200,230,192,0.35)',marginBottom:'2px'}}>Break from</p>
                        <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'13px',color:'rgba(212,168,67,0.6)'}}>{hotspot.breakStart}</p>
                      </div>
                      <div>
                        <p style={{fontSize:'9px',color:'rgba(200,230,192,0.35)',marginBottom:'2px'}}>Break until</p>
                        <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'13px',color:'rgba(212,168,67,0.6)'}}>{hotspot.breakEnd || '—'}</p>
                      </div>
                    </>}
                  </div>
                  {hotspot.openDays && (
                    <div style={{display:'flex',alignItems:'center',gap:'5px',marginTop:'8px'}}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(200,230,192,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <p style={{fontSize:'11px',color:'rgba(200,230,192,0.4)'}}>{hotspot.openDays}</p>
                    </div>
                  )}
                </div>
              )}
              {parseFacilities(hotspot.facilities).length > 0 && (
                <div style={{marginBottom:'16px'}}>
                  <p style={{fontSize:'10px',color:'rgba(200,230,192,0.35)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'8px'}}>Facilities</p>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                    {parseFacilities(hotspot.facilities).map(f=>(
                      <span key={f} style={{fontSize:'11px',color:'#6aab5e',background:'rgba(106,171,94,0.1)',
                        padding:'4px 10px',borderRadius:'20px',border:'1px solid rgba(106,171,94,0.2)'}}>{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {hotspot.alertCount>0&&(
                <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',
                             borderRadius:'12px',padding:'12px',marginBottom:'16px',display:'flex',gap:'10px',alignItems:'center'}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e87070" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.5" fill="#e87070"/>
                  </svg>
                  <p style={{fontSize:'12px',color:'#e87070'}}>{hotspot.alertCount} incident{hotspot.alertCount>1?'s':''} recorded near this location. Exercise caution.</p>
                </div>
              )}
              <div style={{background:'rgba(255,255,255,0.03)',borderRadius:'12px',padding:'12px',border:'1px solid rgba(200,230,192,0.06)'}}>
                <p style={{fontSize:'9px',color:'rgba(200,230,192,0.3)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'6px'}}>Coordinates</p>
                <p style={{fontSize:'12px',color:'rgba(200,230,192,0.5)',fontFamily:'JetBrains Mono,monospace'}}>
                  {hotspot.latitude?.toFixed(5)}, {hotspot.longitude?.toFixed(5)}
                </p>
              </div>
            </motion.div>
          )}

          {tab==='reviews' && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}}>
              <div style={{marginBottom:'16px'}}>
                <ReviewForm hotspotId={hotspot.id} onSubmitted={()=>api.get(`/hotspots/${hotspot.id}/reviews`).then(r=>setReviews(r.data??[])).catch(()=>{})}/>
              </div>
              {loadingRev ? (
                <div style={{textAlign:'center',padding:'20px',color:'rgba(200,230,192,0.3)',fontSize:'12px'}}>Loading reviews...</div>
              ) : reviews.length===0 ? (
                <div style={{textAlign:'center',padding:'20px'}}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(106,171,94,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{margin:'0 auto 10px',display:'block'}}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <p style={{fontSize:'12px',color:'rgba(200,230,192,0.3)'}}>No reviews yet — be the first!</p>
                </div>
              ) : reviews.map(r=><ReviewCard key={r.id} review={r}/>)}
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function UserExplore() {
  const { touristId } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [hotspots, setHotspots] = useState([])
  const [selected, setSelected] = useState(null)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    api.get('/hotspots')
      .then(r => {
        const list = r.data.filter(h => h.category !== 'DANGER_CLUSTER')
        setHotspots(list)
        const targetId = searchParams.get('hotspot')
        if (targetId) {
          const match = list.find(h => String(h.id) === targetId)
          if (match) setSelected(match)
        }
      })
      .catch(()=>{})
      .finally(()=>setLoading(false))
  }, [])

  const categories = ['all', ...new Set(hotspots.map(h=>h.category))]
  const filtered = hotspots.filter(h => {
    const matchSearch = h.name?.toLowerCase().includes(search.toLowerCase()) || h.description?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter==='all' || h.category===filter
    return matchSearch && matchFilter
  })

  return (
    <div style={{height:'100%',overflowY:'auto',background:'#0d1f10',fontFamily:'DM Sans,sans-serif'}}>

      {/* Header */}
      <div style={{padding:'24px 20px 0',background:'linear-gradient(180deg,rgba(26,58,31,0.8) 0%,transparent 100%)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'4px'}}>
          <button onClick={()=>navigate(-1)}
            style={{width:'36px',height:'36px',borderRadius:'50%',flexShrink:0,
                    border:'1px solid rgba(200,230,192,0.15)',background:'rgba(255,255,255,0.06)',
                    color:'rgba(200,230,192,0.6)',cursor:'pointer',
                    display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <motion.h1 initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
            style={{fontFamily:'Playfair Display,serif',fontSize:'28px',fontWeight:'700',color:'#fff'}}>
            Explore
          </motion.h1>
        </div>
        <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.1}}
          style={{fontSize:'12px',color:'rgba(200,230,192,0.4)',marginBottom:'18px',paddingLeft:'48px'}}>
          Discover trail hotspots · Read & leave reviews
        </motion.p>

        {/* Search */}
        <div style={{position:'relative',marginBottom:'14px'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search hotspots..."
            style={{width:'100%',padding:'12px 16px 12px 42px',borderRadius:'14px',fontSize:'13px',color:'#fff',
                    background:'rgba(255,255,255,0.07)',border:'1px solid rgba(200,230,192,0.1)',
                    outline:'none',fontFamily:'DM Sans,sans-serif'}}/>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(200,230,192,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
               style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)'}}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>

        {/* Category filter pills */}
        <div style={{display:'flex',gap:'8px',overflowX:'auto',paddingBottom:'14px',scrollbarWidth:'none'}}>
          {categories.map(cat=>{
            const color = cat==='all'?'#6aab5e':(CAT_COLORS[cat]??'#6aab5e')
            const active = filter===cat
            return (
              <button key={cat} onClick={()=>setFilter(cat)} style={{
                padding:'6px 14px',borderRadius:'20px',border:`1px solid ${active?color+'88':'rgba(200,230,192,0.1)'}`,
                background:active?`${color}22`:'rgba(255,255,255,0.04)',
                color:active?color:'rgba(200,230,192,0.4)',fontSize:'11px',fontWeight:active?'600':'400',
                cursor:'pointer',whiteSpace:'nowrap',fontFamily:'DM Sans,sans-serif',transition:'all 0.15s',
                display:'flex',alignItems:'center',gap:'6px'}}>
                {cat==='all'
                  ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> All</>
                  : <><CatIcon category={cat} size={12} color={active ? color : 'rgba(200,230,192,0.4)'}/>{catLabel(cat)}</>
                }
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid */}
      <div style={{padding:'0 16px 100px'}}>
        {loading ? (
          <div style={{textAlign:'center',padding:'40px'}}>
            <motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:2,ease:'linear'}}
              style={{width:'32px',height:'32px',margin:'0 auto 12px',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(106,171,94,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            </motion.div>
            <p style={{fontSize:'12px',color:'rgba(200,230,192,0.3)'}}>Discovering hotspots...</p>
          </div>
        ) : filtered.length===0 ? (
          <div style={{textAlign:'center',padding:'40px'}}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(200,230,192,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{margin:'0 auto 12px',display:'block'}}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p style={{fontSize:'13px',color:'rgba(200,230,192,0.3)'}}>No hotspots found</p>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            {filtered.map((h,i)=>{
              const color = CAT_COLORS[h.category]??'#6aab5e'
              return (
                <motion.div key={h.id} layout initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
                  transition={{delay:i*0.04}} whileTap={{scale:0.97}}
                  onClick={()=>setSelected(h)}
                  style={{borderRadius:'18px',overflow:'hidden',cursor:'pointer',
                          background:'rgba(255,255,255,0.04)',border:'1px solid rgba(200,230,192,0.08)'}}>
                  {/* Image */}
                  <div style={{height:'130px',overflow:'hidden',position:'relative'}}>
                    <img src={UNSPLASH[h.category]} alt={h.name}
                         style={{width:'100%',height:'100%',objectFit:'cover',filter:'brightness(0.72) saturate(1.05)'}}
                         onError={e=>{e.target.style.display='none'}}/>
                    <div style={{position:'absolute',inset:0,background:`linear-gradient(to bottom,transparent 40%,rgba(13,31,16,0.92) 100%)`}}/>
                    {/* Category icon badge top-left */}
                    <div style={{position:'absolute',top:'8px',left:'8px',width:'26px',height:'26px',borderRadius:'8px',
                                 background:'rgba(0,0,0,0.55)',backdropFilter:'blur(6px)',
                                 display:'flex',alignItems:'center',justifyContent:'center',
                                 border:`1px solid ${color}44`}}>
                      <CatIcon category={h.category} size={14} color={color}/>
                    </div>
                    {h.alertCount>0&&<div style={{position:'absolute',top:'8px',right:'8px',background:'rgba(239,68,68,0.85)',
                      borderRadius:'10px',padding:'2px 7px',fontSize:'9px',fontWeight:'700',color:'#fff',
                      display:'flex',alignItems:'center',gap:'3px'}}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                      </svg>
                      {h.alertCount}
                    </div>}
                  </div>
                  {/* Info */}
                  <div style={{padding:'10px 12px'}}>
                    <p style={{fontSize:'12px',fontWeight:'600',color:'#fff',marginBottom:'3px',
                                fontFamily:'Playfair Display,serif',lineHeight:1.3}}>
                      {h.name.length>22?h.name.slice(0,22)+'…':h.name}
                    </p>
                    <span style={{fontSize:'8px',color,background:`${color}18`,padding:'2px 7px',
                                  borderRadius:'20px',border:`1px solid ${color}30`}}>
                      {catLabel(h.category)}
                    </span>
                    {h.description&&h.description!=='null'&&(
                      <p style={{fontSize:'10px',color:'rgba(200,230,192,0.35)',marginTop:'6px',lineHeight:'1.4',
                                  display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                        {h.description}
                      </p>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Hotspot detail sheet */}
      <AnimatePresence>
        {selected && <HotspotSheet hotspot={selected} myId={touristId} onClose={()=>setSelected(null)}/>}
      </AnimatePresence>
    </div>
  )
}