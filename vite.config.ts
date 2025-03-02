import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(({ isSsrBuild }) => ({
	build: {
		rollupOptions: isSsrBuild
			? { input: './server/effect-platform/handler.ts' }
			: undefined,
		target: 'esnext',
		minify: false,
		externalImportAttributes: true,
		sourcemap: true,
	},
	plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
}))
