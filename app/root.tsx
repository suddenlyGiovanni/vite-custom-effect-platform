import {
	Outlet,
	Scripts,
	ScrollRestoration,
	href,
	isRouteErrorResponse,
	redirect,
} from 'react-router'

import type { Route } from './+types/root'
import appStylesHref from './app.css?url'
import { createEmptyContact } from './data.ts'

export async function action() {
	const contact = await createEmptyContact()
	return redirect(href('/contacts/:contactId/edit', { contactId: contact.id }))
}

export default function App(_: Route.ComponentProps) {
	return <Outlet />
}

// The Layout component is a special export for the root route.
// It acts as your document's "app shell" for all route components, HydrateFallback, and ErrorBoundary
// For more information, see https://reactrouter.com/explanation/special-files#layout-export
export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="stylesheet" href={appStylesHref} />
				<script
					crossOrigin="anonymous"
					src="//unpkg.com/react-scan/dist/auto.global.js"
				/>
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	)
}

// The top most error boundary for the app, rendered when your app throws an error
// For more information, see https://reactrouter.com/start/framework/route-module#errorboundary
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = 'Oops!'
	let details = 'An unexpected error occurred.'
	let stack: string | undefined

	console.error(error)

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? '404' : 'Error'
		details =
			error.status === 404
				? 'The requested page could not be found.'
				: error.statusText || details
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message
		stack = error.stack
	}

	return (
		<main id="error-page">
			<h1>{message}</h1>
			<p>{details}</p>
			{stack && (
				<pre>
					<code>{stack}</code>
				</pre>
			)}
		</main>
	)
}

export function HydrateFallback() {
	return (
		<div id="loading-splash">
			<div id="loading-splash-spinner" />
			<p>Loading, please wait...</p>
		</div>
	)
}
