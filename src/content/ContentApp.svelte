<script lang="ts">
		import { onMount, onDestroy } from 'svelte';
	import GLYPH_DATA from './data/glyph.json';
	import KEYMAP from './data/keymap.json';

	const ITEMS_PER_PAGE = 9;
	const NULL_CHAR = '\u3000';

	let status = $state('Disabled');
	let isDragging = false;
	let dragOffsetX = 0;
	let dragOffsetY = 0;
	let widgetEl: HTMLDivElement;
	let hasMoved = false;

	// Q9 States
	let code = $state('');
	let page = $state(0);
	let enabled = $state(false);
	let timeoutId: any;

	// Dynamic Data
	let DB = $state({} as Record<string, string>);
	const GLYPH = GLYPH_DATA;
	let activated = $state(false);
	let keyboardLayout = $state('qwerty');

	const currentKeymap = $derived(keyboardLayout === 'numpad' ? KEYMAP.numpad : KEYMAP.qwerty);

	function handleKeyDown(e: KeyboardEvent) {
		if (e.shiftKey) {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				enabled = !enabled;
				status = enabled ? 'Enabled' : 'Disabled';
				setTimeout(() => (status = 'Ready'), 1000);
			}, 300);
		}

		if (!enabled) return;

		if (currentKeymap.hasOwnProperty(e.code)) {
			handleKey(String((currentKeymap as any)[e.code]));
			e.preventDefault();
			e.stopPropagation();
		}
	}

	function handleKeyUp(e: KeyboardEvent) {
		if (e.key === 'Shift') {
			clearTimeout(timeoutId);
		}
	}

	onMount(async () => {
		// Load dynamic data
		const data = await chrome.storage.local.get(['q9_db', 'activated', 'keyboard_layout']);
		if (data.activated) {
			DB = data.q9_db as Record<string, string>;
			activated = true;
		} else {
			status = 'Setup Required';
		}

		if (data.keyboard_layout) {
			keyboardLayout = data.keyboard_layout as string;
		}

		// Listen for storage changes
		const storageListener = (changes: any) => {
			if (changes.keyboard_layout) {
				keyboardLayout = changes.keyboard_layout.newValue as string;
			}
			if (changes.activated && changes.activated.newValue) {
				activated = true;
				chrome.storage.local.get(['q9_db']).then(res => {
					DB = res.q9_db as Record<string, string>;
				});
			}
		};
		chrome.storage.onChanged.addListener(storageListener);

		// Initialize position safely
		const initialX = window.innerWidth - 180;
		const initialY = window.innerHeight - 250;
		if (widgetEl) {
			widgetEl.style.left = `${initialX}px`;
			widgetEl.style.top = `${initialY}px`;
		}

		window.addEventListener('keydown', handleKeyDown, true);
		window.addEventListener('keyup', handleKeyUp, true);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeyDown, true);
		window.removeEventListener('keyup', handleKeyUp, true);
	});

	function isCodeMode(c: string) {
		return !(c.length === 3 || (c.length === 2 && (c[0] === '0' || c[1] === '0')));
	}

	function insertChar(c: string) {
		const success = document.execCommand('insertText', false, c);
		if (!success) {
			function getDeepActiveElement() {
				let el = document.activeElement;
				while (el && el.shadowRoot && el.shadowRoot.activeElement) {
					el = el.shadowRoot.activeElement;
				}
				return el;
			}
			const active = getDeepActiveElement() as HTMLElement;
			if (
				active &&
				(active.tagName === 'INPUT' ||
					active.tagName === 'TEXTAREA' ||
					(active as any).isContentEditable)
			) {
				const input = active as HTMLInputElement;
				try {
					const start = input.selectionStart ?? input.value.length;
					const end = input.selectionEnd ?? input.value.length;
					const val = input.value;
					input.value = val.substring(0, start) + c + val.substring(end);
					input.selectionStart = input.selectionEnd = start + c.length;
					input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
				} catch (e) {
					input.value += c;
					input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
				}
			}
		}
	}

	function handleKey(k: string) {
		if (hasMoved) {
			hasMoved = false;
			return;
		}

		let nextCode = code;
		let nextPage = page;

		if (k === '10') {
			nextCode = '';
			nextPage = 0;
		} else if (isCodeMode(nextCode)) {
			nextCode += k;
			if (nextCode === '00') nextCode = '';
		} else {
			if (k === '0') {
				nextPage++;
			} else {
				const charStr = (DB as Record<string, string>)[nextCode];
				if (charStr) {
					const padded = charStr.padEnd((nextPage + 1) * ITEMS_PER_PAGE, NULL_CHAR);
					const c = padded[nextPage * ITEMS_PER_PAGE + parseInt(k) - 1];
					if (c && c !== NULL_CHAR) {
						insertChar(c);
						nextCode = '';
						nextPage = 0;
					}
				}
			}
		}

		// validate
		if (!isCodeMode(nextCode)) {
			if (!(DB as Record<string, string>)[nextCode]) {
				nextCode = nextCode.slice(0, -1);
			} else if (nextPage * ITEMS_PER_PAGE >= (DB as Record<string, string>)[nextCode].length) {
				nextPage = 0;
			}
		}

		code = nextCode;
		page = nextPage;
	}

	function startDrag(e: PointerEvent) {
		const target = e.target as HTMLElement;
		if (target.tagName === 'BUTTON' || target.closest('button') || target.tagName === 'A') {
			return;
		}

		isDragging = true;
		hasMoved = false;

		const rect = widgetEl.getBoundingClientRect();
		dragOffsetX = e.clientX - rect.left;
		dragOffsetY = e.clientY - rect.top;

		try {
			widgetEl.setPointerCapture(e.pointerId);
		} catch (e) {}
	}

	function onDrag(e: PointerEvent) {
		if (!isDragging) return;
		hasMoved = true;

		const x = e.clientX - dragOffsetX;
		const y = e.clientY - dragOffsetY;

		if (widgetEl) {
			widgetEl.style.left = `${x}px`;
			widgetEl.style.top = `${y}px`;
		}
	}

	function stopDrag(e: PointerEvent) {
		if (isDragging) {
			isDragging = false;
			try {
				widgetEl.releasePointerCapture(e.pointerId);
			} catch (e) {}
		}
	}

	// UI Derived state
	const displayData = $derived.by(() => {
		let candidates = '';
		let key0Text = '';

		if (isCodeMode(code)) {
			switch (code.length) {
				case 0:
					candidates = GLYPH[0] || '';
					key0Text = '符號';
					break;
				case 2:
					candidates = GLYPH[0] || '';
					key0Text = '確定';
					break;
				case 1:
					const glyphIdx = parseInt(code[0]);
					candidates = GLYPH[glyphIdx] || '';
					key0Text = code === '0' ? '字形' : '姓氏';
					break;
			}
		} else {
			const charStr = DB[code] || '';
			candidates = charStr.substring(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
			key0Text = `${page + 1} / ${Math.ceil(charStr.length / ITEMS_PER_PAGE)}`;
		}
		return { candidates: candidates || '', key0Text };
	});

	const keypad = [
		{ code: '7', index: 6 },
		{ code: '8', index: 7 },
		{ code: '9', index: 8 },
		{ code: '4', index: 3 },
		{ code: '5', index: 4 },
		{ code: '6', index: 5 },
		{ code: '1', index: 0 },
		{ code: '2', index: 1 },
		{ code: '3', index: 2 }
	];
</script>

<svelte:window onpointermove={onDrag} onpointerup={stopDrag} />

<div
	class="extension-widget"
	class:disabled={!enabled}
	role="application"
	style="position: absolute;"
	onpointerdown={startDrag}
	bind:this={widgetEl}
>
	<div class="status-bar">
		<span class="status-btn">{enabled ? 'Q9' : 'OFF'}</span>
		<span class="status-msg">
            {status}
            {#if !activated}
                <button type="button" onclick={() => chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' })} style="background: none; border: none; color: #818cf8; margin-left: 5px; padding: 0; font-size: inherit; cursor: pointer; pointer-events: auto; text-decoration: underline;">Activate</button>
            {/if}
        </span>
        <button 
            type="button" 
            class="settings-gear" 
            aria-label="Settings"
            onclick={() => chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' })}
            style="margin-left: auto; background: none; border: none; padding: 4px; cursor: pointer; display: flex; align-items: center; pointer-events: auto;"
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-dim); transition: color 0.2s;">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
        </button>
	</div>

    <style>
        .settings-gear:hover svg {
            color: var(--text) !important;
            transform: rotate(30deg);
        }
    </style>

	<div class="q9ime_container">
		{#each keypad as cell}
			<button type="button" onclick={() => handleKey(cell.code)}>
				{displayData.candidates[cell.index] || NULL_CHAR}
			</button>
		{/each}
		<button type="button" class="q9_long q9_bottom" onclick={() => handleKey('0')}>
			{displayData.key0Text}
		</button>
		<button type="button" class="q9_bottom" onclick={() => handleKey('10')}> 取消 </button>
	</div>
</div>
