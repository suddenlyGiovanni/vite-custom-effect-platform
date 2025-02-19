import compression from 'compression'
import { pipe } from 'effect'
import express from 'express'
import morgan from 'morgan'
import { developmentApp } from './development-app.ts'
import { productionApp } from './production-app.ts'

const PORT = Number.parseInt(process.env['PORT'] || '3000')

const isDevelopment = process.env['NODE_ENV'] === 'development'

pipe(
	express()
		.use(compression())
		.disable('x-powered-by')
		.use(morgan(isDevelopment ? 'dev' : 'tiny')), //
	async (app) =>
		isDevelopment ? await developmentApp(app) : await productionApp(app),
	(promise) =>
		promise.then((app) =>
			app.listen(PORT, () =>
				console.log(`Server is running on http://localhost:${PORT}`),
			),
		),
)
