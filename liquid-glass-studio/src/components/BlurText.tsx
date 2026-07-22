import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'

type BlurTextProps = {
  text: string
  className?: string
}

export function BlurText({ text, className }: BlurTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, amount: 0.1 })
  const reduceMotion = useReducedMotion()

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        rowGap: '0.1em',
      }}
    >
      {text.split(' ').map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          style={{ display: 'inline-block', marginRight: '0.28em' }}
          initial={reduceMotion ? false : { filter: 'blur(10px)', opacity: 0, y: 50 }}
          animate={
            isInView || reduceMotion
              ? { filter: 'blur(0px)', opacity: 1, y: 0 }
              : { filter: 'blur(10px)', opacity: 0, y: 50 }
          }
          transition={{ duration: reduceMotion ? 0 : 0.7, delay: reduceMotion ? 0 : index * 0.1 }}
        >
          {word}
        </motion.span>
      ))}
    </div>
  )
}
