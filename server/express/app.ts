import { createRequestHandler } from '../adapters/express.ts'

export function createExpressRequestHandlerAdapter() {
	return createRequestHandler({
		// @ts-expect-error - virtual module provided by React Router at build time
		build: () => import('virtual:react-router/server-build'),
		getLoadContext() {
			return {
				VALUE_FROM_EXPRESS: 'Hello from Express',
			}
		},
	})
}
