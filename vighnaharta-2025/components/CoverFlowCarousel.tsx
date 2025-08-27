"use client"

import { useState, useRef } from "react"

export function CoverFlowCarousel({ organizers }: { organizers: any[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [selectedOrganizer, setSelectedOrganizer] = useState<any>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartX(e.clientX)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const diff = e.clientX - startX
    setDragOffset(diff)
  }

  const handleMouseUp = () => {
    if (!isDragging) return
    setIsDragging(false)

    if (Math.abs(dragOffset) > 50) {
      if (dragOffset > 0) {
        goToPrevious()
      } else {
        goToNext()
      }
    }
    setDragOffset(0)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setStartX(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const diff = e.touches[0].clientX - startX
    setDragOffset(diff)
  }

  const handleTouchEnd = () => {
    if (!isDragging) return
    setIsDragging(false)

    if (Math.abs(dragOffset) > 50) {
      if (dragOffset > 0) {
        goToPrevious()
      } else {
        goToNext()
      }
    }
    setDragOffset(0)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % organizers.length)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + organizers.length) % organizers.length)
  }

  const getItemStyle = (index: number) => {
    const diff = index - currentIndex
    const adjustedDiff = diff + dragOffset / 100

    let scale = 1
    let opacity = 1
    let rotateY = 0
    let translateX = 0
    let translateZ = 0

    if (Math.abs(adjustedDiff) === 0) {
      // Center item
      scale = 1
      opacity = 1
      rotateY = 0
      translateZ = 0
    } else if (Math.abs(adjustedDiff) === 1) {
      // Adjacent items
      scale = 0.7
      opacity = 0.6
      rotateY = adjustedDiff > 0 ? -25 : 25
      translateX = adjustedDiff * 120
      translateZ = -100
    } else {
      // Far items
      scale = 0.5
      opacity = 0.3
      rotateY = adjustedDiff > 0 ? -45 : 45
      translateX = adjustedDiff * 150
      translateZ = -200
    }

    return {
      transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
      opacity,
      zIndex: Math.abs(adjustedDiff) === 0 ? 10 : 10 - Math.abs(adjustedDiff),
    }
  }

  return (
    <>
      <div className="relative max-w-6xl mx-auto">
        {/* Navigation Arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all duration-300 flex items-center justify-center"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all duration-300 flex items-center justify-center"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* 3D Carousel Container */}
        <div
          ref={carouselRef}
          className="relative h-96 overflow-hidden cursor-grab active:cursor-grabbing"
          style={{ perspective: "1000px" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {organizers.map((organizer, index) => (
              <div
                key={index}
                className="absolute transition-all duration-500 ease-out cursor-pointer"
                style={getItemStyle(index)}
                onClick={() => setSelectedOrganizer(organizer)}
              >
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-primary shadow-2xl">
                    <img
                      src={organizer.image || "/placeholder.svg?height=128&width=128&query=festival organizer portrait"}
                      alt={organizer.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-xl font-serif font-bold text-white mb-2">{organizer.name}</h3>
                  <p className="text-secondary text-lg">{organizer.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center mt-8 space-x-2">
          {organizers.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex ? "bg-primary scale-125" : "bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Modal */}
      {selectedOrganizer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-300">
            <button
              onClick={() => setSelectedOrganizer(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden border-4 border-primary">
                <img
                  src={
                    selectedOrganizer.image || "/placeholder.svg?height=128&width=128&query=festival organizer portrait"
                  }
                  alt={selectedOrganizer.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <h3 className="text-2xl font-serif font-bold text-gray-900 mb-2">{selectedOrganizer.name}</h3>
              <p className="text-primary text-lg font-medium mb-4">{selectedOrganizer.role}</p>
              <p className="text-gray-600 mb-6">{selectedOrganizer.bio}</p>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">Send a Secret Message</h4>
                <textarea
                  placeholder="Write your message here..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

