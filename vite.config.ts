import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(({ isSsrBuild }) => ({
	build: {
		rollupOptions: isSsrBuild
			? { input: './server/express/app.ts' }
			: undefined,
		target: 'esnext',
		externalImportAttributes: true,
		sourcemap: true,
	},
	plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
}))
