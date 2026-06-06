/**
 * DataContext — Global prefetch & cache for dashboard data.
 *
 * Right after the user's backend sync completes (syncComplete = true),
 * this context fetches analytics, history, and overall report
 * IN PARALLEL in the background. Pages read from this cache
 * instead of making fresh API calls on every navigation.
 *
 * Call invalidateCache() after an interview finishes to refresh stale data.
 */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuthContext } from './AuthContext'
import { getAnalytics, getInterviewHistory, getOverallReport } from '../services/api'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { syncComplete, isSignedIn, getAuthToken } = useAuthContext()

  // ── Cached data ────────────────────────────────────────────────────────────
  // Note: history must start as [] (not null) so HistoryPage's .filter() never crashes.
  const [analytics, setAnalytics]           = useState(null)
  const [history, setHistory]               = useState([])
  const [overallReport, setOverallReport]   = useState(null)

  // ── Per-resource loading flags ─────────────────────────────────────────────
  // Start as false — they become true only when a real fetch is in-flight.
  // This prevents pages from showing a spinner before syncComplete fires.
  const [analyticsLoading, setAnalyticsLoading]     = useState(false)
  const [historyLoading, setHistoryLoading]          = useState(false)
  const [reportLoading, setReportLoading]            = useState(false)

  // Prevent double-fetch if effect fires twice (React StrictMode)
  const prefetchedRef = useRef(false)

  // ── Preload browser assets & eager JS chunks ──────────────────────────────
  const preloadAssets = () => {
    // 1. Tell browser to start fetching the 14 MB avatar model immediately.
    //    When Three.js GLTFLoader eventually runs, bytes are already in cache → instant.
    if (!document.querySelector('link[data-preload="model-glb"]')) {
      const link = document.createElement('link')
      link.rel         = 'preload'
      link.href        = '/model.glb'
      link.as          = 'fetch'
      link.crossOrigin = 'anonymous'
      link.dataset.preload = 'model-glb'
      document.head.appendChild(link)
    }

    // 2. Eagerly download all lazy page JS chunks so every navigation is instant.
    //    Vite deduplicates — these are no-ops if the chunk is already cached.
    import('../pages/DashboardPage').catch(() => {})
    import('../pages/HistoryPage').catch(() => {})
    import('../pages/ReportsPage').catch(() => {})
    import('../pages/InterviewPage').catch(() => {})
    import('../pages/ReportPage').catch(() => {})
    import('../pages/ProfilePage').catch(() => {})
    import('../pages/SetupPage').catch(() => {})
  }

  // ── Fetch all 3 API endpoints INDEPENDENTLY in parallel ──────────────────
  // Each resolves its own loading flag the moment ITS data arrives.
  // Pages don't wait for each other — dashboard shows as soon as analytics
  // lands, history shows when history lands, etc.
  const fetchIndependent = (token) => {
    const p1 = getAnalytics(token)
      .then(data => { setAnalytics(data);    setAnalyticsLoading(false) })
      .catch(err => { console.warn('[DataContext] analytics failed:', err); setAnalyticsLoading(false) })

    const p2 = getInterviewHistory(token, 50, 0)
      .then(data => { setHistory(data);      setHistoryLoading(false) })
      .catch(err => { console.warn('[DataContext] history failed:', err);   setHistoryLoading(false) })

    const p3 = getOverallReport(token)
      .then(data => { setOverallReport(data); setReportLoading(false) })
      .catch(err => { console.warn('[DataContext] report failed:', err);    setReportLoading(false) })

    return Promise.all([p1, p2, p3])
  }

  const prefetchAll = async () => {
    // Mark all resources as loading before fetches begin
    setAnalyticsLoading(true)
    setHistoryLoading(true)
    setReportLoading(true)
    try {
      const token = await getAuthToken()
      await fetchIndependent(token)
    } catch (err) {
      console.error('[DataContext] Prefetch error:', err)
      setAnalyticsLoading(false)
      setHistoryLoading(false)
      setReportLoading(false)
    }
  }

  // ── Expose this so InterviewPage can bust the cache after completion ────────
  const invalidateCache = async () => {
    setAnalyticsLoading(true)
    setHistoryLoading(true)
    setReportLoading(true)
    const token = await getAuthToken()
    await fetchIndependent(token)
  }

  // ── Auto-prefetch after login sync completes ───────────────────────────────
  useEffect(() => {
    if (syncComplete && isSignedIn && !prefetchedRef.current) {
      prefetchedRef.current = true
      preloadAssets()
      prefetchAll()
    }
  }, [syncComplete, isSignedIn])

  // ── Reset cache on logout ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isSignedIn) {
      setAnalytics(null)
      setHistory([])
      setOverallReport(null)
      setAnalyticsLoading(false)
      setHistoryLoading(false)
      setReportLoading(false)
      prefetchedRef.current = false
    }
  }, [isSignedIn])

  return (
    <DataContext.Provider value={{
      analytics,      analyticsLoading,
      history,        historyLoading,
      overallReport,  reportLoading,
      invalidateCache,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useDataContext() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useDataContext must be used inside DataProvider')
  return ctx
}
