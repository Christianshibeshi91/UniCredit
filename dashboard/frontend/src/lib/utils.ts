import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Parse date strings in any of the formats found in the Google Sheet. */
export function parseDate(raw: string): Date | null {
  if (!raw) return null

  // ISO format: 2026-03-05T23:04:00.639676+00:00
  let d = new Date(raw)
  if (!isNaN(d.getTime())) return d

  // Strip timezone abbreviation (PST/PT/etc) before parsing
  const cleaned = raw.replace(/\s+(PST|PDT|PT|EST|EDT|ET|UTC|GMT)$/i, "").trim()
  d = new Date(cleaned)
  if (!isNaN(d.getTime())) return d

  // MM/DD/YY HH:MM AM/PM — manually parse 2-digit year
  const m = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (m) {
    const year = 2000 + parseInt(m[3], 10)
    let hour = parseInt(m[4], 10)
    if (m[6].toUpperCase() === "PM" && hour !== 12) hour += 12
    if (m[6].toUpperCase() === "AM" && hour === 12) hour = 0
    return new Date(year, parseInt(m[1], 10) - 1, parseInt(m[2], 10), hour, parseInt(m[5], 10))
  }

  return null
}

export function formatDate(raw: string): string {
  if (!raw) return "—"
  const d = parseDate(raw)
  if (!d) return raw
  // Cap future dates at now (prevents confusing display from bad data)
  const now = new Date()
  const display = d.getTime() > now.getTime() ? now : d
  const formatted = display.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Los_Angeles",
  })
  // Detect PST vs PDT dynamically
  const tz = display.toLocaleString("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "short" }).split(" ").pop() || "PT"
  return `${formatted} ${tz}`
}
