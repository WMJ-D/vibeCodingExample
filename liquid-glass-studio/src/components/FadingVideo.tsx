import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'

type FadingVideoProps = {
  src: string | string[]
  className?: string
  style?: CSSProperties
}

export function FadingVideo({ src, className, style }: FadingVideoProps) {
  const sources = useMemo(() => (Array.isArray(src) ? src : [src]), [src])
  const [sourceIndex, setSourceIndex] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<number | null>(null)

  const setVisible = (visible: boolean) => {
    const video = videoRef.current
    if (!video) return

    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      video.style.opacity = visible ? '1' : '0'
    })
  }

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const handleEnded = () => {
    const video = videoRef.current
    if (!video) return

    if (sources.length === 1) {
      video.currentTime = 0
      void video.play()
      setVisible(true)
      return
    }

    setSourceIndex((current) => (current + 1) % sources.length)
  }

  return (
    <video
      ref={videoRef}
      key={sources[sourceIndex]}
      src={sources[sourceIndex]}
      className={className}
      style={{
        ...style,
        opacity: 0,
        transition: 'opacity 500ms ease',
      }}
      autoPlay
      muted
      playsInline
      preload="auto"
      onLoadedData={() => setVisible(true)}
      onTimeUpdate={(event) => {
        const video = event.currentTarget
        if (video.duration - video.currentTime <= 0.55) setVisible(false)
      }}
      onEnded={handleEnded}
    />
  )
}
