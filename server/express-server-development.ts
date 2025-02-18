import type express from 'express'

export default async function develop(
	app: express.Express,
): Promise<express.Express> {
	console.log('Starting development server')

	const viteDevServer = await import('vite').then((vite) =>
		vite.createServer({
			server: { middlewareMode: true },
		}),
	)

	app.use(viteDevServer.middlewares)

	app.use(async (req, res, next) => {
		try {
			const source = await viteDevServer.ssrLoadModule('./server/app.ts')
			return await source['app'](req, res, next)
		} catch (error) {
			if (typeof error === 'object' && error instanceof Error) {
				viteDevServer.ssrFixStacktrace(error)
			}
			next(error)
		}
	})

	return app
}
