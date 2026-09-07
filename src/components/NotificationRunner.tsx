import { useEffect } from 'react'
import { useCycle } from '../hooks/useCycle'
import { useDb } from '../hooks/useDb'
import {
  getPrefs, buildReminders, runDueRemindersLocally, getSubscription, syncToServer,
  type ReminderCode,
} from '../lib/notifications'

/**
 * Runs on every app open: if notifications are enabled, rebuilds the schedule from
 * the current prediction, shows any locally-due reminder (fallback that works with
 * no backend), and re-syncs the schedule to the push server (if configured).
 */
export default function NotificationRunner() {
  const { prediction, avgCycleLen } = useCycle()
  const { todayLog } = useDb()
  const jaRegistrouHoje = !!todayLog

  useEffect(() => {
    const prefs = getPrefs()
    if (!prefs.enabled || !prediction) return
    const reminders = buildReminders({
      prefs,
      nextPeriodStart: prediction.nextPeriodStart,
      fertileStart: prediction.fertileWindowStart,
      ovulation: prediction.predictedOvulation,
      lutealStart: prediction.lutealStart,
      cycleLen: avgCycleLen,
    })
    // Don't nudge her to log if she already did today.
    const skip: ReminderCode[] = jaRegistrouHoje ? ['log_daily'] : []
    runDueRemindersLocally(reminders, skip)
    getSubscription().then((sub) => syncToServer(sub, reminders))
  }, [prediction, avgCycleLen, jaRegistrouHoje])

  return null
}
