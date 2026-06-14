import { useEffect } from 'react'
import { useCycle } from '../hooks/useCycle'
import {
  getPrefs, buildReminders, runDueRemindersLocally, getSubscription, syncToServer,
} from '../lib/notifications'

/**
 * Runs on every app open: if notifications are enabled, rebuilds the schedule from
 * the current prediction, shows any locally-due reminder (fallback that works with
 * no backend), and re-syncs the schedule to the push server (if configured).
 */
export default function NotificationRunner() {
  const { prediction } = useCycle()

  useEffect(() => {
    const prefs = getPrefs()
    if (!prefs.enabled || !prediction) return
    const reminders = buildReminders({
      prefs,
      nextPeriodStart: prediction.nextPeriodStart,
      fertileStart: prediction.fertileWindowStart,
      ovulation: prediction.predictedOvulation,
      lutealStart: prediction.lutealStart,
    })
    runDueRemindersLocally(reminders)
    getSubscription().then((sub) => syncToServer(sub, reminders))
  }, [prediction])

  return null
}
