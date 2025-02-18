import 'react-router'
import express from 'express'
import { createRequestHandler } from './adapters/express.ts'

declare module 'react-router' {
	interface AppLoadContext {
		VALUE_FROM_EXPRESS: string
	}
}

export const app = express()

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
