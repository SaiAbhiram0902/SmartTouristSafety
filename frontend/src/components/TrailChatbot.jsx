import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../lib/api'

function TypingIndicator() {
  return (
    <div style={{display:'flex',alignItems:'center',gap:'4px',padding:'12px 14px',
                 background:'rgba(106,171,94,0.08)',borderRadius:'16px 16px 16px 4px',
                 border:'1px solid rgba(106,171,94,0.15)',width:'fit-content'}}>
      {[0,1,2].map(i=>(
        <motion.div key={i} style={{width:'6px',height:'6px',borderRadius:'50%',background:'#6aab5e'}}
          animate={{y:[0,-5,0]}} transition={{repeat:Infinity,duration:0.8,delay:i*0.15}}/>
      ))}
    </div>
  )
}

export default function TrailChatbot() {
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState([
    { role:'assistant', content:"🌿 Hey! I'm Trail Guide — your personal tour assistant. Ask me anything about trail safety, wildlife, first aid, or what to do in an emergency!" }
  ])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [offline,  setOffline]  = useState(false)
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages, loading])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 300) }, [open])

  async function send(overrideText) {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return
    setInput('')
    setOffline(false)
    const newMessages = [...messages, { role:'user', content:text }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const res = await api.post('/chat', {
        messages: newMessages.map(m => ({ role:m.role, content:m.content }))
      })
      const data = res.data
      if (data.error) {
        setMessages(prev => [...prev, { role:'assistant', content:`⚠️ ${data.error}` }])
      } else {
        // Backend proxy returns { reply: "..." } — not raw Anthropic format
        const reply = data.reply
          ?? data.content?.find(c => c.type==='text')?.text
          ?? "I'm having a moment — please try again! 🌿"
        setMessages(prev => [...prev, { role:'assistant', content:reply }])
      }
    } catch(err) {
      const status = err?.response?.status
      const serverError = err?.response?.data?.error
      if (status === 503) {
        setMessages(prev => [...prev, { role:'assistant', content:'🔧 The AI assistant isn\'t configured yet. Ask the park admin to set up the API key.' }])
      } else if (status === 502) {
        setMessages(prev => [...prev, { role:'assistant', content:`⚠️ Upstream error: ${serverError ?? 'Could not reach AI service. Check server logs.'}` }])
      } else if (status === 401) {
        setMessages(prev => [...prev, { role:'assistant', content:'🔒 Session expired — please log in again.' }])
      } else {
        setMessages(prev => [...prev, { role:'assistant', content:`⚠️ Error ${status ?? ''}: ${serverError ?? err?.message ?? 'Unknown error. Check backend is running.'}` }])
      }
      setOffline(true)
    }
    setLoading(false)
  }

  const QUICK = [
    '🦁 Wildlife encounter tips',
    '💧 Signs of dehydration',
    '🦶 Blister first aid',
    '⛈️ Caught in a storm',
    '🧭 Lost on trail?',
    '🐍 Snake bite protocol',
  ]

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}
            whileHover={{scale:1.08}} whileTap={{scale:0.9}}
            onClick={()=>setOpen(true)}
            style={{position:'fixed',bottom:'76px',left:'18px',zIndex:200,width:'52px',height:'52px',
                    borderRadius:'50%',border:'none',cursor:'pointer',
                    background:'linear-gradient(135deg,#2d5a27,#4a8c3f)',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    boxShadow:'0 4px 20px rgba(74,140,63,0.45)',fontFamily:'DM Sans,sans-serif'}}
            title="Trail Guide AI">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c8e6c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div initial={{opacity:0,y:40,scale:0.96}} animate={{opacity:1,y:0,scale:1}}
            exit={{opacity:0,y:40,scale:0.96}} transition={{type:'spring',damping:26,stiffness:280}}
            style={{position:'fixed',bottom:'76px',left:'12px',right:'12px',zIndex:300,
                    height:'72vh',maxHeight:'560px',display:'flex',flexDirection:'column',
                    background:'rgba(8,20,10,0.98)',backdropFilter:'blur(24px)',
                    border:'1px solid rgba(106,171,94,0.2)',borderRadius:'24px',
                    boxShadow:'0 20px 60px rgba(0,0,0,0.6)',overflow:'hidden',fontFamily:'DM Sans,sans-serif'}}>

            {/* Header */}
            <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(106,171,94,0.1)',
                         background:'linear-gradient(135deg,rgba(26,58,31,0.8),rgba(13,31,16,0.8))',
                         display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <div style={{width:'36px',height:'36px',borderRadius:'50%',
                             background:'linear-gradient(135deg,#2d5a27,#4a8c3f)',
                             display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c8e6c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div>
                  <p style={{fontFamily:'Playfair Display,serif',fontSize:'14px',fontWeight:'700',color:'#fff'}}>Trail Guide</p>
                  <p style={{fontSize:'9px',color:'rgba(200,230,192,0.4)'}}>AI · trekking safety assistant</p>
                </div>
              </div>
              <button onClick={()=>setOpen(false)}
                style={{width:'28px',height:'28px',borderRadius:'50%',border:'1px solid rgba(200,230,192,0.15)',
                        background:'rgba(255,255,255,0.05)',color:'rgba(200,230,192,0.5)',fontSize:'16px',
                        cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif'}}>×</button>
            </div>

            {/* Messages */}
            <div style={{flex:1,overflowY:'auto',padding:'14px',display:'flex',flexDirection:'column',gap:'10px'}}>
              {messages.map((m,i)=>(
                <motion.div key={i} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
                  style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
                  <div style={{maxWidth:'84%',padding:'10px 13px',
                               borderRadius:m.role==='user'?'18px 18px 4px 18px':'18px 18px 18px 4px',
                               background:m.role==='user'
                                 ?'linear-gradient(135deg,#2d5a27,#1a3a1f)'
                                 :'rgba(106,171,94,0.08)',
                               border:m.role==='user'?'none':'1px solid rgba(106,171,94,0.15)',
                               fontSize:'13px',lineHeight:'1.6',
                               color:m.role==='user'?'rgba(200,230,192,0.95)':'rgba(200,230,192,0.85)',
                               whiteSpace:'pre-wrap'}}>
                    {m.content}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div style={{display:'flex',justifyContent:'flex-start'}}>
                  <TypingIndicator/>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* Quick prompts — only on first message */}
            {messages.length <= 1 && (
              <div style={{padding:'0 14px 8px',display:'flex',gap:'6px',overflowX:'auto',
                           scrollbarWidth:'none',flexShrink:0,flexWrap:'nowrap'}}>
                {QUICK.map(q=>(
                  <button key={q} onClick={()=>send(q)}
                    style={{padding:'6px 12px',borderRadius:'20px',border:'1px solid rgba(106,171,94,0.22)',
                            background:'rgba(106,171,94,0.07)',color:'rgba(200,230,192,0.6)',fontSize:'10px',
                            cursor:'pointer',whiteSpace:'nowrap',fontFamily:'DM Sans,sans-serif',
                            transition:'all 0.15s',flexShrink:0}}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Offline warning */}
            <AnimatePresence>
              {offline && (
                <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:4}}
                  style={{margin:'0 14px 6px',padding:'7px 12px',borderRadius:'10px',
                          background:'rgba(212,168,67,0.1)',border:'1px solid rgba(212,168,67,0.2)',
                          fontSize:'10px',color:'rgba(212,168,67,0.7)',textAlign:'center',flexShrink:0}}>
                  No internet connection detected
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div style={{padding:'10px 12px 14px',borderTop:'1px solid rgba(106,171,94,0.1)',
                         display:'flex',gap:'8px',alignItems:'flex-end',flexShrink:0}}>
              <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()} }}
                placeholder="Ask about safety, wildlife, first aid..."
                rows={1}
                style={{flex:1,padding:'10px 13px',borderRadius:'14px',fontSize:'13px',color:'#fff',
                        background:'rgba(255,255,255,0.06)',border:'1px solid rgba(200,230,192,0.1)',
                        resize:'none',fontFamily:'DM Sans,sans-serif',outline:'none',lineHeight:'1.5',
                        maxHeight:'80px',overflowY:'auto'}}/>
              <motion.button whileTap={{scale:0.9}} onClick={()=>send()} disabled={!input.trim()||loading}
                style={{width:'40px',height:'40px',borderRadius:'50%',border:'none',flexShrink:0,
                        background:input.trim()?'linear-gradient(135deg,#4a8c3f,#2d5a27)':'rgba(255,255,255,0.05)',
                        cursor:input.trim()?'pointer':'not-allowed',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        transition:'background 0.2s',fontFamily:'DM Sans,sans-serif'}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                     stroke={input.trim()?'#c8e6c0':'rgba(200,230,192,0.25)'} strokeWidth="2.5"
                     strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}