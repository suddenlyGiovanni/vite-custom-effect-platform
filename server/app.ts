import express from 'express'
import { createRequestHandler } from './adapters/express.ts'

const app = express()

app.use(
	createRequestHandler({
		// @ts-expect-error - virtual module provided by React Router at build time
		build: () => import('virtual:react-router/server-build'),
		getLoadContext() {
			return {
				VALUE_FROM_EXPRESS: 'Hello from Express',
			}
		},
	}),
)

export default app
