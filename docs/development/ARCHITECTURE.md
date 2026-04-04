# Backend Architecture

## Goal
Menjaga backend tetap mudah di-scale, mudah di-debug, dan aman saat banyak developer bekerja paralel.

## Current Runtime Layout

```text
src/
  server.js            # composition root: wiring app, middleware, routes, bootstrap
  config/              # environment + infrastructure config (db, etc)
  modules/             # domain module registry (name/basePath/router/description)
  routes/              # HTTP boundary (routing)
  controller/          # use-case orchestration
  schema/              # data model + ORM relations
  services/            # integration to external systems (AI, Telegram)
  middleware/          # cross-cutting middleware
  shared/              # shared constants/http helpers/error middleware
  utils/               # shared low-level helpers
```

## Layer Rules

1. `routes` hanya memanggil `controller`/`middleware`.
2. `controller` tidak langsung tahu detail HTTP selain `req/res`.
3. `modules` hanya menyimpan wiring metadata, bukan business logic.
4. `schema` tidak bergantung pada `routes` atau `controller`.
5. `services` dipakai melalui `controller`, bukan langsung dari `routes`.
6. `shared` untuk cross-cutting concern, bukan domain concern.
7. `utils` harus generic dan reusable, tidak berisi logic domain.

## Compatibility

- Root `app.js` tetap ada sebagai bootstrap agar `npm start`/`npm run dev` tidak berubah.
- Root `config/database.js` dan `swagger.js` dijadikan shim kompatibilitas untuk script lama.

## Next Refactor (Recommended)

1. Ubah `controller` -> `controllers` (konsisten plural).
2. Migrasi implementasi domain bertahap dari `routes/controller` ke dalam module folder:
   - `src/modules/posts/{routes,controller,service,repository}`
   - `src/modules/users/{...}`
3. Tambahkan test pyramid:
   - unit test (service/repository)
   - integration test (routes + db test container)
