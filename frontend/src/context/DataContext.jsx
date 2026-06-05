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
  const [analytics, setAnalytics]           = useState(null)
  const [history, setHistory]               = useState(null)
  const [overallReport, setOverallReport]   = useState(null)

  // ── Per-resource loading flags ─────────────────────────────────────────────
  const [analyticsLoading, setAnalyticsLoading]     = useState(true)
  const [historyLoading, setHistoryLoading]          = useState(true)
  const [reportLoading, setReportLoading]            = useState(true)

  // Prevent double-fetch if effect fires twice (React StrictMode)
  const prefetchedRef = useRef(false)

  // ── Fetch all 3 endpoints in parallel ─────────────────────────────────────
  const prefetchAll = async () => {
    try {
      const token = await getAuthToken()
      const [analyticsRes, historyRes, reportRes] = await Promise.allSettled([
        getAnalytics(token),
        getInterviewHistory(token, 50, 0),
        getOverallReport(token),
      ])

      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value)
      setAnalyticsLoading(false)

      if (historyRes.status === 'fulfilled') setHistory(historyRes.value)
      setHistoryLoading(false)

      if (reportRes.status === 'fulfilled') setOverallReport(reportRes.value)
      setReportLoading(false)
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
    prefetchedRef.current = false
    await prefetchAll()
  }

  // ── Auto-prefetch after login sync completes ───────────────────────────────
  useEffect(() => {
    if (syncComplete && isSignedIn && !prefetchedRef.current) {
      prefetchedRef.current = true
      prefetchAll()
    }
  }, [syncComplete, isSignedIn])

  // ── Reset cache on logout ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isSignedIn) {
      setAnalytics(null)
      setHistory(null)
      setOverallReport(null)
      setAnalyticsLoading(true)
      setHistoryLoading(true)
      setReportLoading(true)
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
