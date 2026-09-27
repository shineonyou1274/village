# Polling optimization

Scope: browser request scheduling only. No schema, scoring, day, inventory or study-time calculation changes.

- Completion-based randomized schedules: classroom/campus 10–15 seconds plus response time; visible growth records 30–40 seconds plus response time. One poll does not schedule its successor until completion.
- Multiple overlapping classroom refresh calls share one in-flight request.
- Farm writes invalidate growth records but do not eagerly refetch hidden badges/quiz/donation data. Activity, passport and market entry refresh stale/invalidated data; explicit career actions still request their records.
- Initial growth read is retained. Periodic growth reads stop on farm/study screens. Farm state polling remains necessary for teacher pause/weather/date changes.
- Campus study heartbeat stays enabled for existing sessions even when the document is hidden, subject to normal browser throttling and the unchanged server's 45-second cutoff.

Before/after browser assertions: plant+water caused two growth reads → zero; five overlapping state refresh calls caused five requests → one. Entering activity now refreshes its records. Unit tests verify scheduling jitter, visibility policy and no rescheduling during unresolved requests.

The unchanged HTTP 120-user load harness bypasses frontend scheduling. Its latency comparison is a server regression check, not proof that this frontend change sped up an individual SQL query. Request-count reduction is established separately by the browser tests.
