import type express from 'express'

const viteDevServer = await import('vite').then((vite) =>
	vite.createServer({ server: { middlewareMode: true } }),
)

const reactRouterRequestHandler = await (
	viteDevServer.ssrLoadModule('./server/express/app.ts') as Promise<
		typeof import('./app.ts')
	>
).then(({ createExpressRequestHandlerAdapter }) =>
	createExpressRequestHandlerAdapter(),
)

export async function developmentApp(
	app: express.Express,
): Promise<express.Express> {
	console.log('Starting development server')

	return app
		.use(viteDevServer.middlewares) //
		.use(async (req, res, next) => {
			try {
				return await reactRouterRequestHandler(req, res, next)
			} catch (error) {
				if (typeof error === 'object' && error instanceof Error) {
					viteDevServer.ssrFixStacktrace(error)
				}
				next(error)
			}
		})
}
