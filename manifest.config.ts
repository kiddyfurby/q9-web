export default {
	name: 'Q9 Extension',
	version: '1.0.0',
	manifest_version: 3,
	icons: {
		'72': 'src/assets/icon_72.png',
		'96': 'src/assets/icon_96.png',
		'144': 'src/assets/icon_144.png',
		'192': 'src/assets/icon_192.png'
	},
	permissions: ['storage'],
	options_page: 'src/options/options.html',
	background: {
		service_worker: 'src/background/index.ts',
		type: 'module'
	},

	content_scripts: [
		{
			js: ['src/content/index.ts'],
			matches: ['<all_urls>']
		}
	],
	web_accessible_resources: [
		{
			resources: ['src/font/q9-droid.ttf'],
			matches: ['<all_urls>']
		}
	]
};
