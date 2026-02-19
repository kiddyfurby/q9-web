import { mount } from 'svelte';
import ContentApp from './ContentApp.svelte';
import styles from './app.css?inline';
import widgetStyles from './widget.css?inline';
import fontUrl from '../font/q9-droid.ttf';

console.log('Q9: Content script loaded');

// Inject @font-face into the main document (Light DOM)
// This is more reliable for Shadow DOM content to access.
const absoluteFontUrl = chrome.runtime.getURL(fontUrl);
if (!document.getElementById('q9-font-style')) {
	const fontStyle = document.createElement('style');
	fontStyle.id = 'q9-font-style';
	fontStyle.textContent = `
    @font-face {
      font-family: 'Q9';
      src: url('${absoluteFontUrl}') format('truetype');
    }
  `;
	document.head.appendChild(fontStyle);
}

// Create a Shadow Root to isolate styles
const host = document.createElement('div');
host.id = 'q9-extension-host';
host.style.position = 'fixed';
host.style.top = '0';
host.style.left = '0';
host.style.width = '0';
host.style.height = '0';
host.style.overflow = 'visible';
host.style.zIndex = '2147483647'; // Max safe z-index

// Attach to body
document.body.appendChild(host);

// Create shadow root
const shadow = host.attachShadow({ mode: 'open' });

// Inject styles into shadow root
const styleEl = document.createElement('style');
styleEl.textContent =
	styles +
	widgetStyles +
	`
  :host {
    display: block;
    color: white;
    font-family: 'Inter', system-ui, sans-serif;
  }
`;
shadow.appendChild(styleEl);

// Mount Svelte App into Shadow Root
mount(ContentApp, {
	target: shadow
});
