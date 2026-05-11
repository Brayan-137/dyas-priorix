# Pruebas del Frontend

- **Unitarias:** `tests/unit/` con Vitest
- **E2E:** `tests/e2e/` con Playwright
- **Interfaz gráfica:** `tests/gui/` con Testing Library
- **Carga:** `tests/load/` con Artillery
- **APIs:** `tests/api/` con Axios/Jest

## Comandos sugeridos

- Ejecutar pruebas unitarias:
  ```sh
  npx vitest
  ```
- Ejecutar pruebas E2E:
  ```sh
  npx playwright test
  ```
- Ejecutar pruebas de interfaz:
  ```sh
  npx vitest run tests/gui
  ```
- Ejecutar pruebas de carga:
  ```sh
  npx artillery run tests/load/example.load.yml
  ```
- Ejecutar pruebas de APIs:
  ```sh
  npx vitest run tests/api
  ```
