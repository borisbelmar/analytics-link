import { Database } from '../database.types'
import { createClient } from '@supabase/supabase-js'

export default {
	async fetch(request, env): Promise<Response> {
		const linkHash = request.url.split('/').pop()
		if (!linkHash) {
			return new Response('Invalid URL', { status: 400 })
		}
		const supabase = createClient<Database> (env.SUPABASE_URL, env.SUPABASE_KEY)
		if (linkHash === 'download-csv') {
			const { data, error } = await supabase.from('hits_count')
				.select('link, name, url, count')
				.order('count', { ascending: false })
			if (error) {
				console.error('Error fetching hits', error)
				return new Response('Error fetching hits', { status: 500 })
			}
			const csv = data.map(hit => `${hit.link},${hit.name},${hit.url},${hit.count}\n`).join('')
			const csvHeader = 'Link,Name,URL,Count\n'
			return new Response(`${csvHeader}${csv}`, {
				headers: {
					'Content-Type': 'text/csv',
					'Content-Disposition': `attachment; filename="hits-${Date.now()}.csv"`,
				}
			})	
		}
		if (linkHash.length !== 10 || !/^[a-zA-Z0-9]+$/.test(linkHash)) {
			return new Response('Invalid URL', { status: 400 })
		}

		const { data, error } = await supabase.from('links').select('url').eq('id', linkHash)

		if (error) {
			console.error('Error fetching link', error)
			return new Response('Error fetching link', { status: 500 })
		}
		if (!data || data.length === 0) {
			return new Response('Link not found', { status: 404 })
		}
		const destinationURL = data[0].url
		const statusCode = 301;

		await supabase.from('hits').insert({ link: linkHash })
		const headers = new Headers();
		headers.set('Cache-Control', 'no-store');
		headers.set('Location', destinationURL);

		return new Response(null, {
			status: statusCode,
			headers
		});
	},
} satisfies ExportedHandler<Env>;
