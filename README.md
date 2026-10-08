# property-catalog-portal

> catalog bounded context: web UI (remote)

Part of the **Property** distributed system — Grupo 2 · Angular 21 (zoneless) · Native Federation 21 · Node 22 or 24.
Documentation: [`property-docs`](https://github.com/code-corhuila/property-docs), `12-ux-ui/navigation-map.md` and `design-system.md`.

## How the container mounts it

| Federation name | Local address | Exposed module | Exports |
|---|---|---|---|
| `catalog` | `http://localhost:4201` | `./routes` → `src/app/catalog/catalog.routes.ts` | `EXPLORE_ROUTES` (`/explorar`), `PROPERTY_ROUTES` (`/propiedades/:propiedadId`) |

**This portal never calls `provideHttpClient()`.** Mounted in `property-front`, it runs inside the container's
injector and receives its client with the interceptor (gateway URL, token, `X-Correlation-Id`, time limit,
one error shape: `src/app/shell-contract.ts`). A client of its own would send requests without the interceptor.

`package.json` and `package-lock.json` hold the same versions as `property-front`: the
shared libraries are strict singletons, so a different Angular does not load.

## Install, build, test and run

```bash
npm ci          # installs exactly what package-lock.json records
npm run build   # dist/catalog; also rewrites tsconfig.federation.json
npm test        # unit tests, one run (Vitest)
npm start       # http://localhost:4201/remoteEntry.json
```

Inside the container: run `npm start` here and in `property-front`, sign in at `http://localhost:4200` and open
`/explorar`. `deploy/` builds the image (`npm ci`, then nginx) as the service `catalog-portal` on `platform`.

## See it with test data

Until `property-api-gateway` and `property-catalog-api` exist, `dev/mock-api.mjs` (development
only, Node with no dependencies, outside `src/`) answers `GET /api/v1/propiedades` and
`GET /api/v1/propiedades/{id}` on port 8080, the gateway's, with 24 properties and the errors of the contract.

```bash
npm run mock                            # 1. test data, http://localhost:8080
npm start                               # 2. this portal, http://localhost:4201
cd ../property-front && npm start       # 3. the container, http://localhost:4200
```

## Branching

Three permanent branches. **None of them accepts a direct commit** — you enter through a child
branch and leave through a Pull Request.

```
develop  <--PR--  feat/... fix/... chore/...
qa       <--PR--  qa/...
main     <--PR--  release/...  hotfix/...
```

Promotion happens **by re-application** (`git cherry-pick -x`), never by merging one permanent
branch into another: `merge develop -> qa` and `merge qa -> main` do not exist in this model.

`main` requires **1 approval from `ariel5253`**. On `develop` and `qa` the team sets its own review
rule.

Full policy: `00-governance/branching-policy.md` in `property-docs`.
