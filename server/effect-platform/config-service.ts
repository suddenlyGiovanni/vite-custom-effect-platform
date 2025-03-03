import { Config, Effect } from 'effect'

export class ConfigService extends Effect.Service<ConfigService>()(
	'app/ConfigService',
	{
		effect: Effect.gen(function* () {
			const NODE_ENV = yield* Config.string('NODE_ENV').pipe(
				Config.withDefault('production'),
			)
			const PORT = yield* Config.number('PORT').pipe(Config.withDefault(3000))

			return { NODE_ENV, PORT }
		}),
	},
) {}
