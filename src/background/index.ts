chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === 'OPEN_OPTIONS') {
		chrome.runtime.openOptionsPage();
	}
});
