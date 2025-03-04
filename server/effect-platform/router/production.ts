import { HttpRouter } from '@effect/platform'
import { Effect } from 'effect'

import {
	PublicAssetsMiddleware,
	StaticAssetsMiddleware,
} from '../middlewares/assets-middleware.ts'

export const Production = HttpRouter.empty.pipe(
	HttpRouter.all(
		'*',
		Effect.promise(() => {
			// @ts-expect-error - This is a dynamic import of build stuff
			return import('../../../build/server/index.js') as Promise<
				typeof import('../handler/handler.ts')
			>
		}).pipe(Effect.flatMap((module) => module.handler)),
	),

	HttpRouter.use(StaticAssetsMiddleware),

	HttpRouter.use(PublicAssetsMiddleware),
)
