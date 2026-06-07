# fin-optics-ui

The front end for **FIN OPTICS** — a financial projection tool. Enter your
assets, income, expenditure and liabilities, and see net worth and cash position
projected decades ahead, in both nominal and inflation-adjusted terms.

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
  (this repo)               (Spring Boot)                  (Java engine)
```

## License

[MIT](LICENSE)
