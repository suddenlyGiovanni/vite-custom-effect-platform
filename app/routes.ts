import { type RouteConfig, route } from '@react-router/dev/routes'

export default [
	route('contacts/:contactId', 'routes/contact.tsx'),
] satisfies RouteConfig
