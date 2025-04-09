import { useEffect, useRef } from 'react'

export function SpeedParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas to full window size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Create particles
    const particles: {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      alpha: number
      trail: number
      direction: number
    }[] = []

    const particleCount = 300

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: -Math.random() * 35 - 20, // Negative to move left (extremely fast)
        speedY: (Math.random() - 0.5) * 2, // Small vertical movement
        alpha: Math.random() * 0.8 + 0.2,
        trail: Math.random() * 30 + 15,
        direction: Math.random() > 0.1 ? -1 : 1 // Mostly left, some right
      })
    }

    // Animation loop
    const animate = () => {
      // Semi-transparent clear for trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update and draw particles
      particles.forEach((particle) => {
        // Update position
        particle.x += particle.speedX * particle.direction
        particle.y += particle.speedY

        // Reset position if off screen
        if (
          (particle.direction === -1 && particle.x < -particle.trail) ||
          (particle.direction === 1 && particle.x > canvas.width + particle.trail)
        ) {
          particle.x = particle.direction === -1 ? canvas.width + particle.trail : -particle.trail
          particle.y = Math.random() * canvas.height
        }

        // Draw particle with trail
        ctx.beginPath()
        ctx.moveTo(particle.x, particle.y)
        ctx.lineTo(particle.x + particle.trail * particle.direction, particle.y)
        ctx.lineWidth = particle.size
        ctx.strokeStyle = `rgba(255, 255, 255, ${particle.alpha})`
        ctx.stroke()
      })

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 -z-10" />
}
