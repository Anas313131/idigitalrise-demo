import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
const LaptopScene = lazy(() => import('./LaptopScene'))
export type LaptopMotion = { scale: number; x: number; y: number; rx: number; ry: number; cameraZ: number; glow: number; invalidate?: () => void }
const initialMotion = (): LaptopMotion => ({ scale: 0.72, x: 0, y: 0, rx: 0.15, ry: -0.52, cameraZ: 8.5, glow: 0.12 })

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? null : this.props.children }
}

export default function LaptopExperience() {
  const section = useRef<HTMLElement>(null)
  const motion = useRef<LaptopMotion>(initialMotion())
  const [nearby, setNearby] = useState(false)
  const [supported, setSupported] = useState(true)
  const [ready, setReady] = useState(false)
  const [reduced, setReduced] = useState(false)
  const handleReady = useCallback(() => setReady(true), [])
  const handleError = useCallback(() => setSupported(false), [])

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener('change', update)
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    setSupported(Boolean(gl))
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNearby(true); observer.disconnect() }
    }, { rootMargin: '600px' })
    if (section.current) observer.observe(section.current)
    return () => { observer.disconnect(); query.removeEventListener('change', update) }
  }, [])

  useEffect(() => {
    if (!ready || !supported || !section.current) return
    const element = section.current
    const media = gsap.matchMedia()
    media.add({ desktop: '(min-width: 1024px)', tablet: '(min-width: 640px) and (max-width: 1023px)', mobile: '(max-width: 639px)', reduce: '(prefers-reduced-motion: reduce)' }, context => {
      const { mobile, tablet, reduce } = context.conditions!
      const target = motion.current
      const words = element.querySelectorAll('.laptop-word')
      const glow = element.querySelector('.laptop-ambient')
      if (reduce) {
        Object.assign(target, { scale: mobile ? 0.9 : 1.1, y: 0.25, rx: 0.08, ry: 0, cameraZ: mobile ? 15 : 7.2, glow: 0.3 })
        gsap.set(words, { opacity: 1, y: 0 })
        target.invalidate?.()
        return
      }
      Object.assign(target, initialMotion(), { cameraZ: mobile ? 17 : tablet ? 12 : 8.5 })
      gsap.set(words, { opacity: 0, y: 32 })
      target.invalidate?.()
      const timeline = gsap.timeline({
        onUpdate: () => target.invalidate?.(),
        scrollTrigger: { trigger: element, start: 'top top', end: () => `+=${window.innerHeight * (mobile ? 3 : 4.2)}`, pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true },
      })
      timeline.to(target, { scale: mobile ? 1.05 : 1.16, ry: -0.18, rx: 0.06, cameraZ: mobile ? 15.5 : tablet ? 11.2 : 7.4, duration: 1.8, ease: 'none' })
        .to(target, { scale: mobile ? 1.12 : 1.2, ry: 0.02, rx: 0.02, y: 0.65, cameraZ: mobile ? 14.5 : tablet ? 10.4 : 6.9, glow: 0.65, duration: 1.5, ease: 'none' })
        .to(glow, { opacity: 0.65, duration: 1 }, '<')
        .to(words, { opacity: 1, y: 0, stagger: 0.13, duration: 0.6, ease: 'power2.out' }, '-=0.35')
        .to(target, { ry: -0.04, duration: 1.2, ease: 'none' })
        .to(words, { opacity: 0, y: -18, stagger: 0.05, duration: 0.45 }, 'exit')
        .to(target, { y: 2.5, scale: 0.56, rx: -0.08, glow: 0.1, duration: 1.3, ease: 'power1.inOut' }, 'exit')
        .to(glow, { opacity: 0.1, duration: 1 }, 'exit')
    }, element)
    const refresh = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => { cancelAnimationFrame(refresh); media.revert() }
  }, [ready, supported])

  const fallback = !supported
  return (
    <section ref={section} className={`laptop-experience relative isolate w-full text-white ${fallback ? 'laptop-fallback' : ''} ${reduced ? 'laptop-reduced' : ''}`} aria-label="iDigitalRise digital experiences">
      <div className="laptop-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="laptop-ambient pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="laptop-kicker absolute left-0 right-0 text-center">Strategy. Design. Development.</div>
      <div className="laptop-stage absolute inset-0" aria-hidden="true">
        {nearby && supported && (
          <SceneBoundary onError={() => setSupported(false)}>
            <Suspense fallback={null}>
              <LaptopScene motion={motion} onReady={handleReady} onError={handleError} />
            </Suspense>
          </SceneBoundary>
        )}
      </div>
      {fallback && <img className="laptop-static" src="/images/idigitalrise-screen.webp" alt="The iDigitalRise website, featuring its orange orbital logo and digital agency services" />}
      {!ready && supported && <div className="laptop-loading absolute inset-0 flex items-center justify-center" role="status"><span>Preparing the experience<span className="laptop-loading-dot">.</span></span></div>}
      <h2 className="laptop-headline pointer-events-none absolute left-0 right-0 px-5 text-center" aria-label="We turn ideas into digital experiences.">
        <span className="laptop-word inline-block">WE TURN</span>{' '}<span className="laptop-word inline-block">IDEAS INTO</span><br />
        <span className="laptop-word inline-block laptop-highlight">DIGITAL</span>{' '}<span className="laptop-word inline-block laptop-highlight">EXPERIENCES.</span>
      </h2>
      <div className="laptop-scroll absolute bottom-7 left-0 right-0 text-center" aria-hidden="true">{fallback || reduced ? 'Built to make your business rise' : 'Scroll to explore ↓'}</div>
    </section>
  )
}
