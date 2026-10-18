import { RiderDocument } from "@/types";
import { daysUntil } from "@/utils/formatters";

// Same exported function names/signatures as the mobile build's notification
// service, backed by the browser's Notification API instead of a native one.
// Scheduled (non-immediate) reminders use setTimeout, so they only fire while
// this tab stays open — a real deployment would move scheduling server-side
// and deliver it as a web push notification instead.

let scheduledTimers: number[] = [];

export async function registerForLocalNotifications(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function notify(title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/logo-mark.png" });
  } catch {
    // Some browsers (notably in-app webviews) throw on `new Notification()` —
    // fail silently rather than crash the app over a non-critical reminder.
  }
}

const WARNING_WINDOWS_DAYS = [14, 7, 1];

/**
 * Schedules local reminders for every required document that is within its warning
 * window, and fires immediately for anything already expired. Call this after login
 * and after a rider updates their documents.
 */
export async function scheduleDocumentExpiryReminders(documents: RiderDocument[]): Promise<void> {
  scheduledTimers.forEach((id) => window.clearTimeout(id));
  scheduledTimers = [];

  for (const doc of documents) {
    if (!doc.required || !doc.expiresAt) continue;
    const remaining = daysUntil(doc.expiresAt);

    if (remaining <= 0) {
      notify("Document expired", `Your ${doc.label} has expired. Upload a valid copy to keep accepting deliveries.`);
      continue;
    }

    const nextWindow = WARNING_WINDOWS_DAYS.find((w) => w <= remaining);
    if (nextWindow) {
      const fireInMs = Math.max((remaining - nextWindow) * 24 * 60 * 60 * 1000, 2000);
      const id = window.setTimeout(() => {
        notify(
          "Document expiring soon",
          `Your ${doc.label} expires in ${nextWindow} day${nextWindow === 1 ? "" : "s"}. Renew it to avoid losing access.`
        );
      }, fireInMs);
      scheduledTimers.push(id);
    }
  }
}

export function hasExpiredRequiredDocument(documents: RiderDocument[]): boolean {
  return documents.some((d) => d.required && d.expiresAt && daysUntil(d.expiresAt) <= 0);
}

export function documentsExpiringSoon(documents: RiderDocument[], withinDays = 14): RiderDocument[] {
  return documents.filter(
    (d) => d.required && d.expiresAt && daysUntil(d.expiresAt) > 0 && daysUntil(d.expiresAt) <= withinDays
  );
}
