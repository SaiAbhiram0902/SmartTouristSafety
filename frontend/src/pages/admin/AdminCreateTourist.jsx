import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  User, Phone, MapPin, Shield, Users,
  Clock, Camera, CheckCircle, AlertCircle,
  ChevronRight, Upload, X, Baby, PersonStanding, Accessibility,
} from 'lucide-react'
import api from '../../lib/api'

// ── Field component ───────────────────────────────────────────────
function Field({ label, required, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{
        fontFamily: 'Inter, sans-serif', fontSize: '11px',
        fontWeight: '600', letterSpacing: '1px',
        color: error ? '#c0392b' : 'rgba(0,229,204,0.7)',
        textTransform: 'uppercase',
      }}>
        {label} {required && <span style={{ color: '#c0392b' }}>*</span>}
      </label>
      {children}
      {error && (
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertCircle size={11} /> {error}
        </span>
      )}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%', padding: '12px 14px',
        borderRadius: '10px', fontSize: '13px',
        color: '#ffffff', fontFamily: 'Inter, sans-serif',
        background: focused ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${focused ? 'rgba(0,229,204,0.4)' : 'rgba(255,255,255,0.08)'}`,
        outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.2s, background 0.2s',
      }}
      {...props}
    />
  )
}

// ── Section header ────────────────────────────────────────────────
function Section({ icon: Icon, title, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid rgba(0,229,204,0.07)' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,229,204,0.08)', border: '1px solid rgba(0,229,204,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={13} color="#00e5cc" />
        </div>
        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '13px', fontWeight: '600', color: '#ffffff', letterSpacing: '0.3px' }}>
          {title}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {children}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function AdminCreateTourist() {
  const navigate  = useNavigate()
  const photoRef  = useRef(null)

  const empty = {
    touristId: '', name: '', phone: '', address: '',
    emergencyName: '', emergencyContact: '', emergencyApiKey: '',
    parentId: '', expectedReturnTime: '',
    age: '',
    child: false, elder: false, handicapped: false,
  }

  const [form,        setForm]        = useState(empty)
  const [photo,       setPhoto]       = useState(null)      // File object
  const [photoPreview,setPhotoPreview]= useState(null)      // data URL
  const [errors,      setErrors]      = useState({})
  const [loading,     setLoading]     = useState(false)
  const [success,     setSuccess]     = useState(null)      // created tourist name

  function set(field) {
    return e => {
      setForm(prev => ({ ...prev, [field]: e.target.value }))
      if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  function removePhoto() {
    setPhoto(null)
    setPhotoPreview(null)
    if (photoRef.current) photoRef.current.value = ''
  }

  // ── Validation ────────────────────────────────────────────────
  function validate() {
    const e = {}
    if (!form.touristId.trim())       e.touristId       = 'Tourist ID is required'
    if (!form.name.trim())            e.name            = 'Name is required'
    if (!form.phone.trim())           e.phone           = 'Phone is required'
    if (!form.emergencyName.trim())   e.emergencyName   = 'Emergency contact name is required'
    if (!form.emergencyContact.trim())e.emergencyContact= 'Emergency phone is required'
    if (!form.expectedReturnTime)     e.expectedReturnTime = 'Expected return time is required'
    if (!form.parentId.trim())        e.parentId        = 'Group assignment is required — use tourist ID of group leader, or own ID if leader'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Submit ────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    try {
      // 1 — Create tourist record
      // Send times as plain local datetime strings (no UTC conversion)
      // Backend stores as LocalDateTime — keeping IST as-is is correct
      const now = new Date()
      const pad = n => String(n).padStart(2, '0')
      const localNow = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

      const payload = {
        ...form,
        active: true,
        registeredAt: localNow,
        expectedReturnTime: form.expectedReturnTime ? form.expectedReturnTime + ':00' : null,
        parentId: form.parentId.trim() === form.touristId.trim() ? null : form.parentId.trim() || null,
      }

      await api.post('/tourists', payload)

      // 2 — Upload photo if provided
      if (photo) {
        const fd = new FormData()
        fd.append('photo', photo)
        await api.post(`/tourists/${form.touristId}/photo`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      // 3 — Show success, reset form
      setSuccess(form.name)
      setForm(empty)
      setPhoto(null)
      setPhotoPreview(null)
      setErrors({})
      if (photoRef.current) photoRef.current.value = ''

      // Auto-dismiss success after 6s
      setTimeout(() => setSuccess(null), 6000)

    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to create tourist'
      setErrors({ submit: String(msg) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <button
            onClick={() => navigate('/admin/tourists')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter, sans-serif', fontSize: '12px', padding: 0 }}
          >
            Tourists
          </button>
          <ChevronRight size={12} color="rgba(255,255,255,0.2)" />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(0,229,204,0.7)' }}>New Tourist</span>
        </div>

        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '24px', fontWeight: '700', color: '#ffffff', marginBottom: '6px' }}>
          Register Tourist
        </h1>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.3)', marginBottom: '32px' }}>
          Fields marked <span style={{ color: '#c0392b' }}>*</span> are required
        </p>

        {/* Success banner */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -16, height: 0 }}
              animate={{ opacity: 1, y: 0,   height: 'auto' }}
              exit={{    opacity: 0, y: -16, height: 0 }}
              style={{
                background: 'rgba(0,229,204,0.08)', border: '1px solid rgba(0,229,204,0.3)',
                borderRadius: '12px', padding: '16px 18px',
                display: 'flex', alignItems: 'center', gap: '12px',
                marginBottom: '24px', overflow: 'hidden',
              }}
            >
              <CheckCircle size={20} color="#00e5cc" />
              <div>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '14px', fontWeight: '600', color: '#00e5cc', marginBottom: '2px' }}>
                  {success} registered successfully
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                  Form has been reset — ready for next registration
                </p>
              </div>
              <button onClick={() => setSuccess(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}>
                <X size={14} color="rgba(255,255,255,0.3)" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit error */}
        <AnimatePresence>
          {errors.submit && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1,  y: 0  }}
              exit={{    opacity: 0,  y: -8 }}
              style={{
                background: 'rgba(139,32,32,0.15)', border: '1px solid rgba(192,57,43,0.3)',
                borderRadius: '12px', padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: '10px',
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={16} color="#c0392b" />
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#ff6b6b' }}>{errors.submit}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {/* Photo upload */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', padding: '20px', background: '#0d1a2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px' }}>
            {/* Preview */}
            <div style={{
              width: '90px', height: '90px', flexShrink: 0,
              borderRadius: '14px', overflow: 'hidden',
              background: 'rgba(0,229,204,0.05)',
              border: `2px dashed ${photoPreview ? 'rgba(0,229,204,0.4)' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative',
            }} onClick={() => photoRef.current?.click()}>
              {photoPreview
                ? <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Camera size={24} color="rgba(255,255,255,0.2)" />
              }
            </div>

            {/* Upload controls */}
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '13px', fontWeight: '600', color: '#ffffff', marginBottom: '4px' }}>
                Profile Photo <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: '400', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>(optional)</span>
              </p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '14px', lineHeight: 1.5 }}>
                JPG, PNG up to 5MB. Used for identification on the tourist grid.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => photoRef.current?.click()}
                  style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: '500', background: 'rgba(0,229,204,0.08)', border: '1px solid rgba(0,229,204,0.2)', color: '#00e5cc', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Upload size={12} /> {photoPreview ? 'Change photo' : 'Upload photo'}
                </button>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    style={{ padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', background: 'rgba(139,32,32,0.15)', border: '1px solid rgba(139,32,32,0.25)', color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <X size={11} /> Remove
                  </button>
                )}
              </div>
              <input ref={photoRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
            </div>
          </div>

          {/* Basic info */}
          <div style={{ background: '#0d1a2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Section icon={User} title="Basic Information">
              <Field label="Tourist ID" required error={errors.touristId}>
                <Input value={form.touristId} onChange={set('touristId')} placeholder="e.g. T-003" />
              </Field>
              <Field label="Full Name" required error={errors.name}>
                <Input value={form.name} onChange={set('name')} placeholder="e.g. Rahul Sharma" />
              </Field>
              <Field label="Phone Number" required error={errors.phone}>
                <Input value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" type="tel" />
              </Field>
              <Field label="Address" error={errors.address}>
                <Input value={form.address} onChange={set('address')} placeholder="City, State" />
              </Field>
            </Section>
          </div>

          {/* Emergency contact */}
          <div style={{ background: '#0d1a2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '24px' }}>
            <Section icon={Shield} title="Emergency Contact">
              <Field label="Contact Name" required error={errors.emergencyName}>
                <Input value={form.emergencyName} onChange={set('emergencyName')} placeholder="e.g. Priya Sharma" />
              </Field>
              <Field label="Contact Phone" required error={errors.emergencyContact}>
                <Input value={form.emergencyContact} onChange={set('emergencyContact')} placeholder="919876543210  (no + sign, with country code)" type="tel" />
              </Field>
              <Field label="CallMeBot API Key">
                <Input value={form.emergencyApiKey} onChange={set('emergencyApiKey')} placeholder="7-digit key from CallMeBot  e.g. 1234567" />
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                  Contact must WhatsApp &ldquo;I allow callmebot to send me messages&rdquo; to +34 623 78 64 49 to get their key.
                  Leave blank to use the global key from server config.
                </p>
              </Field>
            </Section>
          </div>

          {/* Trek details */}
          <div style={{ background: '#0d1a2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '24px' }}>
            <Section icon={Clock} title="Trek Details">
              <Field label="Expected Return Time" required error={errors.expectedReturnTime}>
                <Input value={form.expectedReturnTime} onChange={set('expectedReturnTime')} type="datetime-local" />
              </Field>
              <Field label="Group Leader ID" required error={errors.parentId}>
                <Input value={form.parentId} onChange={set('parentId')} placeholder="Leader's tourist ID, or own ID if leader" />
              </Field>
            </Section>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '12px', lineHeight: 1.6 }}>
              If this tourist is a group leader, enter their own Tourist ID in the Group Leader ID field.
            </p>
          </div>

            {/* Age & special needs */}
          <div style={{ background: '#0d1a2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid rgba(0,229,204,0.07)' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,229,204,0.08)', border: '1px solid rgba(0,229,204,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={13} color="#00e5cc" />
              </div>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>Age & Special Needs</span>
            </div>

            {/* Age input with auto badge */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
              <div style={{ width: '160px' }}>
                <Field label="Age" error={errors.age}>
                  <Input
                    value={form.age}
                    onChange={e => {
                      const age = e.target.value
                      setForm(prev => ({
                        ...prev,
                        age,
                        child: parseInt(age) < 12,
                        elder: parseInt(age) >= 60,
                      }))
                    }}
                    placeholder="e.g. 34"
                    type="number"
                  />
                </Field>
              </div>
              {/* Auto-assigned badge */}
              {form.age && (
                <div style={{ marginBottom: '2px', display: 'flex', gap: '8px' }}>
                  {parseInt(form.age) < 12 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#d4a843', background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.25)', padding: '4px 10px', borderRadius: '20px' }}>
                      <Baby size={11} strokeWidth={2} /> Child — auto assigned
                    </span>
                  )}
                  {parseInt(form.age) >= 60 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#2979ff', background: 'rgba(41,121,255,0.1)', border: '1px solid rgba(41,121,255,0.25)', padding: '4px 10px', borderRadius: '20px' }}>
                      <PersonStanding size={11} strokeWidth={2} /> Senior — auto assigned
                    </span>
                  )}
                </div>
              )}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '10px', background: form.handicapped ? 'rgba(0,229,204,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${form.handicapped ? 'rgba(0,229,204,0.2)' : 'rgba(255,255,255,0.05)'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
              <input
                type="checkbox"
                checked={form.handicapped}
                onChange={e => setForm(prev => ({ ...prev, handicapped: e.target.checked }))}
                style={{ width: '16px', height: '16px', accentColor: '#00e5cc', cursor: 'pointer' }}
              />
              <div>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '13px', fontWeight: '600', color: form.handicapped ? '#00e5cc' : 'rgba(255,255,255,0.7)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Accessibility size={14} strokeWidth={2} /> Physically Handicapped / Special Needs
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                  Requires special assistance on the trek
                </p>
              </div>
            </label>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '12px', paddingBottom: '24px' }}>
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{  scale: loading ? 1 : 0.99 }}
              style={{
                flex: 1, padding: '14px',
                borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Outfit, sans-serif', fontSize: '14px', fontWeight: '700',
                letterSpacing: '0.5px', border: 'none',
                background: loading ? 'rgba(0,229,204,0.1)' : 'linear-gradient(135deg, #00e5cc, #00b8a4)',
                color: loading ? 'rgba(0,229,204,0.4)' : '#060d18',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(0,229,204,0.2)',
                transition: 'box-shadow 0.2s',
              }}
            >
              {loading ? 'Registering...' : 'Register Tourist'}
            </motion.button>

            <button
              type="button"
              onClick={() => navigate('/admin/tourists')}
              style={{ padding: '14px 24px', borderRadius: '12px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '14px', fontWeight: '600', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}