import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(({ isSsrBuild }) => ({
	build: {
		rollupOptions: isSsrBuild
			? { input: './server/effect-platform/handler/handler.ts' }
			: undefined,
		target: 'esnext',
		minify: false,
		externalImportAttributes: true,
		sourcemap: true,
	},
	plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
	test: {
		globals: false,
		environment: 'node',
		dir: './server/',
		includeSource: ['**/*.ts'],
		include: ['**/*.{test,spec}.ts'],
	},
	define: {
		'import.meta.vitest': 'undefined',
	},
}))
