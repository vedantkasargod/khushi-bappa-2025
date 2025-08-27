"use client"

import { useState, useEffect, useRef } from "react"

export function useHeroScrollAnimation() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!heroRef.current) return

      const heroHeight = heroRef.current.offsetHeight
      const scrollTop = window.scrollY
      const transitionZone = heroHeight * 2
      const progress = Math.min(1, Math.max(0, scrollTop / transitionZone))

      setScrollProgress(progress)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return { scrollProgress, heroRef }
}

export function useScrollAnimation() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const containerHeight = containerRef.current.offsetHeight
      const viewportHeight = window.innerHeight

      // Calculate scroll progress within the container
      const scrollTop = Math.max(0, -rect.top)
      const scrollableHeight = containerHeight - viewportHeight
      const progress = Math.min(1, Math.max(0, scrollTop / scrollableHeight))

      setScrollProgress(progress)
    }

    window.addEventListener("scroll", handleScroll)
    handleScroll() // Initial call

    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return { scrollProgress, containerRef }
}

export function useScheduleRevealAnimation() {
  const [revealProgress, setRevealProgress] = useState(0)
  const scheduleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!scheduleRef.current) return

      const scheduleRect = scheduleRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight

      // Get the next section (Join the Celebration) to calculate transition zone
      const nextSection = scheduleRef.current.nextElementSibling as HTMLElement
      if (!nextSection) return

      const nextSectionRect = nextSection.getBoundingClientRect()

      // Calculate progress as user scrolls from schedule section towards next section
      const transitionStart = scheduleRect.bottom - viewportHeight
      const transitionEnd = nextSectionRect.top
      const transitionZone = transitionEnd - transitionStart

      const scrollPosition = -scheduleRect.top
      const progress = Math.min(1, Math.max(0, (scrollPosition - transitionStart) / transitionZone))

      setRevealProgress(progress)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return { revealProgress, scheduleRef }
}

