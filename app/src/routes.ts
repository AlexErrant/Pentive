import { lazy } from 'solid-js'
import type { RouteDefinition } from '@solidjs/router'

import Home from './pages/home'
import { type NavLinkData } from './components/contracts'
import { Upload } from './components/upload'

export const navLinks: NavLinkData[] = [
	{
		child: 'Home',
		href: '/',
	},
	{
		child: 'Templates',
		href: '/templates',
	},
	{
		child: 'Cards',
		href: '/cards',
	},
	{
		child: 'Plugins',
		href: '/plugins',
	},
	{
		child: 'Settings',
		href: '/settings',
	},
	{
		child: 'Study',
		href: '/study',
	},
	{
		child: Upload,
		href: '/sync',
	},
	{
		child: 'Error',
		href: '/error',
	},
]

export const routes: RouteDefinition[] = [
	{
		path: '/',
		component: Home,
	},
	{
		path: '/templates',
		component: lazy(async () => await import('./pages/templates')),
	},
	{
		path: '/cards',
		component: lazy(async () => await import('./pages/cards')),
	},
	{
		path: '/plugins',
		component: lazy(async () => await import('./pages/plugins')),
	},
	{
		path: '/settings',
		component: lazy(async () => await import('./pages/settings')),
	},
	{
		path: '/study',
		component: lazy(async () => await import('./pages/study')),
	},
	{
		path: '/sync',
		component: lazy(async () => await import('./pages/sync')),
	},
	{
		path: '/testdb',
		component: lazy(async () => await import('./pages/testdb')),
	},
	{
		path: '**',
		component: lazy(async () => await import('./pages/404')),
	},
]
