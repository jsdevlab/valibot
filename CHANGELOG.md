# @jsdevlab/valibot

## 1.0.1

### Patch Changes

- [`3e03dd8`](https://github.com/jsdevlab/valibot/commit/3e03dd85eadfed9eb3e97936ffcb7e2de7b76ee1) Thanks [@hushink](https://github.com/hushink)! - Fix the dual-format build and declarations (ESM + CJS + `.d.cts`), honor container/date/number constraints and `nonEmpty`/`empty`, generate additional valibot string formats correctly (`cuid2`, `isoWeek`, `isoTime`, `isoTimestamp`, `hash`, Luhn-valid `imei`), export the exception classes as runtime values, preserve the caller's global faker state, and add English/Chinese documentation.
