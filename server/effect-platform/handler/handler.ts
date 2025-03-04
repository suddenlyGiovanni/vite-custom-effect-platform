import type { HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { Effect } from 'effect'

import { createHttpHandler } from '../react-router-adapters/index.ts'
import { ConfigService } from '../services/config-service.ts'

export const handler: Effect.Effect<
	HttpServerResponse.HttpServerResponse,
	never,
	HttpServerRequest.HttpServerRequest | ConfigService
> = ConfigService.pipe(
	Effect.andThen((config) => config.NODE_ENV),
	Effect.andThen((NODE_ENV) =>
		createHttpHandler({
			// @ts-expect-error - This is a dynamic import of build stuff
			build: () => import('virtual:react-router/server-build'), // TODO: should change this api to an effect!
			getLoadContext: () => ({ VALUE_FROM_EXPRESS: 'Hello from Express' }),
			mode: NODE_ENV,
		}),
	),
)
