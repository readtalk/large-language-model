// DOM elements
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");

// Chat state
let chatHistory = [
	{
		role: "assistant",
		content:
			"Hello! I'm Anna Laura AI an virtual assistant for everyone. How can I help you today?",
	},
];
let isProcessing = false;
let mermaidInitialized = false;

// Inisialisasi Mermaid.js (render diagram)
function initMermaid() {
	if (typeof mermaid !== 'undefined' && !mermaidInitialized) {
		mermaid.initialize({
			startOnLoad: false,
			theme: 'default',
			securityLevel: 'loose',
			flowchart: { useMaxWidth: true, htmlLabels: true },
			sequence: { useMaxWidth: true },
			gantt: { useMaxWidth: true }
		});
		mermaidInitialized = true;
	}
}

// Render diagram mermaid dalam container
async function renderMermaidDiagram(element, code) {
	try {
		if (typeof mermaid !== 'undefined') {
			initMermaid();
			const id = 'mermaid-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8);
			element.setAttribute('id', id);
			const { svg } = await mermaid.render(id, code);
			element.innerHTML = svg;
			return true;
		}
	} catch (e) {
		console.error('Mermaid render error:', e);
		element.innerHTML = `<pre><code>${escapeHtml(code)}</code></pre><small>⚠️ Diagram tidak dapat dirender</small>`;
		return false;
	}
	return false;
}

// Auto-resize textarea as user types
userInput.addEventListener("input", function () {
	this.style.height = "auto";
	this.style.height = this.scrollHeight + "px";
});

// Send message on Enter (without Shift)
userInput.addEventListener("keydown", function (e) {
	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault();
		sendMessage();
	}
});

// Send button click handler
sendButton.addEventListener("click", sendMessage);

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text) {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}

/**
 * Clean Markdown special characters untuk ditampilkan
 */
function cleanMarkdown(text) {
	if (!text) return text;
	// Jangan hapus dari kode block, hanya dari teks biasa
	return text.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
			   .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			   .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

/**
 * Render Markdown ke HTML (tanpa library eksternal)
 * Support: bold, italic, heading, list, code block, inline code
 */
function renderMarkdown(text) {
	let html = escapeHtml(text);
	
	// Block code dengan bahasa (```python\ncode```)
	html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
		const cleanCode = code.trim();
		const langLabel = lang || 'code';
		const uniqueId = 'code-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8);
		return `
			<div class="code-block" data-code-id="${uniqueId}">
				<div class="code-header">
					<span class="code-lang">${escapeHtml(langLabel)}</span>
					<button class="copy-code-btn" data-code="${escapeHtml(cleanCode).replace(/"/g, '&quot;')}">📋 Copy</button>
				</div>
				<pre><code>${escapeHtml(cleanCode)}</code></pre>
			</div>
		`;
	});
	
	// Mermaid diagram block
	html = html.replace(/```mermaid\n([\s\S]*?)```/g, (match, code) => {
		const uniqueId = 'mermaid-container-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8);
		return `<div class="mermaid-container" data-mermaid-code="${escapeHtml(code.trim()).replace(/"/g, '&quot;')}" id="${uniqueId}"><div class="mermaid-loading">📊 Loading diagram...</div></div>`;
	});
	
	// Inline code
	html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
	
	// Headings
	html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
	html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
	html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
	
	// Bold + italic
	html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
	html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
	html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
	
	// Unordered list
	html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
	html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
	
	// Ordered list
	html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
	html = html.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');
	
	// Line breaks
	html = html.replace(/\n/g, '<br>');
	
	return html;
}

/**
 * Tambahkan event listener untuk tombol copy
 */
function attachCopyListeners(container) {
	container.querySelectorAll('.copy-code-btn').forEach(btn => {
		btn.removeEventListener('click', btn._listener);
		const listener = () => {
			const code = btn.getAttribute('data-code');
			navigator.clipboard.writeText(code).then(() => {
				const originalText = btn.textContent;
				btn.textContent = '✅ Copied!';
				setTimeout(() => { btn.textContent = originalText; }, 2000);
			}).catch(() => {
				btn.textContent = '❌ Failed';
				setTimeout(() => { btn.textContent = '📋 Copy'; }, 2000);
			});
		};
		btn.addEventListener('click', listener);
		btn._listener = listener;
	});
}

/**
 * Render semua diagram Mermaid
 */
async function renderAllMermaidDiagrams(container) {
	const mermaidDivs = container.querySelectorAll('.mermaid-container');
	for (const div of mermaidDivs) {
		const code = div.getAttribute('data-mermaid-code');
		if (code && !div.hasAttribute('data-rendered')) {
			div.setAttribute('data-rendered', 'true');
			await renderMermaidDiagram(div, code);
		}
	}
}

/**
 * Helper function to add message to chat
 */
function addMessageToChat(role, content) {
	const messageEl = document.createElement("div");
	messageEl.className = `message ${role}-message`;
	
	if (role === 'assistant') {
		const htmlContent = renderMarkdown(content);
		messageEl.innerHTML = `<div class="message-content">${htmlContent}</div>`;
		attachCopyListeners(messageEl);
		// Render diagram Mermaid (async)
		setTimeout(() => renderAllMermaidDiagrams(messageEl), 50);
	} else {
		messageEl.innerHTML = `<p>${escapeHtml(content)}</p>`;
	}
	
	chatMessages.appendChild(messageEl);
	chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Sends a message to the chat API and processes the response
 */
async function sendMessage() {
	const message = userInput.value.trim();

	// Don't send empty messages
	if (message === "" || isProcessing) return;

	// Disable input while processing
	isProcessing = true;
	userInput.disabled = true;
	sendButton.disabled = true;

	// Add user message to chat
	addMessageToChat("user", message);

	// Clear input
	userInput.value = "";
	userInput.style.height = "auto";

	// Show typing indicator
	typingIndicator.classList.add("visible");

	// Add message to history
	chatHistory.push({ role: "user", content: message });

	try {
		// Create new assistant response element
		const assistantMessageEl = document.createElement("div");
		assistantMessageEl.className = "message assistant-message";
		assistantMessageEl.innerHTML = '<div class="message-content"></div>';
		chatMessages.appendChild(assistantMessageEl);
		const assistantContentDiv = assistantMessageEl.querySelector(".message-content");
		
		// Scroll to bottom
		chatMessages.scrollTop = chatMessages.scrollHeight;

		// Send request to API
		const response = await fetch("/api/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				messages: chatHistory,
			}),
		});

		// Handle errors
		if (!response.ok) {
			throw new Error("Failed to get response");
		}
		if (!response.body) {
			throw new Error("Response body is null");
		}

		// Process streaming response
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let responseText = "";
		let buffer = "";
		
		const flushAssistantText = () => {
			const htmlContent = renderMarkdown(responseText);
			assistantContentDiv.innerHTML = htmlContent;
			attachCopyListeners(assistantMessageEl);
			chatMessages.scrollTop = chatMessages.scrollHeight;
		};

		let sawDone = false;
		while (true) {
			const { done, value } = await reader.read();

			if (done) {
				// Process any remaining complete events in buffer
				const parsed = consumeSseEvents(buffer + "\n\n");
				for (const data of parsed.events) {
					if (data === "[DONE]") {
						break;
					}
					try {
						const jsonData = JSON.parse(data);
						// Handle both Workers AI format (response) and OpenAI format (choices[0].delta.content)
						let content = "";
						if (
							typeof jsonData.response === "string" &&
							jsonData.response.length > 0
						) {
							content = jsonData.response;
						} else if (jsonData.choices?.[0]?.delta?.content) {
							content = jsonData.choices[0].delta.content;
						}
						if (content) {
							responseText += content;
							flushAssistantText();
						}
					} catch (e) {
						console.error("Error parsing SSE data as JSON:", e, data);
					}
				}
				break;
			}

			// Decode chunk
			buffer += decoder.decode(value, { stream: true });
			const parsed = consumeSseEvents(buffer);
			buffer = parsed.buffer;
			for (const data of parsed.events) {
				if (data === "[DONE]") {
					sawDone = true;
					buffer = "";
					break;
				}
				try {
					const jsonData = JSON.parse(data);
					// Handle both Workers AI format (response) and OpenAI format (choices[0].delta.content)
					let content = "";
					if (
						typeof jsonData.response === "string" &&
						jsonData.response.length > 0
					) {
						content = jsonData.response;
					} else if (jsonData.choices?.[0]?.delta?.content) {
						content = jsonData.choices[0].delta.content;
					}
					if (content) {
						responseText += content;
						flushAssistantText();
					}
				} catch (e) {
					console.error("Error parsing SSE data as JSON:", e, data);
				}
			}
			if (sawDone) {
				break;
			}
		}

		// Render diagram Mermaid setelah selesai
		setTimeout(() => renderAllMermaidDiagrams(assistantMessageEl), 100);

		// Add completed response to chat history
		if (responseText.length > 0) {
			chatHistory.push({ role: "assistant", content: responseText });
		}
	} catch (error) {
		console.error("Error:", error);
		addMessageToChat(
			"assistant",
			"Sorry, there was an error processing your request.",
		);
	} finally {
		// Hide typing indicator
		typingIndicator.classList.remove("visible");

		// Re-enable input
		isProcessing = false;
		userInput.disabled = false;
		sendButton.disabled = false;
		userInput.focus();
	}
}

function consumeSseEvents(buffer) {
	let normalized = buffer.replace(/\r/g, "");
	const events = [];
	let eventEndIndex;
	while ((eventEndIndex = normalized.indexOf("\n\n")) !== -1) {
		const rawEvent = normalized.slice(0, eventEndIndex);
		normalized = normalized.slice(eventEndIndex + 2);

		const lines = rawEvent.split("\n");
		const dataLines = [];
		for (const line of lines) {
			if (line.startsWith("data:")) {
				dataLines.push(line.slice("data:".length).trimStart());
			}
		}
		if (dataLines.length === 0) continue;
		events.push(dataLines.join("\n"));
	}
	return { events, buffer: normalized };
}

// Inisialisasi Mermaid saat halaman load
if (typeof mermaid !== 'undefined') {
	initMermaid();
} else {
	console.warn('Mermaid.js not loaded. Diagram will not render.');
}
