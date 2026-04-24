# Landing TikBoosTTS

Landing page responsive y deslizable para la app **TikBoosTTS** — herramienta para potenciar lives de TikTok con texto a voz, alertas personalizadas, anti-spam y monitoreo de chat.

## Estructura

```
landing-tikboostts/
├─ index.html
├─ css/
│  ├─ styles.css      ← layout, hero, secciones
│  ├─ phones.css      ← marco y pantallas dinámicas
│  └─ alerts.css      ← sección "Alertas personalizadas" + galería de regalos
├─ js/
│  ├─ config.js       ← URLs de descarga y meta de la app
│  ├─ phones.js       ← renderiza widgets-pantalla por <div data-screen="...">
│  ├─ gifts.js        ← popula la galería de regalos desde data/gifts.json
│  └─ main.js         ← carrusel + interacciones
├─ data/
│  └─ gifts.json      ← metadatos curados del catálogo de regalos de TikTok
├─ scripts/
│  └─ fetch-gifts.js  ← parsea tiktok_gift.dart y descarga assets seleccionados
├─ assets/
│  ├─ img/            (logos)
│  ├─ gifts/          ← iconos PNG locales de los regalos (los baja fetch-gifts.js)
│  ├─ screenshots/    (capturas con texto promocional para hero + carrusel)
│  └─ gifs/           (legacy — ya no se usan; "Cómo funciona" usa phones JS)
├─ _headers           ← cache + seguridad (Cloudflare Pages)
├─ _redirects         ← fallback 200 a index.html
├─ wrangler.toml      ← config de Cloudflare Pages
├─ deploy.sh          ← deploy a Cloudflare Pages (bash)
├─ deploy.ps1         ← deploy a Cloudflare Pages (PowerShell)
├─ deploy-gh.sh       ← deploy manual a GitHub Pages (bash)
├─ deploy-gh.ps1      ← deploy manual a GitHub Pages (PowerShell)
├─ .nojekyll          ← evita que GitHub Pages procese con Jekyll
└─ .github/workflows/
   └─ deploy-pages.yml ← GitHub Actions: deploy automático en push a main
```

## Pantallas dinámicas en "Cómo funciona"

La sección **"Cómo funciona"** genera los mockups en runtime con HTML/CSS/JS, basados en los widgets reales de la app — más liviano que GIFs y editable sin Photoshop. El hero y el carrusel siguen usando los screenshots originales.

```html
<div class="phone" data-screen="welcome"></div>
<div class="phone" data-screen="tts-config"></div>
<div class="phone" data-screen="system-config"></div>
<div class="phone" data-screen="live-chat"></div>
<div class="phone" data-screen="live-connected"></div>
```

`js/phones.js` los detecta automáticamente y los renderiza. Para agregar una pantalla nueva: añade una factory en el objeto `SCREENS` dentro del archivo.

## Empaquetar todo en UN solo HTML

```bash
node scripts/build-single.js
```

Genera `dist/tikboostts.html` con CSS, JS, JSON y todas las imágenes embebidas en base64. Es un único archivo portable que se puede:
- Abrir con doble clic (funciona vía `file://`).
- Mandar por email, Slack o Telegram como adjunto.
- Subir a un GitHub Gist o pastebin como HTML render.
- Hospedar en cualquier sitio sin estructura de carpetas.

Tamaño aproximado: **~2.7 MB** (la mayoría son los 23 PNGs de regalos en base64).

Para generar con un nombre/ruta específicos:
```bash
node scripts/build-single.js --out C:/Users/ferna/Desktop/landing.html
```

## Galería de regalos (sección "Alertas")

La sección **#alerts** muestra una selección de regalos del catálogo de TikTok (extraído de `tiktok_gift.dart` del proyecto Flutter). Las imágenes son **locales** — no consultan la CDN de TikTok en runtime.

### Refrescar el catálogo

Cuando el catálogo cambie en la app Flutter, vuelve a correr el fetcher:

```bash
node scripts/fetch-gifts.js
```

El script:
1. Lee `tiktok_gift.dart` (path por defecto: `../flutter/tikboostts_fixed/lib/models/tiktok_gift.dart`).
2. Selecciona ~24 regalos curados (mezcla de tiers de 1, 10, 100, 1000 y 10000 💎).
3. Descarga los PNGs a `assets/gifts/` (omite los que ya tiene en cache).
4. Escribe `data/gifts.json` con los metadatos para que `js/gifts.js` los renderice.

Para cambiar la selección: edita la lista `SELECTED` en `scripts/fetch-gifts.js`.

Para usar un catálogo de otra ruta:

```bash
CATALOG_PATH=/ruta/al/tiktok_gift.dart node scripts/fetch-gifts.js
```

## Ver en local

Es HTML/CSS/JS plano. Doble clic en `index.html`, o sirve el directorio:

```bash
# Cualquiera de estos:
python -m http.server 5173
npx serve .
```

## Personalización rápida

- **Enlace de descarga, Play Store, versión y Android mínimo**: edita `js/config.js`. Todos los botones marcados con `data-download-link` y el meta del footer se rellenan automáticamente.
  - Pon `downloadEnabled: false` (o deja `downloadUrl` vacío) y los botones se mostrarán como **"Próximamente"** desactivados.
- **Colores**: variables `--tt-pink`, `--tt-cyan`, `--tt-purple` en `css/styles.css`.
- **Imágenes**: reemplaza los archivos en `assets/`.
- **Texto**: edita `index.html`.

## Funciones

- **Hero** con dos mockups de teléfono y badge LIVE animado.
- **Carousel de capturas** deslizable (drag, swipe, teclado, autoplay).
- **"Cómo funciona"** con tarjetas horizontales swipeables y GIFs.
- **Grid de funciones** que se adapta de 1 a 3 columnas.
- **Mobile-first** con menú hamburguesa, ajustes desde 320px.
- Respeta `prefers-reduced-motion`.

---

## Despliegue — GitHub Pages

Hay dos formas: **automática con GitHub Actions** (recomendada) o **manual con `deploy-gh.sh`**.

### Opción A — Automática (GitHub Actions)

El workflow ya está incluido en `.github/workflows/deploy-pages.yml`. Cada `git push` a `main` despliega solo.

**Setup desde cero:**

1. **Crea el repo en GitHub** (público para plan free, o privado si tienes GitHub Pro).
2. **Push** del directorio:
   ```bash
   cd /c/developments/landing-tikboostts
   git init
   git add .
   git commit -m "init landing"
   git branch -M main
   git remote add origin git@github.com:USUARIO/REPO.git
   git push -u origin main
   ```
3. En GitHub: **Settings → Pages → Build and deployment → Source = "GitHub Actions"**.
4. Espera ~1 minuto. La URL queda en `https://USUARIO.github.io/REPO/`.

A partir de ahí, cada `git push` lanza el workflow automáticamente. Puedes verlo correr en la pestaña **Actions** del repo.

### Opción B — Manual (`deploy-gh.sh`)

Útil si no quieres GitHub Actions o quieres publicar sin commitear a `main`. Sube los archivos directamente a la rama `gh-pages`.

```bash
./deploy-gh.sh                            # publica con timestamp
./deploy-gh.sh --message "Fix v1.2"
```

PowerShell:
```powershell
.\deploy-gh.ps1
.\deploy-gh.ps1 -Message "Fix v1.2"
```

Lo que hace:
- Verifica Node, npx, git y los archivos clave.
- Excluye archivos de dev (`scripts/`, `dist/`, `node_modules/`, scripts de deploy).
- Usa `npx gh-pages` para empujar a la rama `gh-pages`.
- Imprime la URL esperada (`https://USUARIO.github.io/REPO/`).

**Setup**: en GitHub → **Settings → Pages → Source = "Deploy from a branch" → Branch: gh-pages / (root)**.

### Dominio personalizado en GitHub Pages

1. Crea un archivo `CNAME` en la raíz del repo con tu dominio:
   ```
   tikboostts.com
   ```
2. En tu DNS:
   - **Apex** (`tikboostts.com`): apunta `A` a `185.199.108.153, .109.153, .110.153, .111.153`.
   - **Subdominio** (`www.tikboostts.com`): apunta `CNAME` a `USUARIO.github.io`.
3. En GitHub: **Settings → Pages → Custom domain → tikboostts.com**, espera la verificación, marca **Enforce HTTPS**.

### Notas sobre archivos específicos

- **`.nojekyll`** (incluido) — le dice a GitHub Pages que NO procese los archivos con Jekyll, así sirve `_headers` y otros archivos con guion bajo tal cual (aunque GH Pages los ignora en runtime).
- **`_headers` y `_redirects`** — son específicos de Cloudflare/Netlify. GitHub Pages NO los lee. La caché en GH Pages se controla desde sus headers por defecto (10 min para HTML, mayor para assets con hash).
- **`wrangler.toml`** — específico de Cloudflare; en GitHub Pages se ignora.

---

## Despliegue — Cloudflare Pages

**Recomendado: Cloudflare Pages.** Es gratis, ancho de banda ilimitado, CDN global con buena latencia desde LATAM y HTTPS+dominio personalizado en un clic. No pide tarjeta para el plan free.

### Setup desde cero (una sola vez, ~10 minutos)

#### 1) Crea cuenta en Cloudflare
- Ve a **https://dash.cloudflare.com/sign-up**
- Email + contraseña. **No pide tarjeta** para el plan free.
- Confirma el email.

#### 2) Instala Node.js
- Descarga el instalador LTS desde **https://nodejs.org/** (Windows: el .msi).
- Acepta los defaults. Esto instala `node`, `npm` y `npx`.
- Verifica abriendo una terminal nueva:
  ```
  node --version    # debería imprimir v20.x o superior
  npx --version
  ```

#### 3) Primer deploy
Desde `landing-tikboostts/`:

```bash
# Linux / macOS / Git Bash en Windows:
./deploy.sh

# O en PowerShell:
.\deploy.ps1
```

La primera vez:
- El script ejecuta `wrangler login` y abre tu navegador.
- Acepta los permisos en Cloudflare ("Allow").
- Vuelves a la terminal y el deploy continúa solo.
- Crea automáticamente el proyecto `tikboostts` en tu cuenta.
- Al final imprime la URL preview, algo como `https://abc123.tikboostts.pages.dev`.

#### 4) Promueve a producción
Cuando todo se vea bien en preview:
```bash
./deploy.sh --prod                # te pedirá tipear "tikboostts" para confirmar
```
Esto publica a la URL estable: `https://tikboostts.pages.dev`.

### Comandos del día a día

#### Linux / macOS / Git Bash en Windows

```bash
./deploy.sh                   # preview (URL única por deploy)
./deploy.sh --prod            # producción (con confirmación)
./deploy.sh --prod --yes      # producción sin confirmación (CI)
./deploy.sh --project nombre  # cambia el proyecto en Cloudflare
./deploy.sh --help            # ayuda
```

#### Windows nativo (PowerShell)

```powershell
.\deploy.ps1                  # preview
.\deploy.ps1 -Prod            # producción (con confirmación)
.\deploy.ps1 -Prod -Yes       # producción sin confirmación
.\deploy.ps1 -Project "nombre"
```

### Qué hace el script

1. Verifica Node y `npx`.
2. Valida que existan los archivos clave (`index.html`, `css/`, `js/`, `_headers`, `_redirects`).
3. Te avisa si `js/config.js` aún tiene la URL placeholder (`example.com`).
4. Hace login en Cloudflare la primera vez (abre el navegador).
5. Pide confirmación tipeando el nombre del proyecto antes de un deploy a producción.
6. Sube todo con `wrangler pages deploy` y te imprime la URL.

### URLs resultantes

- **Preview**: `https://<hash>.tikboostts.pages.dev` (única por deploy, pensada para previews/QA).
- **Producción**: `https://tikboostts.pages.dev` (URL estable).

### Dominio personalizado (opcional)

1. Compra un dominio (Cloudflare Registrar es buena opción — al costo).
2. En el dashboard: **Pages → tikboostts → Custom domains → Set up a custom domain**.
3. Si el dominio ya está en Cloudflare, se configura solo. Si no, te dan los DNS records.
4. HTTPS automático con Let's Encrypt.

### Cache

`_headers` ya está configurado:
- HTML: 1 hora.
- CSS / JS: 1 día.
- Imágenes / GIFs / logos: 30 días `immutable`.

Si cambias un asset, **renómbralo o cambia su path** para invalidar cache. Alternativa: desde el dashboard de Cloudflare puedes purgar cache manualmente.

### Alternativas si Cloudflare Pages no te sirve

| Opción              | Pros                                | Contra                              |
|---------------------|-------------------------------------|--------------------------------------|
| **GitHub Pages**    | Gratis, integra con git push        | Solo repos públicos en plan free     |
| **Netlify**         | UX excelente, formularios gratis    | 100 GB/mes de ancho de banda free    |
| **Vercel**          | Deploys ultra rápidos               | 100 GB/mes free, agresivo en límites |
| **Surge.sh**        | El más simple (`surge .`)           | Sin custom domain en plan free       |

Si migras, los archivos `_headers` y `_redirects` son específicos de Cloudflare/Netlify; los otros hosts requieren reescribirlos.
#   t i k b o o s t t s  
 