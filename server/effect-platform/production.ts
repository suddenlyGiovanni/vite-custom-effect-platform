import { HttpRouter } from '@effect/platform'
import { Effect } from 'effect'

import {
	PublicAssetsMiddleware,
	StaticAssetsMiddleware,
} from './middlewares/assets-middleware.ts'

export const Production = HttpRouter.empty.pipe(
	HttpRouter.all(
		'*',
		Effect.gen(function* () {
			const module = yield* Effect.promise(
				() =>
					// @ts-expect-error - This is a dynamic import of build stuff
					import('../../build/server/index.js') as Promise<
						typeof import('./handler.ts')
					>,
			)
			return yield* module.handler
		}),
	),
	HttpRouter.use(StaticAssetsMiddleware),

	HttpRouter.use(PublicAssetsMiddleware),
)
