'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { logMemoryUsage } from '@/lib/memory-monitor'

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const progressIntervalRef = useRef<number | null>(null)
  const timeoutsRef = useRef<Set<number>>(new Set())
  const currentPathRef = useRef(pathname)
  const isNavigatingRef = useRef(false)

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timeoutsRef.current.delete(id)
      fn()
    }, ms)
    timeoutsRef.current.add(id)
    
    logMemoryUsage('Client', 'NavigationProgress: Timeout scheduled', {
      component: 'NavigationProgress',
      timeoutId: id,
      delay: ms,
      activeTimeouts: timeoutsRef.current.size,
    })
    
    return id
  }, [])

  // Ensure intervals/timeouts can't outlive the component
  useEffect(() => {
    logMemoryUsage('Client', 'NavigationProgress: Component mounted', {
      component: 'NavigationProgress',
    })

    return () => {
      logMemoryUsage('Client', 'NavigationProgress: Component unmounting', {
        component: 'NavigationProgress',
        activeIntervals: progressIntervalRef.current ? 1 : 0,
        activeTimeouts: timeoutsRef.current.size,
      })

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      for (const id of timeoutsRef.current) {
        clearTimeout(id)
      }
      timeoutsRef.current.clear()
    }
  }, [])

  // Start loading progress animation (shared function)
  const startLoadingRef = useRef<() => void>()
  startLoadingRef.current = () => {
    if (isNavigatingRef.current) return // Already loading
    
    isNavigatingRef.current = true
    setIsLoading(true)
    setProgress(10) // Start at 10% so it's immediately visible
    
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }
    
    // Start progress animation immediately - first increment happens right away
    const updateProgress = () => {
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
    }
    
    // Start immediately, then continue on interval
    updateProgress()
    progressIntervalRef.current = window.setInterval(updateProgress, 100)
  }

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
          
          // Start loading immediately
          startLoadingRef.current?.()
        }
      }
    }

    document.addEventListener('click', handleClick, true)
    return () => {
      document.removeEventListener('click', handleClick, true)
    }
  }, [pathname])

  // Helper function to complete loading
  const completeLoading = useCallback(() => {
    if (!isNavigatingRef.current) return
    
    isNavigatingRef.current = false
    setProgress(100)
    scheduleTimeout(() => {
      setIsLoading(false)
      setProgress(0)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }, 200)
  }, [scheduleTimeout])

  // Initialize pathname ref on mount
  useEffect(() => {
    if (currentPathRef.current === '') {
      currentPathRef.current = pathname
    }
  }, [])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      startLoadingRef.current?.()
    }

    // Listen for when page finishes loading after navigation (including back/forward)
    const handlePageShow = (e: PageTransitionEvent) => {
      // If this is a back/forward navigation (persisted from cache) or we're currently navigating
      if (e.persisted || isNavigatingRef.current) {
        // Give Next.js a moment to update the pathname, then complete loading
        scheduleTimeout(() => {
          if (isNavigatingRef.current) {
            completeLoading()
          }
        }, 150)
      }
    }

    window.addEventListener('popstate', handlePopState)
    window.addEventListener('pageshow', handlePageShow)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [completeLoading, scheduleTimeout])

  // Track navigation completion
  useEffect(() => {
    // If pathname changed, navigation completed
    if (currentPathRef.current !== pathname && currentPathRef.current !== '') {
      currentPathRef.current = pathname
      completeLoading()
    } else if (currentPathRef.current === '') {
      // First render - initialize
      currentPathRef.current = pathname
    }
  }, [pathname, searchParams, completeLoading])

  // Safety timeout: ensure loading always clears after a maximum time
  // This handles edge cases where navigation completes but pathname doesn't change
  useEffect(() => {
    if (!isNavigatingRef.current) return

    const safetyTimeout = setTimeout(() => {
      if (isNavigatingRef.current) {
        // Force complete if still loading after 2 seconds
        completeLoading()
      }
    }, 2000)

    return () => clearTimeout(safetyTimeout)
  }, [isLoading, pathname, completeLoading])

  if (!isLoading) return null

  return (
    <>
      {/* Loading overlay */}
      <div 
        className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-[2px] pointer-events-none"
      />
      
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-transparent">
        <div 
          className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 shadow-lg shadow-purple-500/50 transition-all duration-150 ease-out relative overflow-hidden"
          style={{
            width: `${Math.max(progress, 10)}%`,
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

