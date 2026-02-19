<script lang="ts">
	import { onMount } from 'svelte';
	import recipes from '../content/data/recipes.json';

	interface Recipe {
		k: string;
		o: number;
		l: number;
	}

	let keyboardLayout = $state('qwerty');
	let status = $state('');
	let statusType = $state(''); // 'success' | 'error' | ''
	let fileInput: HTMLInputElement;

	onMount(async () => {
		const data = await chrome.storage.local.get(['keyboard_layout']);
		if (data.keyboard_layout) {
			keyboardLayout = data.keyboard_layout as string;
		}
	});

	async function saveLayout(layout: string) {
		keyboardLayout = layout;
		await chrome.storage.local.set({ keyboard_layout: layout });
	}

	let dragging = $state(false);

	async function handleFile(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) await processFile(file);
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) await processFile(file);
	}

	async function processFile(file: File) {
		status = 'Reading file...';
		statusType = '';

		try {
			const buffer = await file.arrayBuffer();
			const uint8 = new Uint8Array(buffer);
			const decoder = new TextDecoder('big5');

			// 1. Calibration
			// Search for "麥趙楊黃" (b3 c1 bb af b7 a8 b6 c0)
			const marker = new Uint8Array([0xb3, 0xc1, 0xbb, 0xaf, 0xb7, 0xa8, 0xb6, 0xc0]);
			let foundIdx = -1;
			for (let i = 0; i < uint8.length - marker.length; i++) {
				let match = true;
				for (let j = 0; j < marker.length; j++) {
					if (uint8[i + j] !== marker[j]) {
						match = false;
						break;
					}
				}
				if (match) {
					foundIdx = i;
					break;
				}
			}

			if (foundIdx === -1) {
				throw new Error('Valid Q9 data not found in this file. Please ensure you are uploading Q9.IME or Q9.IM_.');
			}

			// Calculate delta (Expected surname offset for 10 is 321044)
			const delta = foundIdx - 321044;
			status = `Calibrated. Extracting ${recipes.db.length} entries...`;

			const db: Record<string, string> = {};
			for (const r of recipes.db) {
				const start = r.o + delta;
				const bytes = r.l * 2;
				if (start >= 0 && start + bytes <= uint8.length) {
					try {
						const slice = uint8.slice(start, start + bytes);
						db[r.k] = decoder.decode(slice);
					} catch (err) {
						console.error(`Failed to decode key ${r.k}`);
					}
				}
			}

			// Save to storage
			await chrome.storage.local.set({
				'q9_db': db,
				'activated': true,
				'activated_at': new Date().toISOString()
			});

			status = 'Activation Successful! Your Q9 dictionary has been reconstructed.';
			statusType = 'success';
		} catch (err: any) {
			status = `Error: ${err.message}`;
			statusType = 'error';
		}
	}
	async function downloadDb() {
		const data = await chrome.storage.local.get(['q9_db']);
		if (!data.q9_db) {
			status = 'No data to export. Please activate first.';
			statusType = 'error';
			return;
		}

		const blob = new Blob([JSON.stringify(data.q9_db, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'q9_db_extracted.json';
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="container">
	<header>
		<h1>Q9 Settings</h1>
		<p class="subtitle">Configure your extraction and input preferences.</p>
	</header>

    <div class="settings-section" style="margin-bottom: 2rem;">
        <h3 style="font-size: 1rem; margin-bottom: 1rem;">Keyboard Layout</h3>
        <div style="display: flex; gap: 1rem;">
            <label style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
                <input type="radio" name="layout" value="qwerty" checked={keyboardLayout === 'qwerty'} onchange={() => saveLayout('qwerty')} />
                QWERTY
            </label>
            <label style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
                <input type="radio" name="layout" value="numpad" checked={keyboardLayout === 'numpad'} onchange={() => saveLayout('numpad')} />
                Numpad
            </label>
        </div>
    </div>

    <div class="settings-section">
        <h3 style="font-size: 1rem; margin-bottom: 1rem;">Data Activation</h3>
        <div 
            class="importer-box" 
            class:dragging={dragging}
            onclick={() => fileInput.click()}
            onkeypress={(e) => e.key === 'Enter' && fileInput.click()}
            ondragover={(e) => { e.preventDefault(); dragging = true; }}
            ondragleave={() => dragging = false}
            ondrop={handleDrop}
            role="button"
            tabindex="0"
            style="margin-top: 0;"
        >
            <p>{dragging ? 'Drop it here!' : 'Click to select or drag and drop Q9.IM_ / Q9.IME'}</p>
            <input 
                type="file" 
                bind:this={fileInput} 
                style="display: none;" 
                onchange={handleFile}
            />
        </div>
    </div>

	{#if status}
		<div class="status {statusType}">
			{status}
		</div>
	{/if}

	{#if statusType === 'success'}
		<div style="margin-top: 2rem; display: flex; flex-direction: column; gap: 1rem;">
			<p style="color: var(--text-dim);">
				The extension is now ready. You can close this window or export the data for verification.
			</p>
			<button class="btn" onclick={downloadDb}>
				Download Extracted JSON
			</button>
		</div>
	{/if}

    <div style="margin-top: 3rem; font-size: 0.8rem; color: var(--text-dim); line-height: 1.4;">
        <p><b>Why is this required?</b></p>
        <p>Due to legal restrictions, we cannot redistribute the Q9 dictionary data. By uploading your own data file from a licensed copy of Q9, the extension can legally reconstruct the necessary dictionary elements.</p>
    </div>
</div>
