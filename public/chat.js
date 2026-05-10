// DOM elements
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");
const emojiButton = document.getElementById("emoji-button");
const emojiPicker = document.getElementById("emoji-picker");

// Chat state
let chatHistory = [
    {
        role: "assistant",
        content: "Hello! I'm Ann Laura AI, a virtual assistant for you. How can I help you today? 🙂",
    },
];
let isProcessing = false;

// ==================== AUTO-RESIZE TEXTAREA ====================
userInput.addEventListener("input", function () {
    this.style.height = "auto";
    let newHeight = Math.min(this.scrollHeight, 120);
    this.style.height = newHeight + "px";
    this.style.overflowY = this.scrollHeight > 120 ? "auto" : "hidden";
});

// ==================== SEND ON ENTER ====================
userInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// ==================== SEND BUTTON CLICK ====================
sendButton.addEventListener("click", sendMessage);

// ==================== EMOJI PICKER ====================
if (emojiButton && emojiPicker) {
    emojiButton.addEventListener("click", (e) => {
        e.stopPropagation();
        emojiPicker.classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
        if (!emojiPicker.contains(e.target) && e.target !== emojiButton) {
            emojiPicker.classList.remove("show");
        }
    });

    document.querySelectorAll(".emoji-item").forEach((emoji) => {
        emoji.addEventListener("click", () => {
            const emojiChar = emoji.textContent;
            const cursorPos = userInput.selectionStart;
            const textBefore = userInput.value.substring(0, cursorPos);
            const textAfter = userInput.value.substring(cursorPos);
            userInput.value = textBefore + emojiChar + textAfter;
            userInput.focus();
            userInput.dispatchEvent(new Event("input"));
            userInput.setSelectionRange(cursorPos + emojiChar.length, cursorPos + emojiChar.length);
            emojiPicker.classList.remove("show");
        });
    });
}

// ==================== XSS PROTECTION ====================
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ==================== RENDER MARKDOWN ====================
function renderMarkdown(text) {
    let html = escapeHtml(text);
    
    // Block code (```language\ncode```)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, language, code) => {
        const lang = language || 'plain';
        const cleanCode = code.trim();
        return `
            <div class="code-block">
                <div class="code-header">
                    <span class="code-lang">${escapeHtml(lang)}</span>
                    <button class="copy-code-btn" data-code="${escapeHtml(cleanCode).replace(/"/g, '&quot;')}">📂 Copy</button>
                </div>
                <pre><code>${escapeHtml(cleanCode)}</code></pre>
            </div>
        `;
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

// ==================== COPY CODE BUTTON ====================
function attachCopyListeners(container) {
    container.querySelectorAll('.copy-code-btn').forEach(btn => {
        btn.removeEventListener('click', btn._listener);
        const listener = () => {
            const code = btn.getAttribute('data-code');
            navigator.clipboard.writeText(code).then(() => {
                const originalText = btn.textContent;
                btn.textContent = '✔️ Copied!';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            }).catch(() => {
                btn.textContent = '❌ Failed';
                setTimeout(() => {
                    btn.textContent = '📂 Copy';
                }, 2000);
            });
        };
        btn.addEventListener('click', listener);
        btn._listener = listener;
    });
}

// ==================== ADD MESSAGE TO CHAT ====================
function addMessageToChat(role, content) {
    const messageEl = document.createElement("div");
    messageEl.className = `message ${role}-message`;
    
    if (role === 'assistant') {
        const htmlContent = renderMarkdown(content);
        messageEl.innerHTML = `<div class="message-content">${htmlContent}</div>`;
        attachCopyListeners(messageEl);
    } else {
        messageEl.innerHTML = `<div class="message-content"><p>${escapeHtml(content)}</p></div>`;
    }
    
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ==================== SEND MESSAGE TO API ====================
async function sendMessage() {
    const message = userInput.value.trim();
    if (message === "" || isProcessing) return;

    isProcessing = true;
    userInput.disabled = true;
    sendButton.disabled = true;

    addMessageToChat("user", message);
    userInput.value = "";
    userInput.style.height = "auto";
    typingIndicator.classList.add("visible");
    chatHistory.push({ role: "user", content: message });

    try {
        const assistantMessageEl = document.createElement("div");
        assistantMessageEl.className = "message assistant-message";
        assistantMessageEl.innerHTML = '<div class="message-content"></div>';
        chatMessages.appendChild(assistantMessageEl);
        const assistantContentDiv = assistantMessageEl.querySelector(".message-content");
        chatMessages.scrollTop = chatMessages.scrollHeight;

        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: chatHistory }),
        });

        if (!response.ok || !response.body) throw new Error("Failed to get response");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let responseText = "";
        let buffer = "";

        const flushText = () => {
            const htmlContent = renderMarkdown(responseText);
            assistantContentDiv.innerHTML = htmlContent;
            attachCopyListeners(assistantMessageEl);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        };

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const parsed = consumeSseEvents(buffer);
            buffer = parsed.buffer;

            for (const data of parsed.events) {
                if (data === "[DONE]") continue;
                try {
                    const jsonData = JSON.parse(data);
                    let content = "";
                    if (typeof jsonData.response === "string" && jsonData.response.length > 0) {
                        content = jsonData.response;
                    } else if (jsonData.choices?.[0]?.delta?.content) {
                        content = jsonData.choices[0].delta.content;
                    }
                    if (content) {
                        responseText += content;
                        flushText();
                    }
                } catch (e) {
                    console.error("Parse error:", e);
                }
            }
        }

        if (responseText.length > 0) {
            chatHistory.push({ role: "assistant", content: responseText });
        }
    } catch (error) {
        console.error("Error:", error);
        addMessageToChat("assistant", "Sorry, there was an error processing your request. 😓");
    } finally {
        typingIndicator.classList.remove("visible");
        isProcessing = false;
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.focus();
    }
}

// ==================== SSE EVENT PARSER ====================
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
