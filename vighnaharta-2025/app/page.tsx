"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback, memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ChevronDown, Camera, Upload, ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react"
import { Timeline } from "@/components/Timeline"
import { CoverFlowCarousel } from "@/components/CoverFlowCarousel"
import { OrganizersCarousel } from "@/components/OrganizersCarousel"
import { useScrollAnimation, useHeroScrollAnimation, useScheduleRevealAnimation } from "@/hooks/useScrollAnimations"
import { festivalDays, organizers } from "@/data/festivalData"
import { cn } from "@/lib/utils"
import NextImage from "next/image"

// Helper component for image loading with retry
const ParticipantImage: React.FC<{ src: string; alt: string }> = memo(({ src, alt }) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 1000; // 1 second

  useEffect(() => {
    // Only reset loading state if src actually changes
    if (src !== currentSrc) {
      setCurrentSrc(src);
      setIsLoading(true);
      setHasError(false);
      retryCountRef.current = 0;
      console.log(`ParticipantImage: Received new src: ${src ? src.substring(0, 50) + '...' : 'empty'}`);
    }
  }, [src, currentSrc]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    console.log(`ParticipantImage: Image loaded successfully for src: ${src ? src.substring(0, 50) + '...' : 'empty'}`);
  };

  const handleError = () => {
    if (retryCountRef.current < MAX_RETRIES) {
      retryCountRef.current++;
      setTimeout(() => {
        setCurrentSrc(`${src}?retry=${retryCountRef.current}`); // Append query param to force reload
      }, RETRY_DELAY);
      console.warn(`ParticipantImage: Failed to load image. Retrying ${retryCountRef.current}/${MAX_RETRIES} for src: ${src ? src.substring(0, 50) + '...' : 'empty'}`);
    } else {
      setIsLoading(false);
      setHasError(true);
      console.error(`ParticipantImage: Failed to load image after ${MAX_RETRIES} retries for src: ${src ? src.substring(0, 50) + '...' : 'empty'}`);
    }
  };

  return (
    <div className="w-full h-full"> {/* Adjusted container for full image display */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse rounded-lg">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 animate-spin" />
        </div>
      )}
      {hasError && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-red-500 rounded-lg">
          <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 mr-1 sm:mr-2" />
          <span className="text-xs sm:text-sm">Error</span>
        </div>
      )}
      {!hasError && (
        <img
          src={currentSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full object-cover rounded-lg transition-opacity duration-300", // Ensure image fills and covers
            isLoading ? "opacity-0" : "opacity-100"
          )}
        />
      )}
    </div>
  );
}, (prevProps: { src: string; alt: string }, nextProps: { src: string; alt: string }) => {
  // Only re-render if src or alt props change
  return prevProps.src === nextProps.src && prevProps.alt === nextProps.alt;
});

export default function VighnahartraPage() {
  const [selectedDay, setSelectedDay] = useState<{ day: number; content: string; details: string | string[] } | null>(null)
  const [currentStep, setCurrentStep] = useState<"initial" | "webcam" | "form" | "generated">("initial")
  const [showWebcam, setShowWebcam] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<string>("")
  const [formData, setFormData] = useState({ name: "", flatNumber: "" })
  const [generatedPass, setGeneratedPass] = useState<string>("")
  const [isGeneratingPass, setIsGeneratingPass] = useState(false)
  const [participants, setParticipants] = useState<Array<{ name: string; flatNumber: string; imageUrl: string; id: string; isApproved: boolean }>>([])
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [webcamError, setWebcamError] = useState<string>("")
  const [isMobile, setIsMobile] = useState(false)
  const [currentPage, setCurrentPage] = useState(0) // New state for current page
  const [isAdmin, setIsAdmin] = useState(false); // New state for admin mode
  const [showPasswordDialog, setShowPasswordDialog] = useState(false); // State for password dialog
  const [password, setPassword] = useState(""); // State for password input
  const [passwordError, setPasswordError] = useState(""); // State for password error message
  const [messages, setMessages] = useState<Array<{ id: string; text: string; organizer: string; organizerRole: string; timestamp: string }>>([]); // State for secret messages
  const [messagePages, setMessagePages] = useState<Record<string, number>>({}); // State for message pagination

  const PARTICIPANTS_PER_PAGE = 10 // New constant for participants per page
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Fetch participants on component mount and periodically
  useEffect(() => {
    const loadParticipants = async () => {
      try {
        const response = await fetch("/api/participants");
        if (response.ok) {
          const data = await response.json();
          // Only update state if data has actually changed to prevent unnecessary re-renders
          setParticipants(prevParticipants => {
            // Compare the current participants with the new data
            if (JSON.stringify(prevParticipants) !== JSON.stringify(data)) {
              return data;
            }
            return prevParticipants;
          });
        } else {
          console.error("Error fetching participants:", response.statusText);
          setParticipants([]);
        }
      } catch (error) {
        console.error("Failed to load participants:", error);
        setParticipants([]);
      }
    };

    loadParticipants();

    // Set up polling to refresh participant data from the server periodically
    const pollingInterval = setInterval(loadParticipants, 10000); // Poll every 10 seconds instead of 5
    return () => clearInterval(pollingInterval);
  }, []); // Empty dependency array means this runs once on mount and sets up the interval

  // Fetch messages when in admin mode
  useEffect(() => {
    if (isAdmin) {
      const loadMessages = async () => {
        try {
          const response = await fetch("/api/messages");
          if (response.ok) {
            const data = await response.json();
            setMessages(data);
          } else {
            console.error("Error fetching messages:", response.statusText);
            setMessages([]);
          }
        } catch (error) {
          console.error("Failed to load messages:", error);
          setMessages([]);
        }
      };

      loadMessages();

      // Set up polling to refresh messages from the server periodically
      const pollingInterval = setInterval(loadMessages, 10000); // Poll every 10 seconds
      return () => clearInterval(pollingInterval);
    }
  }, [isAdmin]);

  // Remove the useEffect that saves to localStorage as data is now server-side
  // useEffect(() => {
  //   localStorage.setItem("vighnaharta_participants", JSON.stringify(participants));
  // }, [participants]);

  const { scrollProgress, containerRef } = useScrollAnimation()
  const { scrollProgress: heroScrollProgress, heroRef } = useHeroScrollAnimation()
  const { revealProgress, scheduleRef } = useScheduleRevealAnimation()

  // Enhanced mobile detection with viewport width check
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth <= 768
      const isVerySmallScreen = window.innerWidth <= 480
      
      return isMobileDevice || isTouchDevice || isSmallScreen || isVerySmallScreen
    }

    setIsMobile(checkIfMobile())

    // Listen for window resize to update mobile detection
    const handleResize = () => {
      setIsMobile(checkIfMobile())
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Clean up function for stopping webcam stream
  const stopWebcamStream = () => {
    console.log("Stopping webcam stream")
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log("Stopping track:", track.kind)
        track.stop()
      })
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsVideoReady(false)
    setWebcamError("")
  }

  // Handle video element events
  const handleVideoLoadedMetadata = () => {
    console.log("Video metadata loaded")
    if (videoRef.current) {
      console.log("Video dimensions:", videoRef.current.videoWidth, "x", videoRef.current.videoHeight)
    }
    setIsVideoReady(true)
    setWebcamError("")
  }

  const handleVideoError = (error: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error("Video error:", error)
    setWebcamError("Video playback error")
    setIsVideoReady(false)
  }

  // Handle video play event for mobile
  const handleVideoPlay = () => {
    console.log("Video started playing")
    setIsVideoReady(true)
  }

  // Check browser compatibility
  const checkBrowserSupport = () => {
    // Check for getUserMedia support with various prefixes
    const getUserMedia = (navigator as any).mediaDevices?.getUserMedia ||
                        (navigator as Navigator).getUserMedia ||
                        (navigator as Navigator).webkitGetUserMedia ||
                        (navigator as Navigator).mozGetUserMedia

    const isSecureContext = window.isSecureContext || 
                           location.protocol === 'https:' || 
                           location.hostname === 'localhost' ||
                           location.hostname === '127.0.0.1'

    console.log("Browser support check:", {
      mediaDevices: !!navigator.mediaDevices,
      getUserMedia: !!getUserMedia,
      isSecureContext,
      protocol: location.protocol,
      hostname: location.hostname,
      userAgent: navigator.userAgent
    })

    return {
      hasGetUserMedia: !!getUserMedia,
      isSecureContext,
      getUserMedia
    }
  }

  // Setup webcam stream with better mobile support
  const setupWebcamStream = async () => {
    console.log("setupWebcamStream called")
    console.log("videoRef.current:", !!videoRef.current)
    
    if (!videoRef.current) {
      console.error("Video element not available")
      setWebcamError("Video element not ready. Please try again.")
      return
    }

    const browserSupport = checkBrowserSupport()
    
    if (!browserSupport.hasGetUserMedia) {
      setWebcamError("Your browser doesn't support camera access. Please use a modern browser like Chrome, Firefox, or Safari.")
      return
    }

    if (!browserSupport.isSecureContext) {
      setWebcamError("Camera access requires a secure connection (HTTPS). Please access this site over HTTPS.")
      return
    }

    try {
      setWebcamError("")
      setIsVideoReady(false)
      
      console.log("Requesting webcam access...")
      
      let stream
      
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Modern API with mobile-optimized constraints
        console.log("Using modern getUserMedia API")
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: isMobile ? 640 : 1280, max: isMobile ? 1024 : 1920 },
            height: { ideal: isMobile ? 480 : 720, max: isMobile ? 768 : 1080 },
            facingMode: 'user',
            frameRate: { ideal: isMobile ? 24 : 30, max: isMobile ? 30 : 60 }
          },
          audio: false
        })
      } else {
        // Fallback for older browsers
        console.log("Using legacy getUserMedia API")
        const getUserMedia = browserSupport.getUserMedia
        
        stream = await new Promise<MediaStream>((resolve, reject) => {
          getUserMedia.call(navigator, {
        video: { 
          width: { ideal: isMobile ? 480 : 640 },
          height: { ideal: isMobile ? 360 : 480 },
          facingMode: 'user'
        },
        audio: false
          }, resolve, reject)
      })
      }
      
      console.log("Webcam stream acquired:", stream)
      console.log("Stream tracks:", stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })))
      
      streamRef.current = stream
        videoRef.current.srcObject = stream
      
      // Play the video - mobile requires user interaction
      try {
        // Set video properties for mobile compatibility
        const video = videoRef.current
        video.setAttribute('playsinline', 'true')
        video.setAttribute('webkit-playsinline', 'true')
        video.muted = true
        
        const playPromise = video.play()
        if (playPromise !== undefined) {
          await playPromise
          console.log("Video playing successfully")
        }
      } catch (playError) {
        console.error("Error playing video:", playError)
        // On mobile, video might not autoplay but stream is still valid
        console.log("Video autoplay failed, but stream should be available")
        setIsVideoReady(true) // Set ready even if autoplay fails
      }

    } catch (error) {
      console.error("Error accessing webcam:", error)
      let errorMessage = "Unable to access camera."
      
      if (error instanceof Error) {
        console.log("Error name:", error.name)
        console.log("Error message:", error.message)
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = "Camera permission denied. Please allow camera access and try again."
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = "No camera found. Please make sure your device has a camera."
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = "Camera is already in use by another application."
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
          errorMessage = "Camera doesn't meet the requirements."
        } else if (error.message === 'getUserMedia not supported') {
          errorMessage = "Your browser doesn't support camera access."
        } else {
          errorMessage = `Camera error: ${error.message}`
        }
      }
      
      setWebcamError(errorMessage)
      setIsVideoReady(false)
    }
  }

  // Effect to handle webcam setup when dialog opens
  useEffect(() => {
    if (showWebcam) {
      // Use setTimeout to ensure the dialog and video element are fully rendered
      const timer = setTimeout(() => {
        if (videoRef.current) {
          console.log("Setting up webcam stream after dialog render")
          setupWebcamStream()
        } else {
          console.error("Video element not found after dialog render")
          }
        }, 100)
      
      return () => clearTimeout(timer)
    } else if (!showWebcam && streamRef.current) {
      // Only stop stream when dialog is closed
      console.log("Dialog closed, stopping stream")
      stopWebcamStream()
    }
  }, [showWebcam])

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopWebcamStream()
    }
  }, [])

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // On mobile, allow form submission without photo
    if (formData.name && formData.flatNumber && (capturedPhoto || isMobile)) {
      generatePass()
    }
  }

  const closeWebcam = () => {
    console.log("Closing webcam dialog")
    stopWebcamStream()
    setShowWebcam(false)
    setCurrentStep("initial")
  }

  const startWebcam = () => {
    if (isMobile) {
      // Skip webcam on mobile, go directly to form
      setCurrentStep("form")
      setShowForm(true)
      return
    }
    
    console.log("Starting webcam")
    setWebcamError("") // Clear any previous errors
    setCapturedPhoto("") // Clear any previous photo
    setCurrentStep("webcam")
    setShowWebcam(true)
  }

  const capturePhoto = () => {
    console.log("Attempting to capture photo")
    
    if (!videoRef.current || !canvasRef.current || !isVideoReady) {
      console.error("Video not ready for capture:", {
        videoRef: !!videoRef.current,
        canvasRef: !!canvasRef.current,
        isVideoReady
      })
      setWebcamError("Video not ready. Please wait a moment and try again.")
      return
    }

      const video = videoRef.current
    const canvas = canvasRef.current

    // Check if video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error("Video dimensions are invalid:", {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      })
      setWebcamError("Video not properly loaded. Please try again.")
      return
    }

    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      console.log("Capturing with dimensions:", {
        width: canvas.width,
        height: canvas.height
      })

      const context = canvas.getContext("2d")
      if (!context) {
        console.error("Could not get canvas context")
        setWebcamError("Canvas error. Please try again.")
        return
      }

      // Draw the current video frame to canvas (flip horizontally for natural selfie)
      context.save()
      context.scale(-1, 1) // Flip horizontally
      context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
      context.restore()
      
      // Convert to data URL
      const photoDataUrl = canvas.toDataURL("image/png", 0.9)
      
      if (photoDataUrl.length < 100) { // Basic check for valid image data
        console.error("Invalid photo data captured")
        setWebcamError("Failed to capture photo. Please try again.")
        return
      }

      console.log("Photo captured successfully")
      setCapturedPhoto(photoDataUrl)

      // Close webcam and proceed to form
      closeWebcam()
        setCurrentStep("form")
        
      // Show form after short delay
        setTimeout(() => {
          setShowForm(true)
        }, 300)

    } catch (error) {
      console.error("Error capturing photo:", error)
      setWebcamError("Failed to capture photo. Please try again.")
      }
    }

  // Retry webcam setup
  const retryWebcam = () => {
    setWebcamError("")
    setupWebcamStream()
  }


  const generatePass = async () => {
    if (!formData.name || !formData.flatNumber) return

    setIsGeneratingPass(true)
    setCurrentStep("generated")

    setTimeout(async () => { // Made the callback async
      // Create a canvas to generate the pass with mobile-responsive dimensions
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      if (ctx) {
    // Responsive canvas dimensions
    const canvasWidth = isMobile ? 600 : 800
    const canvasHeight = isMobile ? 750 : 1000
    
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the entire canvas once at the beginning
    
    // Define image loading as promises
    const loadImage = (src: string) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
    })
    }
   
    try {
    const images = capturedPhoto ? [loadImage(capturedPhoto)] : [];
    const [photoImg] = await Promise.all(images);
    console.log("Images loaded successfully: ", { photoImg }) // Debugging
    
    // Draw a dark background for the entire canvas to simulate depth and stand out
    ctx.fillStyle = "#222"; // Dark background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Define outer polaroid frame (white) - responsive sizing
    const frameMargin = isMobile ? 30 : 50;
    const polaroidFrame = { x: frameMargin, y: frameMargin, width: canvas.width - (frameMargin * 2), height: canvas.height - (frameMargin * 2) };
    ctx.fillStyle = "white";
    ctx.fillRect(polaroidFrame.x, polaroidFrame.y, polaroidFrame.width, polaroidFrame.height);
    
    // Define the photo area (black rectangle, slightly inset from the polaroid frame) - responsive sizing
    const photoMargin = isMobile ? 20 : 30;
    const bottomSpace = isMobile ? 180 : 250;
    const photoArea = { x: polaroidFrame.x + photoMargin, y: polaroidFrame.y + photoMargin, width: polaroidFrame.width - (photoMargin * 2), height: polaroidFrame.height - bottomSpace }; // Larger bottom border
    ctx.fillStyle = "black";
    ctx.fillRect(photoArea.x, photoArea.y, photoArea.width, photoArea.height);
    
    if (photoImg) {
      // Calculate dimensions to fit photo in the black area (maintaining aspect ratio)
      const aspectRatio = photoImg.width / photoImg.height

      let drawWidth = photoArea.width
      let drawHeight = photoArea.width / aspectRatio

      if (drawHeight > photoArea.height) {
        drawHeight = photoArea.height
        drawWidth = photoArea.height * aspectRatio
      }

      const drawX = photoArea.x + (photoArea.width - drawWidth) / 2
      const drawY = photoArea.y + (photoArea.height - drawHeight) / 2
      console.log("Drawing photo with dimensions (final):", drawX, drawY, drawWidth, drawHeight) // Debugging

      // Draw the photo, clipped to the photo area
      ctx.save(); // Save the current state of the canvas
      ctx.beginPath(); // Start a new path
      ctx.rect(photoArea.x, photoArea.y, photoArea.width, photoArea.height); // Define clipping rectangle
      ctx.clip(); // Apply clipping
      ctx.drawImage(photoImg, drawX, drawY, drawWidth, drawHeight)
      ctx.restore(); // Restore the canvas state (remove clipping)
    }
   
            // Add a thin border around the photo to distinguish it from a white background
            ctx.strokeStyle = "rgba(0, 0, 0, 0.1)" // Light gray border
            ctx.lineWidth = 4 // 4px wide border
            ctx.strokeRect(photoArea.x, photoArea.y, photoArea.width, photoArea.height)

            // Add text on the white border (below the photo) - responsive font sizes
            const nameFontSize = isMobile ? 28 : 42;
            const detailsFontSize = isMobile ? 18 : 30;
            const lineSpacing = isMobile ? 40 : 55;
            
            ctx.fillStyle = "#333" // Darker text color
            ctx.font = `bold ${nameFontSize}px 'Permanent Marker', cursive`; // Responsive font size
            ctx.textAlign = "center";
            ctx.shadowColor = "rgba(0, 0, 0, 0.2)"; // Softer shadow
            ctx.shadowBlur = 3;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.fillText(formData.name, canvas.width / 2, photoArea.y + photoArea.height + (lineSpacing + 15)); // Adjusted Y position

            ctx.font = `${detailsFontSize}px 'Permanent Marker', cursive`; // Responsive font size
            ctx.shadowColor = "rgba(0, 0, 0, 0.1)"; // Even lighter shadow
            ctx.shadowBlur = 2;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.fillText(`Flat ${formData.flatNumber}`, canvas.width / 2, photoArea.y + photoArea.height + (lineSpacing * 2)); // Adjusted Y position
            ctx.fillText("Vighnaharta 2025", canvas.width / 2, photoArea.y + photoArea.height + (lineSpacing * 3)); // Adjusted Y position

            // Add a subtle rotation to the entire canvas for a more "placed" look (reduced on mobile)
            const rotationAngle = (Math.random() * (isMobile ? 3 : 6) - (isMobile ? 1.5 : 3)) * Math.PI / 180; // Reduced rotation on mobile
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(rotationAngle);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
            
            const passDataUrl = canvas.toDataURL("image/png")
            setGeneratedPass(passDataUrl)
            setIsGeneratingPass(false)

    } catch (error) {
    console.error("Error loading images for pass generation:", error)
    setIsGeneratingPass(false)
    alert("Failed to generate pass. Please try again.")
        }
      }
    }, 2000)
  }

  const downloadPass = async () => {
    if (generatedPass) {
      const normalizedName = formData.name.toLowerCase();
      const normalizedFlatNumber = formData.flatNumber.toLowerCase();

      const existingParticipant = participants.find(
        (p) => p.name.toLowerCase() === normalizedName && p.flatNumber.toLowerCase() === normalizedFlatNumber
      );

      const filename = `${normalizedName.replace(/\s+/g, "-")}-${normalizedFlatNumber.replace(/\s+/g, "-")}-vighnaharta-pass-${Date.now()}.png`;

      try {
        const url = existingParticipant ? "/api/save-pass" : "/api/save-pass";
        const method = existingParticipant ? "PUT" : "POST";

        const bodyData: any = {
          imageData: generatedPass,
          filename: filename,
          name: formData.name,
          flatNumber: formData.flatNumber,
        };

        if (existingParticipant) {
          bodyData.id = existingParticipant.id;
        }

        const response = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyData),
        });

        if (!response.ok) {
          throw new Error(`Failed to save/update pass on server: ${response.statusText}`);
        }

        const result = await response.json();
        console.log("Server response:", result);

        // 2. Client-side download
      const link = document.createElement("a")
        link.download = filename;
      link.href = generatedPass
      link.click()

        // Update local state with the new/updated participant
        if (existingParticipant) {
          setParticipants((prevParticipants) =>
            prevParticipants.map((p) =>
              p.id === existingParticipant.id
                ? { ...p, imageUrl: result.participant.imageUrl, name: formData.name, flatNumber: formData.flatNumber }
                : p
            )
          );
        } else {
          const newParticipant = {
            id: crypto.randomUUID(),
            name: formData.name,
            flatNumber: formData.flatNumber,
            imageUrl: capturedPhoto,
            isApproved: false, // Default to false, requires admin approval
          };

          const updatedParticipants = [...participants, newParticipant];
          setParticipants(updatedParticipants);
        }

      } catch (error) {
        console.error("Error during pass download or server save:", error);
        alert("Failed to download or save pass. Please try again.");
      }
    }
  }

  const resetForm = () => {
    setCurrentStep("initial")
    setShowForm(false)
    setCapturedPhoto("")
    setFormData({ name: "", flatNumber: "" })
    setGeneratedPass("")
    setIsGeneratingPass(false)
  }

  const handleShutterClick = () => {
    startWebcam()
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setCapturedPhoto(reader.result as string)
        // After file upload, transition to the form step
        setCurrentStep("form")
        setShowForm(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemovePhoto = () => {
    setCapturedPhoto("");
    // Ensure the form is visible if a photo was just removed
    setCurrentStep("form");
    setShowForm(true);
  };

  const handleApprove = useCallback(async (id: string) => {
    try {
      // Optimistically update UI
      setParticipants(prevParticipants =>
        prevParticipants.map(p =>
          p.id === id ? { ...p, isApproved: true } : p
        )
      );

      const response = await fetch(`/api/approve-participant/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Revert optimistic update on error
        setParticipants(prevParticipants =>
          prevParticipants.map(p =>
            p.id === id ? { ...p, isApproved: false } : p
          )
        );
        throw new Error(`Failed to approve participant: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Participant approved:', result);
    } catch (error) {
      console.error('Error approving participant:', error);
      alert('Failed to approve participant. Please try again.');
    }
  }, []);

  const handleReject = useCallback(async (id: string) => {
    if (confirm('Are you sure you want to reject this participant? This action cannot be undone.')) {
      // Store the participant being rejected in case we need to revert
      const participantToReject = participants.find(p => p.id === id);
      
      try {
        // Optimistically update UI
        setParticipants(prevParticipants =>
          prevParticipants.filter(p => p.id !== id)
        );

        const response = await fetch(`/api/reject-participant/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          // Revert optimistic update on error
          if (participantToReject) {
            setParticipants(prevParticipants => [...prevParticipants, participantToReject]);
          }
          throw new Error(`Failed to reject participant: ${response.statusText}`);
        }

        console.log('Participant rejected:', `ID: ${id}`);
      } catch (error) {
        // Revert optimistic update on error
        if (participantToReject) {
          setParticipants(prevParticipants => [...prevParticipants, participantToReject]);
        }
        console.error('Error rejecting participant:', error);
        alert('Failed to reject participant. Please try again.');
      }
    }
  }, [participants]);

  const handleAdminToggle = () => {
    if (isAdmin) {
      // If already in admin mode, exit directly
      setIsAdmin(false);
    } else {
      // If not in admin mode, show password dialog
      setShowPasswordDialog(true);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, using a simple hardcoded password
    // In a real application, this should be properly secured
    if (password === "vighnaharta2025") {
      setIsAdmin(true);
      setShowPasswordDialog(false);
      setPassword("");
      setPasswordError("");
    } else {
      setPasswordError("Incorrect password. Please try again.");
    }
  };

  return (
    <>
      {/* Hero Section - The Sacred Opening (Fixed Background) */}
      <section
        ref={heroRef}
        className="fixed inset-0 w-full min-h-screen h-screen overflow-hidden z-0 flex flex-col justify-center"
        style={{ backgroundColor: "var(--festival-dark)" }}
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
          src="/1234.mp4"
        />
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/khushi-bappa-nobg2.png')",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0"></div>
        <div
          className="absolute bottom-0 right-0 p-4 sm:p-6 lg:p-8 transition-opacity duration-500 ease-out z-20"
          style={{
            opacity: Math.max(0, 1 - scrollProgress * 1.5),
          }}
        >
          <div
            className="text-2xl sm:text-3xl lg:text-5xl"
            style={{
              color: "#FFD700",
            }}
          >
            ॐ
          </div>
        </div>

        {/* Top bar with title image */}
        <div className="absolute top-0 left-0 w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 z-10">
        <NextImage
          src="/hero-text.png"
          alt="Khushi Residency Cha Raja calligraphy text"
          width={800}
          height={200}
          priority
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-serif font-bold text-white leading-tight text-center"
        />
      </div>

        <div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce transition-opacity duration-500 ease-out z-10"
          style={{ opacity: Math.max(0, 1 - heroScrollProgress * 2) }}
        >
          <div className="flex flex-col items-center text-white/60">
            <span className="text-sm mb-2">Scroll Down</span>
            <ChevronDown className="w-6 h-6" />
          </div>
        </div>
      </section>

      {/* Spacer to push content down, so it starts after the fixed hero */}
      <div className="h-screen" />

      {/* Scrollable Content Container */}
      <div className="relative z-10">
      <section
        ref={scheduleRef}
        className="py-4 sm:py-6 md:py-8 lg:py-10 relative overflow-hidden px-2 sm:px-6 lg:px-8 min-h-[60vh] sm:min-h-screen flex items-center"
        style={{ backgroundColor: "#FFF8F0" }}
      >
        <div className="container mx-auto max-w-7xl w-full">
          <div className="text-center mb-4 sm:mb-6 lg:mb-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-gray-800 mb-2 sm:mb-3">
              Festival Schedule
            </h2>
            <p className="text-gray-600 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto">
              Follow the sacred timeline of our celebration
            </p>
          </div>

          <div
            className="transition-opacity duration-500"
            style={{
                opacity: Math.max(0, 1 - revealProgress * 1.5),
            }}
          >
            <div className="w-full">
              <Timeline festivalDays={festivalDays} onDayClick={setSelectedDay} />
            </div>
          </div>
        </div>
      </section>

      {/* Registration Section */}
      <section
        className="py-8 sm:py-16 lg:py-20 px-2 sm:px-6 lg:px-8 min-h-[60vh] sm:min-h-screen flex items-center"
        style={{ backgroundColor: "var(--festival-dark)" }}
      >
        <div className="container mx-auto max-w-7xl w-full">
          <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-center mb-8 sm:mb-16 text-white">
            Say 'hi' - Register for Games
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-12 max-w-6xl mx-auto items-center">
            {/* Left Column - Camera */}
            <div className="flex justify-center order-1 lg:order-1 mb-6 lg:mb-0">
              <div className="relative w-full max-w-xs sm:max-w-md lg:max-w-lg">
                <img src="/camera.png" alt="Polaroid Camera" className="w-full h-auto object-contain" />

                {/* Arrow image pointing to the red circle */}
                <img
                  src="/output.png"
                  alt="Click here"
                  className="absolute z-30 pointer-events-none"
                  style={{
                    width: "100px", // Further adjusted size
                    height: "auto",
                    top: "58%", // Adjusted vertical position to point towards the lens
                    left: "10%", // Adjusted horizontal position more to the right
                    transform: "translate(-50%, -50%) rotate(-10deg)", // Adjusted rotation to point left-up
                  }}
                />

                {/* Arrow image pointing to the red circle */}
                <img
                  src="/20250825_0402_Smaller Text Request_remix_01k3f38qkcfzrsjcdgse44hczc.png"
                  alt="Click here"
                  className="absolute z-30 pointer-events-none"
                  style={{
                    width: "40%", // Further adjusted size
                    height: "auto",
                    top: "75%", // Adjusted vertical position to point towards the lens
                    left: "25%", // Adjusted horizontal position more to the right
                 }}
                />

                {/* Red Circle Overlay on Camera's Circle */}
                <button 
                  onClick={handleShutterClick}
                  className="absolute w-8 h-8 bg-red-500 rounded-full shadow-lg hover:bg-red-600 hover:scale-110 transition-all duration-200 cursor-pointer"
                  style={{
                    top: "47%",
                    left: "24.7%",
                    transform: "translate(-50%, -50%)",
                  }}
                  aria-label="Take Photo"
                />

                {/* Shutter Button Overlay */}
                <button
                  onClick={handleShutterClick}
                  className="absolute w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full bg-transparent border-2 border-transparent hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-110 transition-all duration-200 cursor-pointer"
                  style={{
                    top: "22%",
                    left: "15%",
                    transform: "translate(-50%, -50%)",
                  }}
                  aria-label="Take Photo"
                />
                </div>
            </div>

            {/* Right Column - Form */}
            <div className="order-2 lg:order-2">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-2 sm:p-6 lg:p-8">
                <CardContent className="space-y-4 sm:space-y-6">
                  {isGeneratingPass ? (
                    <div className="text-center text-white text-lg py-10">
                      <p>Generating your pass...</p>
                      {/* You can add a spinner here if you have one */}
                    </div>
                  ) : generatedPass ? (
                    <div className="flex flex-col items-center space-y-4">
                      <img src={generatedPass} alt="Register for Games" className="w-full max-w-xs rounded-lg shadow-lg" />
                      <Button
                        onClick={downloadPass}
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-2 px-6 rounded-full shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105"
                      >
                        Download Pass
                      </Button>
                      <Button
                        onClick={resetForm}
                        variant="ghost"
                        className="w-full text-white/70 bg-white/10 hover:bg-white/20 hover:text-white border border-white/20 hover:border-white/30 font-semibold py-2 px-6 rounded-full shadow-md transition-all duration-220 ease-in-out transform hover:scale-105"
                      >
                        Create Another Pass
                      </Button>
                    </div>
                  ) : (
                    <>
                    <div>
                      <label className="block text-white text-sm sm:text-base font-medium mb-2">Full Name</label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="bg-white/10 border-white/30 text-white placeholder:text-white/60 text-sm sm:text-base"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-white text-sm sm:text-base font-medium mb-2">Flat Number</label>
                      <Input
                        type="text"
                        value={formData.flatNumber}
                        onChange={(e) => setFormData({ ...formData, flatNumber: e.target.value })}
                        className="bg-white/10 border-white/30 text-white placeholder:text-white/60 text-sm sm:text-base"
                        placeholder="Enter your flat number"
                      />
                    </div>

                    <div>
                      <label className="block text-white text-sm sm:text-base font-medium mb-2">Upload Picture</label>
                      {capturedPhoto ? (
                        <div className="border-2 border-white/30 rounded-lg p-4 text-center">
                          <img 
                            src={capturedPhoto} 
                            alt="Captured Photo" 
                            className="w-32 h-32 mx-auto rounded-lg object-cover mb-2"
                          />
                          <p className="text-white/80 text-sm">Photo captured successfully!</p>
                            <Button
                              onClick={handleRemovePhoto}
                              variant="ghost"
                              className="mt-2 text-white/70 bg-white/10 hover:bg-white/20 hover:text-white border border-white/20 hover:border-white/30 font-semibold py-1 px-3 rounded-full text-xs"
                            >
                              Remove Photo
                            </Button>
                        </div>
                      ) : (
                        <div
                          className="border-2 border-dashed border-white/30 rounded-lg p-6 sm:p-8 text-center hover:border-white/50 transition-colors cursor-pointer relative"
                        >
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-white/60 mx-auto mb-2 sm:mb-4" />
                        <p className="text-white/80 text-sm sm:text-base">Click to upload your picture</p>
                        <p className="text-white/60 text-xs sm:text-sm mt-1">PNG, JPG up to 10MB</p>
                      </div>
                      )}
                    </div>

                    <Button
                      onClick={handleFormSubmit}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-2 sm:py-3 text-sm sm:text-base"
                        disabled={!formData.name || !formData.flatNumber}
                    >
                        Make your polariod
                    </Button>
                    </>
                    )}
                  </CardContent>
                </Card>
            </div>
          </div>
        </div>
      </section>


      {/* Admin Approval Section */}
      {isAdmin && (
        <section className="py-8 sm:py-16 lg:py-20 px-2 sm:px-6 lg:px-8 bg-gray-100 dark:bg-gray-900">
          <div className="container mx-auto max-w-7xl">
            <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-center mb-6 sm:mb-12 text-foreground">
              Admin Approval Queue
            </h2>
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6 max-w-6xl mx-auto">
              {participants.filter(p => !p.isApproved).map((participant) => (
                <div key={participant.id} className="rounded-lg shadow-md overflow-hidden bg-white dark:bg-gray-800 p-4">
                  <div className="w-full h-48 relative overflow-hidden rounded-md mb-4"> {/* Added fixed height and relative positioning */}
                    <ParticipantImage src={participant.imageUrl || "/placeholder.svg"} alt={participant.name} />
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-lg font-semibold text-foreground">{participant.name}</p>
                    <p className="text-sm text-muted-foreground">Flat: {participant.flatNumber}</p>
                    <div className="flex justify-center space-x-2 mt-4 z-10">
                      <Button onClick={() => handleApprove(participant.id)} className="bg-green-500 hover:bg-green-600 text-white">Approve</Button>
                      <Button onClick={() => handleReject(participant.id)} variant="destructive">Reject</Button>
                    </div>
                  </div>
                </div>
              ))}
              {participants.filter(p => !p.isApproved).length === 0 && (
                <div className="col-span-full text-center py-8">
                  <p className="text-muted-foreground">No pending approvals.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Secret Messages Section */}
      {isAdmin && (
        <section className="py-8 sm:py-16 lg:py-20 px-2 sm:px-6 lg:px-8 bg-gray-100 dark:bg-gray-900">
          <div className="container mx-auto max-w-7xl">
            <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-center mb-6 sm:mb-12 text-foreground">
              Secret Messages
            </h2>
            <div className="max-w-4xl mx-auto">
              {messages.length > 0 ? (
                (() => {
                  // Group messages by organizer
                  const groupedMessages = messages.reduce((acc, message) => {
                    const key = `${message.organizer}-${message.organizerRole}`;
                    if (!acc[key]) {
                      acc[key] = {
                        organizer: message.organizer,
                        organizerRole: message.organizerRole,
                        messages: []
                      };
                    }
                    acc[key].messages.push(message);
                    return acc;
                  }, {} as Record<string, { organizer: string; organizerRole: string; messages: typeof messages }>);

                  // Function to handle page change for a specific organizer
                  const handleMessagePageChange = (key: string, direction: 'next' | 'prev') => {
                    const currentGroup = groupedMessages[key];
                    const totalPages = Math.ceil(currentGroup.messages.length / 4);
                    const currentPage = messagePages[key] || 0;
                    
                    let newPage = currentPage;
                    if (direction === 'next') {
                      newPage = (currentPage + 1) % totalPages;
                    } else {
                      newPage = (currentPage - 1 + totalPages) % totalPages;
                    }
                    
                    setMessagePages({ ...messagePages, [key]: newPage });
                  };

                  return (
                    <div className="space-y-8">
                      {Object.entries(groupedMessages).map(([key, group]) => {
                        const currentPage = messagePages[key] || 0;
                        const totalPages = Math.ceil(group.messages.length / 4);
                        const startIndex = currentPage * 4;
                        const endIndex = startIndex + 4;
                        const currentMessages = group.messages.slice(startIndex, endIndex);
                        
                        return (
                          <div key={key} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
                            <h3 className="text-xl font-semibold text-foreground mb-4">
                              Messages for {group.organizer} ({group.organizerRole})
                            </h3>
                            
                            {/* Navigation Arrows */}
                            {group.messages.length > 4 && (
                              <div className="flex justify-between items-center mb-4">
                                <button
                                  onClick={() => handleMessagePageChange(key, 'prev')}
                                  className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                  aria-label="Previous messages"
                                >
                                  <ChevronLeft className="w-5 h-5 text-foreground" />
                                </button>
                                
                                <span className="text-foreground text-sm">
                                  Page {currentPage + 1} of {totalPages}
                                </span>
                                
                                <button
                                  onClick={() => handleMessagePageChange(key, 'next')}
                                  className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                  aria-label="Next messages"
                                >
                                  <ChevronRight className="w-5 h-5 text-foreground" />
                                </button>
                              </div>
                            )}
                            
                            {/* Messages Display */}
                            <div className="space-y-4">
                              {currentMessages.map((message) => (
                                <div key={message.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(message.timestamp).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-foreground whitespace-pre-wrap">{message.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No secret messages yet.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Participants Gallery */}
      <section
        className="py-8 sm:py-16 lg:py-20 px-2 sm:px-6 lg:px-8"
        style={{ backgroundColor: "var(--festival-light)" }}
      >
        <div className="container mx-auto max-w-7xl">
          <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-center mb-6 sm:mb-12 text-foreground">
            The 'pyaare' People
          </h2>
          <div className="flex flex-col justify-start min-h-[calc(60vh-100px)] sm:min-h-[calc(100vh-200px)]">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-6 max-w-6xl mx-auto">
              {participants.filter(p => p.isApproved).slice(currentPage * PARTICIPANTS_PER_PAGE, (currentPage + 1) * PARTICIPANTS_PER_PAGE).map((participant) => (
                <div key={participant.id} className="rounded-lg shadow-md overflow-hidden hover:scale-105 transition-transform bg-gray-100 dark:bg-gray-800">
                  <ParticipantImage src={participant.imageUrl || "/placeholder.svg"} alt={participant.name} />
                </div>
              ))}

              {participants.filter(p => p.isApproved).length === 0 && (
                <div className="col-span-full text-center py-8 sm:py-12">
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Say 'hi' to people
                  </p>
                </div>
              )}
            </div>

            {participants.filter(p => p.isApproved).length > PARTICIPANTS_PER_PAGE && (
              <div className="flex flex-row justify-center items-center space-x-2 sm:space-x-4 mt-4 sm:mt-8">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className="w-12 h-12 sm:w-20 sm:h-20 bg-transparent border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transform rotate-[-90deg] hover:scale-110 transition-transform duration-200 flex-shrink-0"
                  aria-label="Previous Page"
                >
                  <img src="/peepal-leaf.png" alt="Previous" className="w-full h-full object-contain" />
                </button>
                <span className="text-black text-base sm:text-lg px-2">
                  Page {currentPage + 1} of {Math.ceil(participants.filter(p => p.isApproved).length / PARTICIPANTS_PER_PAGE)}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(Math.ceil(participants.filter(p => p.isApproved).length / PARTICIPANTS_PER_PAGE) - 1, prev + 1))}
                  disabled={currentPage === Math.ceil(participants.filter(p => p.isApproved).length / PARTICIPANTS_PER_PAGE) - 1}
                  className="w-12 h-12 sm:w-20 sm:h-20 bg-transparent border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transform rotate-[90deg] hover:scale-110 transition-transform duration-200 flex-shrink-0"
                  aria-label="Next Page"
                >
                  <img src="/peepal-leaf.png" alt="Next" className="w-full h-full object-contain" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Organizers Section */}
      <section
        className="py-8 sm:py-16 lg:py-20 px-2 sm:px-6 lg:px-8"
        style={{ backgroundColor: "var(--festival-dark)" }}
      >
        <div className="container mx-auto max-w-7xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-center mb-6 sm:mb-12 text-white">
            {/* Even bigger size for mobile */}
            <span className="text-4xl sm:text-3xl md:text-4xl lg:text-5xl">
              Say hello to the family
            </span>
          </h2>
          <div
            className="overflow-x-auto"
            style={{
              scrollbarWidth: "none", // Firefox
              msOverflowStyle: "none", // IE/Edge
            }}
          >
            {/* Hide scrollbar for Webkit browsers */}
            <style>{`
              .hide-scrollbar::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <div className="hide-scrollbar w-full max-w-full">
              <div className="w-full max-w-full">
                <OrganizersCarousel organizers={organizers} isAdmin={isAdmin} />
              </div>
            </div>
          </div>
        </div>
        {/* Admin Mode Button: 
            - On mobile: fixed bottom right, only in this section.
            - On sm+: as before (bottom right, larger, absolute). */}
        <div>
          {/* Only show on mobile and only in this section */}
          <div
            className="block sm:hidden"
            style={{
              position: "fixed",
              bottom: "16px",
              right: "16px",
              zIndex: 20,
            }}
          >
            <Button
              onClick={handleAdminToggle}
              className="text-white font-bold py-1 px-3 rounded border border-white/30 hover:bg-white/20 bg-transparent text-xs"
              style={{ minWidth: 0, minHeight: 0, height: "32px", fontSize: "0.85rem" }}
            >
              {isAdmin ? "Exit Admin" : "Admin"}
            </Button>
          </div>
          <div className="hidden sm:block fixed sm:absolute bottom-4 right-4 sm:right-4 sm:bottom-4 z-10 left-0 sm:left-auto">
            <Button
              onClick={handleAdminToggle}
              className="text-white font-bold py-2 px-4 rounded border border-white/30 hover:bg-white/20 bg-transparent"
            >
              {isAdmin ? "Exit Admin Mode" : "Enter Admin Mode"}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-4 sm:py-8 text-center px-2 sm:px-6 lg:px-8"
        style={{ backgroundColor: "var(--festival-dark)" }}
      >
        <p className="text-white/60 text-xs sm:text-base">Made with ❤️</p>
        <Button
          variant="ghost"
          className="text-white/60 hover:text-white mt-2 sm:mt-4 text-xs sm:text-base"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          Back to Top
        </Button>
      </footer>
      </div>

      {/* Webcam Dialog */}
      <Dialog open={showWebcam} onOpenChange={(open) => !open && closeWebcam()}>
        <DialogContent className="bg-black/90 backdrop-blur-sm border-2 border-white/20 max-w-xs sm:max-w-md w-full" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-white text-center font-mono text-base sm:text-lg">📷 VIEWFINDER</DialogTitle>
          </DialogHeader>
          <div className="py-2 sm:py-4">
            <div className="relative">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full rounded-lg border-2 border-white/30 bg-black min-h-[180px] sm:min-h-[300px]"
                style={{ 
                  display: 'block',
                  visibility: 'visible',
                  opacity: '1'
                }}
                onLoadedMetadata={() => {
                  console.log('Video metadata loaded via JSX, playing...');
                  if (videoRef.current) {
                    videoRef.current.play().catch(console.error);
                  }
                  setIsVideoReady(true);
                }}
                onCanPlay={() => {
                  console.log('Video can play via JSX, playing...');
                  if (videoRef.current) {
                    videoRef.current.play().catch(console.error);
                  }
                  setIsVideoReady(true);
                }}
                onPlay={() => console.log('Video started playing!')}
                onPause={() => console.log('Video paused')}
                onStalled={() => console.log('Video stalled')}
                onWaiting={() => console.log('Video waiting')}
              />

              {!videoRef.current?.srcObject && (
                <div className="absolute inset-0 flex items-center justify-center text-white/60">
                  <p>Camera loading...</p>
                </div>
              )}
              <div className="absolute inset-0 pointer-events-none">
                <div className="w-full h-full border border-white/20 rounded-lg">
                  <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20"></div>
                  <div className="absolute bottom-1/3 left-0 right-0 h-px bg-white/20"></div>
                  <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20"></div>
                  <div className="absolute right-1/3 top-0 bottom-0 w-px bg-white/20"></div>
                </div>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex justify-center mt-4">
              <Button
                onClick={capturePhoto}
                className="bg-red-600 hover:bg-red-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-full font-bold text-sm sm:text-base"
                disabled={!isVideoReady}
              >
                <Camera className="w-5 h-5 mr-2" />
                Capture
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Day Details Dialog */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="bg-card max-w-xs sm:max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-2xl font-serif text-center">{selectedDay?.content}</DialogTitle>
          </DialogHeader>
          <div className="py-2 sm:py-4">
            {Array.isArray(selectedDay?.details) ? (
              (selectedDay?.details as string[]).map((line, idx) => (
                <div key={idx} className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                  {line}
                </div>
              ))
            ) : (
              <div className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                {selectedDay?.details as string}
              </div>
            )}
          </div>
          <div className="flex justify-center pt-2 sm:pt-4">
            <Button
              onClick={() => setSelectedDay(null)}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm sm:text-base"
            >
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-card max-w-xs sm:max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-2xl font-serif text-center">Admin Access</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit}>
            <div className="py-2 sm:py-4">
              <p className="text-muted-foreground mb-2 sm:mb-4 text-xs sm:text-base">Enter the admin password to access the admin panel.</p>
              <div className="mb-2 sm:mb-4">
                <label htmlFor="password" className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Password</label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  className={passwordError ? "border-red-500" : ""}
                  placeholder="Enter password"
                />
                {passwordError && <p className="text-red-500 text-xs sm:text-sm mt-2">{passwordError}</p>}
              </div>
            </div>
            <div className="flex justify-center space-x-2 sm:space-x-4 pt-2 sm:pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPassword("");
                  setPasswordError("");
                }}
                className="text-xs sm:text-base"
              >
                Cancel
              </Button>
              <Button type="submit" className="text-xs sm:text-base">
                Submit
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}