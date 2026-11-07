---
'@jsdevlab/valibot': patch
---

Fix the dual-format build and declarations (ESM + CJS + `.d.cts`), honor container/date/number constraints and `nonEmpty`/`empty`, generate additional valibot string formats correctly (`cuid2`, `isoWeek`, `isoTime`, `isoTimestamp`, `hash`, Luhn-valid `imei`), export the exception classes as runtime values, preserve the caller's global faker state, and add English/Chinese documentation.
