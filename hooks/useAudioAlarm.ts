'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

type AlarmType = 'none' | 'warning' | 'alert'

export function useAudioAlarm(activeType: AlarmType) {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const oscRef = useRef<OscillatorNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // สถานะเพื่อบอกว่าเบราว์เซอร์อนุญาตให้เล่นเสียงหรือยัง
  const [isAudioEnabled, setIsAudioEnabled] = useState(false)

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      audioCtxRef.current = new AudioContextClass()
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    setIsAudioEnabled(true)
  }, [])

  const stopAudio = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (oscRef.current) {
      try { oscRef.current.stop() } catch (e) {}
      oscRef.current.disconnect()
      oscRef.current = null
    }
    if (gainRef.current) {
      gainRef.current.disconnect()
      gainRef.current = null
    }
  }, [])

  const playWarning = useCallback(() => {
    if (!audioCtxRef.current) return
    stopAudio()

    const ctx = audioCtxRef.current
    
    // เสียงเตือนสไตล์ข้อความเข้ามือถือ (Ting-Ting!)
    const playNotification = () => {
      if (ctx.state === 'suspended') ctx.resume()
      
      const playTap = (freq: number, startTime: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, startTime)
        
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02) // Attack เร็วๆ ให้เสียงเด้ง
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15) // หายไปอย่างรวดเร็ว
        
        osc.connect(gain)
        gain.connect(ctx.destination)
        
        osc.start(startTime)
        osc.stop(startTime + 0.2)
      }

      const now = ctx.currentTime
      playTap(880, now)          // โน้ตตัวแรก
      playTap(1108, now + 0.1)   // โน้ตตัวสอง (สูงขึ้นนิดนึง จังหวะติดกัน)
    }

    playNotification()
    intervalRef.current = setInterval(playNotification, 3000) // ดังซ้ำทุกๆ 3 วิ จะได้ไม่รำคาญเกินไป
  }, [stopAudio])

  const playAlert = useCallback(() => {
    if (!audioCtxRef.current) return
    stopAudio()

    const ctx = audioCtxRef.current
    
    // เสียงแบบกระดิ่งโรงพยาบาล (ติ๊ง-หน่อง) นุ่มๆ แบบผู้ดี
    const playChime = () => {
      if (ctx.state === 'suspended') ctx.resume()
      
      const playTone = (freq: number, startTime: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        
        osc.type = 'sine' // คลื่น Pure Sine นุ่มที่สุดไม่มีเสียงแทงหูเลย
        osc.frequency.setValueAtTime(freq, startTime)
        
        // ค่อยๆ ดังขึ้นนิดนึง แล้วค่อยๆ หายไป (Fade out)
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(1, startTime + 0.05) // เร่งเสียงขึ้นเกือบสุด (0.9) เพราะคลื่น Sine มันเบามาก
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.8)
        
        osc.connect(gain)
        gain.connect(ctx.destination)
        
        osc.start(startTime)
        osc.stop(startTime + 0.9)
      }
      
      const now = ctx.currentTime
      playTone(600, now)       // ติ๊ง (เสียงสูง)
      playTone(450, now + 0.4) // หน่อง (เสียงต่ำกว่านิดนึง)
    }

    playChime()
    intervalRef.current = setInterval(playChime, 2500) // ดังซ้ำทุกๆ 2.5 วินาที

  }, [stopAudio])

  // จัดการการเปลี่ยนแปลงของ activeType
  useEffect(() => {
    if (activeType === 'none') {
      stopAudio()
    } else if (activeType === 'warning') {
      if (isAudioEnabled) playWarning()
    } else if (activeType === 'alert') {
      if (isAudioEnabled) playAlert()
    }

    return () => stopAudio()
  }, [activeType, isAudioEnabled, playWarning, playAlert, stopAudio])

  // ดักฟังการคลิกครั้งแรกของหน้าเว็บเพื่อปลดล็อค AudioContext (Browser Policy)
  useEffect(() => {
    const handleFirstInteraction = () => {
      initAudio()
      window.removeEventListener('click', handleFirstInteraction)
      window.removeEventListener('keydown', handleFirstInteraction)
    }
    window.addEventListener('click', handleFirstInteraction)
    window.addEventListener('keydown', handleFirstInteraction)
    return () => {
      window.removeEventListener('click', handleFirstInteraction)
      window.removeEventListener('keydown', handleFirstInteraction)
    }
  }, [initAudio])

  return { isAudioEnabled, initAudio }
}
