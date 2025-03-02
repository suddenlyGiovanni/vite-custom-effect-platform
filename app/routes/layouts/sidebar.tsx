import { getContacts } from 'app/data.ts'
import { type FormEventHandler, useCallback, useEffect } from 'react'
import {
	Form,
	Link,
	NavLink,
	Outlet,
	href,
	useNavigation,
	useSubmit,
} from 'react-router'
import type { Route } from './+types/sidebar'

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const q = url.searchParams.get('q')
	const contacts = await getContacts(q)
	return { contacts, q }
}

export default function SidebarLayout({ loaderData }: Route.ComponentProps) {
	const { contacts, q } = loaderData
	const navigation = useNavigation()
	const submit = useSubmit()

	useEffect(() => {
		const searchField = document.getElementById('q')
		if (searchField instanceof HTMLInputElement) {
			searchField.value = q || ''
		}
	}, [q])

	const searching = Boolean(
		navigation.location &&
			new URLSearchParams(navigation.location.search).has('q'),
	)
	const handleSearchChange: FormEventHandler<HTMLFormElement> = useCallback(
		(event) => {
			const isFirstSearch = q === null
			return submit(event.currentTarget, {
				replace: !isFirstSearch,
			})
		},
		[submit],
	)

	return (
		<>
			<div id="sidebar">
				<h1>
					<Link to={href('/about')}>React Router Contacts</Link>
				</h1>
				<div>
					<Form id="search-form" role="search" onChange={handleSearchChange}>
						<input
							aria-label="Search contacts"
							className={searching ? 'loading' : ''}
							defaultValue={q || ''}
							id="q"
							name="q"
							placeholder="Search"
							type="search"
						/>
						<div aria-hidden hidden={!searching} id="search-spinner" />
					</Form>
					<Form method="post">
						<button type="submit">New</button>
					</Form>
				</div>
				<nav>
					<ul>
						{contacts.map((contact) => (
							<li key={contact.id}>
								<NavLink
									className={({ isActive, isPending }) =>
										isActive ? 'active' : isPending ? 'pending' : ''
									}
									to={href('/contacts/:contactId', { contactId: contact.id })}
								>
									{contact.first || contact.last ? (
										<>
											{contact.first} {contact.last}
										</>
									) : (
										<i>No Name</i>
									)}
									{contact.favorite ? <span>*</span> : null}
								</NavLink>
							</li>
						))}
					</ul>
				</nav>
			</div>

			<div
				id="detail"
				className={
					navigation.state === 'loading' && !searching ? 'loading' : ''
				}
			>
				<Outlet />
			</div>
		</>
	)
}
