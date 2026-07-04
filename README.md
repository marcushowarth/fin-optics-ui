# fin-optics-ui

The front end for **FIN OPTICS** — a financial projection tool. Enter your
assets, income, expenditure, liabilities and one-off events, and see net worth and
cash position projected decades ahead, in both nominal and inflation-adjusted terms.

Built on the [`fin-optics-api`](https://github.com/marcushowarth/fin-optics-api)
service, which wraps the [`fin-model`](https://github.com/marcushowarth/fin-model)
calculation engine.

## Features

- **Stepped item entry** — add each financial item through a short guided flow
  (type & name → timing → amounts), so date fields default sensibly off one
  another instead of fighting a dense form
- **Edit in place** — every item can be reopened and revised through the same
  flow; the list highlights the one being edited
- **Projection charts** — net worth and cash position over time (ECharts), with a
  nominal line plus one real-terms line per inflation scenario, so you can see
  inflation eroding real value
- **Solvency warnings** — months where cash goes negative are shaded red on the
  cash chart against a zero reference line, with a banner naming the first breach.
  Nothing is gated — the projection runs and shows you the problem
- **Plans survive a refresh** — items, scenarios and the projection window are
  auto-saved to `localStorage` and restored on load, so reloading the tab keeps
  your plan. The API stays stateless — all persistence is client-side
- **Import / export** — save the whole plan (items + scenarios + dates) to a JSON
  file and load it back, so you can keep plan A vs B, share, or version a plan in
  git

## Stack

Vue 3 (`<script setup>`) · TypeScript · Vite · Pinia · ECharts (via `vue-echarts`)
· Axios.

## Develop

Requires Node 22+ (Vite 8).

```bash
npm install
npm run dev        # http://localhost:5173
```

The dev server proxies `/api` to the back end on `http://localhost:8090`, so
**[`fin-optics-api`](https://github.com/marcushowarth/fin-optics-api) needs to be
running** for projections to return.

```bash
npm run build      # type-check (vue-tsc) + production build
npm run preview    # serve the production build
```

## How it fits together

```
fin-optics-ui  ──HTTP──▶  fin-optics-api  ──depends on──▶  fin-model
  (this repo)             (Quarkus-native)                 (Java engine)
```

## Privacy

Nothing you enter is stored on the server — `fin-optics-api` has no database
and no session; it computes a projection from the request and returns it.
Plans you save persist client-side only (`localStorage` / exported JSON files
— see Features above), never sent anywhere but to the API to compute results.

Verified, not just asserted: the API has no access-log configuration
(Quarkus's HTTP access log is opt-in and disabled here), and the Caddy site
block in front of it has no `log` directive — neither logs the request body,
or anything else, for this service.

This tool is illustrative only and not financial advice.

## License

[MIT](LICENSE)
