"use client"

import { useState, useEffect, useRef } from "react"

// TimelineItem Component
function TimelineItem({
  day,
  title,
  onClick,
  index,
  isActive,
}: { day: number; title: string; onClick: () => void; index: number; isActive: boolean }) {
  const [isVisible, setIsVisible] = useState(false)
  const itemRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), index * 200) // Staggered animation delay
        }
      },
      { threshold: 0.3 },
    )

    if (itemRef.current) {
      observer.observe(itemRef.current)
    }

    return () => observer.disconnect()
  }, [index])

  return (
    <div ref={itemRef} className="relative flex items-center mb-6 md:mb-8">
      {/* Timeline line and leaf marker */}
      <div className="flex-shrink-0 relative z-10">
        <div
          className="w-16 h-16 md:w-20 md:h-20 cursor-pointer transition-all duration-500 hover:scale-110 hover:drop-shadow-xl"
          onClick={onClick}
        >
          <img
            src="/peepal-leaf.png"
            alt="Peepal Leaf"
            className="w-full h-full object-contain filter drop-shadow-lg rotate-90"
          />
        </div>
      </div>

      {/* Content */}
      <div
        className={`ml-6 md:ml-8 flex-1 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
        }`}
      >
        <div
          className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-300 cursor-pointer hover:bg-white/90 hover:scale-105 transition-all duration-300"
          onClick={onClick}
        >
          <h3 className="text-black font-serif font-extrabold text-xl md:text-2xl mb-2">{title}</h3>
          <p className="text-black/80 text-sm">Click to view details</p>
        </div>
      </div>
    </div>
  )
}

// Timeline Component
export function Timeline({ festivalDays, onDayClick }: { festivalDays: any[]; onDayClick: (day: any) => void }) {
  const [lineHeight, setLineHeight] = useState(0)
  const [activeIndex, setActiveIndex] = useState(-1)
  const timelineRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!timelineRef.current || !lineRef.current) return

      const timelineRect = timelineRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const timelineTop = timelineRect.top
      const timelineHeight = timelineRect.height

      // Calculate how much of the timeline is visible
      const visibleTop = Math.max(0, -timelineTop)
      const visibleBottom = Math.min(timelineHeight, viewportHeight - timelineTop)
      const visibleHeight = Math.max(0, visibleBottom - visibleTop)

      // Calculate line animation progress
      const progress = Math.min(1, Math.max(0, visibleHeight / (timelineHeight * 0.8)))
      setLineHeight(progress * 100)

      // Determine active item based on scroll position
      const itemHeight = timelineHeight / festivalDays.length
      const scrollProgress = visibleTop / timelineHeight
      const currentIndex = Math.floor(scrollProgress * festivalDays.length)
      setActiveIndex(Math.min(currentIndex, festivalDays.length - 1))
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll() // Initial call

    return () => window.removeEventListener("scroll", handleScroll)
  }, [festivalDays.length])

  return (
    <div ref={timelineRef} className="relative max-w-4xl mx-auto">
      {/* Animated vertical line */}
      <div className="absolute left-4 md:left-6 top-0 w-1 bg-white/20 h-full">
        <div
          ref={lineRef}
          className="w-full bg-gradient-to-b from-orange-400 to-orange-600 transition-all duration-300 ease-out"
          style={{ height: `${lineHeight}%` }}
        />
      </div>

      {/* Timeline items */}
      <div className="pl-8 md:pl-10">
        {festivalDays.map((day, index) => (
          <TimelineItem
            key={day.day}
            day={day.day}
            title={day.content}
            onClick={() => onDayClick(day)}
            index={index}
            isActive={activeIndex === index}
          />
        ))}
      </div>
    </div>
  )
}
