<?php

namespace App\Services;

use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\Rsvp;
use Carbon\Carbon;

/**
 * Generates an RFC 5545-compliant .ics calendar invitation string.
 * Can be attached to Mailable as raw attachment.
 */
class CalendarService
{
    /**
     * Generate an iCalendar (.ics) string for the given event and RSVP.
     *
     * @param  Event  $event
     * @param  Rsvp   $rsvp
     * @return string  Raw .ics content
     */
    public function generateIcs(Event $event, Rsvp $rsvp): string
    {
        $dtStart = $event->event_date instanceof Carbon
            ? $event->event_date
            : Carbon::parse($event->event_date);

        // Default duration: 2 hours if no end date field exists
        $dtEnd = $dtStart->copy()->addHours(2);

        $uid      = 'rsvp-' . $rsvp->id . '-event-' . $event->id . '@marhalaty';
        $now      = Carbon::now()->format('Ymd\THis\Z');
        $start    = $dtStart->format('Ymd\THis');
        $end      = $dtEnd->format('Ymd\THis');
        $summary  = $this->escapeIcs($event->title);
        $location = $this->escapeIcs($event->location ?? '');
        $desc     = $this->escapeIcs(
            'Konfirmasi keikutsertaan Anda pada acara ' . $event->title .
            '. ID RSVP: #' . $rsvp->id
        );
        $organizer = 'mailto:noreply@marhalaty.test';

        return implode("\r\n", [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Marhalaty Dynamic Foundation//ID',
            'CALSCALE:GREGORIAN',
            'METHOD:REQUEST',
            'BEGIN:VEVENT',
            "UID:{$uid}",
            "DTSTAMP:{$now}",
            "DTSTART:{$start}",
            "DTEND:{$end}",
            "SUMMARY:{$summary}",
            "DESCRIPTION:{$desc}",
            "LOCATION:{$location}",
            "ORGANIZER;CN=\"Marhalaty\":{$organizer}",
            'STATUS:CONFIRMED',
            'SEQUENCE:0',
            'END:VEVENT',
            'END:VCALENDAR',
        ]) . "\r\n";
    }

    /**
     * Escape special characters per RFC 5545 section 3.3.11.
     */
    private function escapeIcs(string $value): string
    {
        $value = str_replace(['\\', ';', ',', "\n"], ['\\\\', '\\;', '\\,', '\\n'], $value);
        // Fold long lines at 75 octets
        return wordwrap($value, 75, "\r\n ", true);
    }
}
