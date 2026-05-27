import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

let commitHash = 'unknown'
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim()
} catch (e) {
  // Safe fallback if git is not installed/configured
}

const buildTime = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(`v2.0.4-${commitHash} (${buildTime})`),
  }
})
