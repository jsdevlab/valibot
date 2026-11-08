# @jsdevlab/valibot

## 1.1.0

### Minor Changes

- [`1558331`](https://github.com/jsdevlab/valibot/commit/15583311f1fba5096c73bd32450f36ea279d10b5) Thanks [@hushink](https://github.com/hushink)! - Add browser support with a web-targeted ES2022 build and real-browser tests, upgrade Rslib to 1.x and Rstest to 0.12, and refresh the agent skills and documentation.

## 1.0.1

### Patch Changes

- [`3e03dd8`](https://github.com/jsdevlab/valibot/commit/3e03dd85eadfed9eb3e97936ffcb7e2de7b76ee1) Thanks [@hushink](https://github.com/hushink)! - Fix the dual-format build and declarations (ESM + CJS + `.d.cts`), honor container/date/number constraints and `nonEmpty`/`empty`, generate additional valibot string formats correctly (`cuid2`, `isoWeek`, `isoTime`, `isoTimestamp`, `hash`, Luhn-valid `imei`), export the exception classes as runtime values, preserve the caller's global faker state, and add English/Chinese documentation.
