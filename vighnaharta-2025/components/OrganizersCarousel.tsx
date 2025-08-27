"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

export function OrganizersCarousel({ organizers, isAdmin = false }: { organizers: any[]; isAdmin?: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [selectedOrganizer, setSelectedOrganizer] = useState<any>(null)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null)
  const autoPlayInterval = useRef<NodeJS.Timeout | null>(null)

  // Auto-play functionality
  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayInterval.current = setInterval(() => {
        goToNext();
      }, 3000);
    }

    return () => {
      if (autoPlayInterval.current) {
        clearInterval(autoPlayInterval.current);
      }
    };
  }, [isAutoPlaying, currentIndex, organizers.length]);

  const sendMessage = async () => {
    if (!message.trim() || !selectedOrganizer) return;
    
    setIsSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: message,
          organizer: selectedOrganizer.name,
          organizerRole: selectedOrganizer.role,
        }),
      });
      
      if (response.ok) {
        setMessageSent(true);
        setMessage("");
        // Reset success message after 3 seconds
        setTimeout(() => {
          setMessageSent(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartX(e.clientX)
    // Pause auto-play on user interaction
    setIsAutoPlaying(false)
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
    // Resume auto-play after user interaction
    setTimeout(() => setIsAutoPlaying(true), 3000)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setStartX(e.touches[0].clientX)
    // Pause auto-play on user interaction
    setIsAutoPlaying(false)
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
    // Resume auto-play after user interaction
    setTimeout(() => setIsAutoPlaying(true), 3000)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % organizers.length)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + organizers.length) % organizers.length)
  }

  const handleDotClick = (index: number) => {
    setCurrentIndex(index)
    // Pause auto-play on user interaction
    setIsAutoPlaying(false)
    // Resume auto-play after user interaction
    setTimeout(() => setIsAutoPlaying(true), 3000)
  }

  // Get visible items for better performance
  const getVisibleItems = () => {
    const visibleItems = []
    const totalItems = organizers.length
    
    // Show the current item and a few adjacent items
    for (let i = -1; i <= 1; i++) {
      const index = (currentIndex + i + totalItems) % totalItems
      visibleItems.push({ index, organizer: organizers[index] })
    }
    
    return visibleItems
  }

  return (
    <>
      <div className="relative max-w-6xl mx-auto">
        {/* Navigation Arrows */}
        <button
          onClick={() => {
            goToPrevious()
            // Pause auto-play on user interaction
            setIsAutoPlaying(false)
            // Resume auto-play after user interaction
            setTimeout(() => setIsAutoPlaying(true), 3000)
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-300 flex items-center justify-center shadow-lg hover:scale-110"
          aria-label="Previous organizer"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={() => {
            goToNext()
            // Pause auto-play on user interaction
            setIsAutoPlaying(false)
            // Resume auto-play after user interaction
            setTimeout(() => setIsAutoPlaying(true), 3000)
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-300 flex items-center justify-center shadow-lg hover:scale-110"
          aria-label="Next organizer"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Carousel Container */}
        <div
          ref={carouselRef}
          className="relative h-96 overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence mode="popLayout">
              {getVisibleItems().map(({ index, organizer }) => (
                <motion.div
                  key={`${index}-${currentIndex}`}
                  className="absolute flex flex-col items-center justify-center"
                  initial={{ opacity: 0, x: index > currentIndex ? 200 : -200 }}
                  animate={{ 
                    opacity: 1, 
                    x: (index - currentIndex) * 200,
                    scale: index === currentIndex ? 1 : 0.8,
                    zIndex: index === currentIndex ? 10 : 1
                  }}
                  exit={{ opacity: 0, x: index > currentIndex ? 200 : -200 }}
                  transition={{ duration: 0.5 }}
                  style={{
                    left: "50%",
                    transform: "translateX(-50%)",
                  }}
                >
                  <div
                    className={`relative group cursor-pointer transition-all duration-300 ${
                      index === currentIndex ? "scale-100" : "scale-90 opacity-70"
                    }`}
                    onClick={() => {
                      setSelectedOrganizer(organizer)
                      // Pause auto-play when modal is opened
                      setIsAutoPlaying(false)
                    }}
                  >
                    <div className="w-48 h-48 mx-auto mb-6 rounded-2xl overflow-hidden border-4 border-white shadow-2xl transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-primary/30">
                      <img
                        src={organizer.image || "/placeholder-user.jpg"}
                        alt={organizer.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/placeholder-user.jpg";
                        }}
                      />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <h3 className="text-2xl font-serif font-bold text-white mb-1 text-center">{organizer.name}</h3>
                    <p className="text-primary text-lg text-center">{organizer.role}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center mt-12 space-x-3">
          {organizers.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`w-4 h-4 rounded-full transition-all duration-500 ${
                index === currentIndex
                  ? "bg-primary scale-125 shadow-lg shadow-primary/50"
                  : "bg-white/30 hover:bg-white/50"
              }`}
              aria-label={`Go to organizer ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedOrganizer && (
          <motion.div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-gradient-to-br from-white to-gray-100 rounded-2xl max-w-md w-full p-6 relative shadow-2xl"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <button
                onClick={() => setSelectedOrganizer(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-6 rounded-2xl overflow-hidden border-4 border-primary shadow-xl">
                  <img
                    src={selectedOrganizer.image || "/placeholder-user.jpg"}
                    alt={selectedOrganizer.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder-user.jpg";
                    }}
                  />
                </div>

                <h3 className="text-3xl font-serif font-bold text-gray-900 mb-2">{selectedOrganizer.name}</h3>
                <p className="text-primary text-xl font-medium mb-6">{selectedOrganizer.role}</p>
                <div className="bg-white/80 rounded-xl p-4 mb-6">
                  <p className="text-gray-700 italic">{selectedOrganizer.bio}</p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">Send a Secret Message</h4>
                  {messageSent ? (
                    <div className="p-4 bg-green-100 text-green-800 rounded-xl text-center">
                      Message sent successfully!
                    </div>
                  ) : (
                    <>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Write your message here..."
                        className="w-full p-4 border border-gray-300 rounded-xl resize-none h-24 focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                        disabled={isSending}
                      />
                      <button
                        onClick={sendMessage}
                        className="w-full bg-gradient-to-r from-primary to-orange-500 text-white py-3 rounded-xl font-medium hover:from-primary/90 hover:to-orange-600 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
                        disabled={isSending || !message.trim()}
                      >
                        {isSending ? "Sending..." : "Send Message"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}