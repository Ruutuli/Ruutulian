'use client'

import { useEffect, useState, useTransition, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentPathRef = useRef(pathname)
  const startTimeRef = useRef<number | null>(null)

  // Show loading immediately on link click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // Ignore clicks on buttons (like mobile menu hamburger) unless they contain links
      if (target.tagName === 'BUTTON' && !target.closest('a')) {
        const button = target.closest('button')
        if (button && !button.closest('a')) {
          return
        }
      }
      
      const link = target.closest('a[href]')
      
      if (link) {
        const href = link.getAttribute('href')
        // Check if it's an internal Next.js link
        if (href && href.startsWith('/') && !href.startsWith('//') && !href.startsWith('http') && !href.startsWith('mailto:')) {
          // Don't show loading if clicking the same page (check pathname only, ignore query params)
          const hrefPath = href.split('?')[0].split('#')[0]
          if (hrefPath === pathname) return
          
          setIsLoading(true)
          setProgress(0)
          startTimeRef.current = Date.now()
          
          // Clear any existing interval
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
          }
          
          // Simulate progress while waiting
          progressIntervalRef.current = setInterval(() => {
            setProgress((prev) => {
              if (prev >= 90) {
                if (progressIntervalRef.current) {
                  clearInterval(progressIntervalRef.current)
                  progressIntervalRef.current = null
                }
                return prev
              }
              // Increase progress more slowly as it gets higher
              const increment = 95 - prev > 10 ? Math.random() * 10 : Math.random() * 2
              return Math.min(prev + increment, 90)
            })
          }, 100)
        }
      }
    }

    document.addEventListener('click', handleClick, true)
    return () => {
      document.removeEventListener('click', handleClick, true)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [pathname])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setIsLoading(true)
      setProgress(0)
      startTimeRef.current = Date.now()
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      
      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current)
              progressIntervalRef.current = null
            }
            return prev
          }
          const increment = 95 - prev > 10 ? Math.random() * 10 : Math.random() * 2
          return Math.min(prev + increment, 90)
        })
      }, 100)
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  // Track navigation completion
  useEffect(() => {
    // If pathname or searchParams changed, navigation completed
    if (currentPathRef.current !== pathname) {
      const wasLoading = isLoading
      currentPathRef.current = pathname
      
      // Complete the progress bar
      if (wasLoading || isPending) {
        setProgress(100)
        const timer = setTimeout(() => {
          setIsLoading(false)
          setProgress(0)
          startTimeRef.current = null
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
            progressIntervalRef.current = null
          }
        }, 200)
        return () => clearTimeout(timer)
      }
    }
    
    // Also handle isPending state from useTransition
    if (!isPending && isLoading) {
      setProgress(100)
      const timer = setTimeout(() => {
        setIsLoading(false)
        setProgress(0)
        startTimeRef.current = null
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [pathname, searchParams, isPending, isLoading])

  // Show loading indicator if loading or pending
  const showLoading = isLoading || isPending

  if (!showLoading) return null

  return (
    <>
      {/* Loading overlay */}
      <div 
        className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-[2px] transition-opacity duration-200"
        style={{
          opacity: showLoading ? 1 : 0,
          pointerEvents: 'none',
        }}
      />
      
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-transparent">
        <div 
          className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 shadow-lg shadow-purple-500/50 transition-all duration-300 ease-out relative overflow-hidden"
          style={{
            width: `${Math.min(progress || (isPending ? 20 : 0), 100)}%`,
          }}
        >
          {/* Shimmer effect */}
          <div 
            className="absolute top-0 left-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            style={{
              animation: 'shimmer 1.5s infinite',
            }}
          />
        </div>
      </div>
    </>
  )
}

