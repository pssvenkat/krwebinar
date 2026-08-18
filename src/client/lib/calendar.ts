/**
 * Calendar link generators
 * Produces Google Calendar, Apple/Outlook ICS, and Outlook Web links
 * for webinar registrations.
 */

export interface CalendarEvent {
  title: string
  description?: string
  startDate: string   // YYYY-MM-DD
  startTime: string   // HH:MM (24h)
  endTime: string     // HH:MM (24h)
  timezone: string
  location?: string
  url?: string
}

/** Format date+time for ICS (YYYYMMDDTHHmmss) */
function icsDateTime(date: string, time: string): string {
  return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`
}

/** Escape ICS text values */
function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

/** Generate Google Calendar URL */
export function googleCalendarUrl(event: CalendarEvent): string {
  const start = icsDateTime(event.startDate, event.startTime)
  const end = icsDateTime(event.startDate, event.endTime)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    ctz: event.timezone,
    details: event.description ?? '',
    location: event.location ?? '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** Generate ICS file content (Apple Calendar / Outlook download) */
export function generateICS(event: CalendarEvent): string {
  const uid = `${Date.now()}@krwebinar`
  const dtstamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
  const dtstart = icsDateTime(event.startDate, event.startTime)
  const dtend = icsDateTime(event.startDate, event.endTime)

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KRWebinar//Webinar Platform//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=${event.timezone}:${dtstart}`,
    `DTEND;TZID=${event.timezone}:${dtend}`,
    `SUMMARY:${icsEscape(event.title)}`,
    event.description ? `DESCRIPTION:${icsEscape(event.description)}` : '',
    event.location ? `LOCATION:${icsEscape(event.location)}` : '',
    event.url ? `URL:${event.url}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')
}

/** Trigger ICS download in browser */
export function downloadICS(event: CalendarEvent, filename = 'webinar.ics'): void {
  const content = generateICS(event)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Outlook Web Add Event URL */
export function outlookWebUrl(event: CalendarEvent): string {
  const start = `${event.startDate}T${event.startTime}:00`
  const end = `${event.startDate}T${event.endTime}:00`
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: start,
    enddt: end,
    body: event.description ?? '',
    location: event.location ?? '',
  })
  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`
}
