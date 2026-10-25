import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves a project site from /<repo>/; a <user>.github.io repo is served from the root.
const repo = process.env.GITHUB_ACTIONS ? process.env.GITHUB_REPOSITORY?.split('/')[1] : undefined
const base = repo && !repo.endsWith('.github.io') ? `/${repo}/` : '/'

export default defineConfig({ base, plugins: [react()] })
