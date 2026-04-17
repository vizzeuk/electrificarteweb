# Setup en Mac — Electrificarte

Guía completa para continuar el desarrollo en un Mac nuevo.

---

## ⚠️ Lo primero: NO descargues el ZIP desde GitHub

El ZIP no tiene historial de git ni conexión al repositorio remoto. No podrías hacer commits ni push. Usa `git clone` como se explica abajo — tarda lo mismo.

---

## Antes de cerrar el PC Windows

Copia estos datos a algún lugar seguro (Notes, iCloud, etc.) antes de apagar:

- El contenido de tu `.env.local` (está en la raíz del proyecto, nunca se sube a GitHub)
- Los valores que necesitas:
  - `NEXT_PUBLIC_SANITY_PROJECT_ID` → `wd30r9b0`
  - `NEXT_PUBLIC_SANITY_DATASET` → `production`
  - `SANITY_API_TOKEN` → tu token de escritura de Sanity
  - `N8N_CONTACT_URL` → la URL de tu webhook de n8n

---

## Instalaciones necesarias

### 1. Homebrew
Abre la app Terminal y ejecuta:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
Al terminar, el instalador imprime **dos líneas** para agregar Homebrew al PATH — ejecútalas, no las saltes. Luego cierra y vuelve a abrir Terminal.

Verifica:
```bash
brew --version
```

---

### 2. Node.js 22
```bash
brew install node@22
echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```
Verifica:
```bash
node --version   # debe mostrar v22.x.x
npm --version
```

---

### 3. Git
Mac ya trae git, pero actualízalo:
```bash
brew install git
```
Configura tu identidad (usa el mismo email de GitHub):
```bash
git config --global user.name "Tu Nombre"
git config --global user.email "contacto@electrificarte.com"
```

---

### 4. VS Code
1. Descarga desde https://code.visualstudio.com
2. Instala arrastrando a Aplicaciones
3. Ábrelo, luego `Cmd+Shift+P` → escribe `Shell Command: Install 'code' in PATH` → Enter

Verifica:
```bash
code --version
```

---

### 5. Claude Code (extensión de VS Code)
1. En VS Code abre Extensiones (`Cmd+Shift+X`)
2. Busca **Claude Code** (de Anthropic)
3. Instala y haz login con tu misma cuenta de Anthropic

La extensión funciona exactamente igual que en Windows. El contexto del proyecto está guardado en `CLAUDE.md` — Claude lo lee automáticamente.

---

## Setup del proyecto

### 6. Clonar el repositorio
```bash
mkdir ~/Dev
cd ~/Dev
git clone https://github.com/vizzeuk/electrificarteweb.git electrificarte-web
cd electrificarte-web
```

### 7. Instalar dependencias
```bash
npm install
```

### 8. Crear el archivo de variables de entorno
```bash
touch .env.local
code .env.local
```
Pega esto y rellena con los valores que copiaste del PC:
```
NEXT_PUBLIC_SANITY_PROJECT_ID=wd30r9b0
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=pega_tu_token_aqui
N8N_CONTACT_URL=pega_tu_url_aqui
```
Guarda el archivo (`Cmd+S`).

### 9. Arrancar el proyecto
```bash
npm run dev
```
Abre http://localhost:3000 — deberías ver la web funcionando.

---

## Cómo usar Claude Code en el proyecto

Abre la carpeta del proyecto en VS Code:
```bash
cd ~/Dev/electrificarte-web
code .
```
Luego abre Claude Code con el ícono en la barra lateral o `Cmd+Shift+P` → "Claude Code".

**En tu primera sesión en Mac**, Claude empieza sin historial pero lee el código y el `CLAUDE.md` automáticamente. Puedes decirle:
> *"Estoy continuando el desarrollo de Electrificarte. Lee el CLAUDE.md para ponerte en contexto."*

La memoria del proyecto se reconstruye sola con el uso.

---

## Stack del proyecto (referencia rápida)

| Tecnología | Versión | Para qué |
|---|---|---|
| Next.js | 16.2.2 | Framework principal (App Router) |
| React | 19.2.4 | UI |
| Tailwind CSS | v4 | Estilos |
| Framer Motion | 12 | Animaciones |
| Sanity | v5 | CMS (contenido, imágenes, datos) |
| TypeScript | - | Tipado |

---

## Scripts útiles del proyecto

```bash
# Ejecutar cualquier script de datos contra Sanity
npx tsx --env-file=.env.local scripts/[nombre-del-script].ts

# Verificar logos subidos
npx tsx --env-file=.env.local scripts/check-logos.ts

# Subir logos (poner archivos PNG en public/logos_electrificarte/)
npx tsx --env-file=.env.local scripts/upload-logos.ts
```

---

## Pendientes del proyecto

- [ ] Reemplazar WhatsApp hardcodeado `+56912345678` en `components/layout/Navbar.tsx`
- [ ] Actualizar `N8N_CONTACT_URL` en Vercel con URL de producción (sin `-test`)
- [ ] Subir logos de: DFSK, Deepal, GAC, GWM, Jaecoo, MINI, Nammi, Ora, Riddara, Skoda, Ssangyong
- [ ] Subir imágenes de 10 autos sin foto (Tesla Model Y, Chevrolet Blazer/Bolt/Equinox/Spark, etc.)
