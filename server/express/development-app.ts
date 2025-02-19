import type express from 'express'

export async function developmentApp(
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
			const reactRouterMiddleware = await (
				viteDevServer.ssrLoadModule('./server/express/app.ts') as Promise<
					typeof import('./app.ts')
				>
			).then((mod) => mod.default)

			return await reactRouterMiddleware(req, res, next)
		} catch (error) {
			if (typeof error === 'object' && error instanceof Error) {
				viteDevServer.ssrFixStacktrace(error)
			}
			next(error)
		}
	})

	return app
}
