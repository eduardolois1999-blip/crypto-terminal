# 🪙 Crypto Terminal — Dashboard Interactivo

Dashboard de criptomonedas en tiempo real construido con HTML, CSS y JavaScript puro, usando **Chart.js** para los gráficos y la **API pública de CoinGecko** como fuente de datos.

---

## 📸 Capturas de pantalla

> *(Agrega aquí tus screenshots arrastrándolos al editor de GitHub)*

---

## ⚙️ Cómo configurar y ejecutar la aplicación

### Opción 1 — Abrir directamente (sin instalar nada)

1. Descarga o clona este repositorio:
   ```bash
   git clone https://github.com/TU_USUARIO/crypto-terminal.git
   ```
2. Abre el archivo `index.html` en tu navegador.

Eso es todo. No requiere Node.js, npm ni ninguna instalación adicional.

### Opción 2 — Servidor local (recomendado para que la API funcione en Chrome)

Si el navegador bloquea las peticiones desde `file://`, usa un servidor local simple:

```bash
# Con Python (viene instalado en Mac y Linux)
cd crypto-terminal
python3 -m http.server 3000
```

Luego abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Opción 3 — Ver la demo en vivo

🔗 **[Ver demo desplegada](https://TU-LINK.netlify.app)**

---

## 💡 Enfoque adoptado

El objetivo principal fue construir un dashboard que funcione siempre, sin importar si la API está disponible o no.

**Estrategia de carga en dos pasos:**

1. Al abrir la página, se renderizan inmediatamente datos mock realistas. El usuario ve el dashboard completo desde el primer instante, sin pantallas de carga ni errores.
2. En segundo plano, se intenta conectar con la API de CoinGecko. Si responde correctamente, los datos se actualizan en silencio y el indicador del header cambia de 🟡 *Demo data* a 🟢 *Updated HH:MM*. Si la API falla, el mock data permanece visible sin mostrar ningún mensaje de error al usuario.

**Otras decisiones técnicas:**

- **Chart.js vía CDN** — se eligió sobre Recharts porque funciona en HTML puro sin necesidad de un bundler o build step, lo que hace el proyecto ejecutable con doble clic.
- **Space Mono para números** — fuente monoespaciada para que los precios no hagan saltar el layout al actualizarse.
- **Muestreo de datos** — rangos largos como 1Y pueden devolver 2000+ puntos de la API. Se samplea a máximo 120 puntos para mantener los gráficos fluidos sin perder la forma visual de la curva.
- **Timeout de 7 segundos** — cada petición a la API se cancela si no responde en 7s, evitando que la UI quede bloqueada.
- **Auto-refresh cada 60s** — mantiene los precios actualizados respetando el rate limit de CoinGecko (~30 req/min en el tier gratuito).

---

## ⚠️ Suposiciones y problemas conocidos

**Suposiciones realizadas:**

- Se asume que el usuario tiene conexión a internet para cargar las fuentes de Google y Chart.js desde CDN. Sin conexión, los gráficos no se renderizan.
- Los precios del mock data son aproximaciones de valores reales y solo sirven como placeholder visual, no como referencia financiera.

**Problemas conocidos:**

| Problema | Causa | Solución |
|---|---|---|
| La API no carga datos en vivo al abrir `index.html` directamente | Chrome bloquea peticiones `fetch` desde `file://` por política CORS | Usar un servidor local (`python3 -m http.server`) o ver la demo desplegada |
| Datos desfasados en el mock | Los precios mock están hardcodeados y no reflejan valores actuales | Se actualiza automáticamente si la API de CoinGecko está disponible |
| Error 429 al cambiar rangos rápidamente | CoinGecko limita a ~30 req/min en el tier gratuito | El dashboard cae silenciosamente a mock data hasta que el límite se resetea |
