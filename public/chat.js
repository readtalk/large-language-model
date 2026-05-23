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
        content: "Hello! please my nickname is Laura, a virtual assistant for you. How can I help you today? 🙂",
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

// ==================== RENDER MARKDOWN (FIXED) ====================
function renderMarkdown(text) {
    // Step 1: Simpan semua block code ke array, ganti dengan placeholder
    const codeBlocks = [];
    let temp = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const index = codeBlocks.length;
        codeBlocks.push({ lang: lang || 'code', code: code.trim() });
        return `__CODE_BLOCK_${index}__`;
    });
    
    // Step 2: Escape HTML untuk teks di luar block code
    let html = escapeHtml(temp);
    
    // Step 3: Kembalikan block code (tidak di-escape ulang)
    html = html.replace(/__CODE_BLOCK_(\d+)__/g, (match, index) => {
        const { lang, code } = codeBlocks[parseInt(index)];
        return `
            <div class="code-block">
                <div class="code-header">
                    <span class="code-lang">${escapeHtml(lang)}</span>
                    <button class="copy-code-btn" data-code="${escapeHtml(code).replace(/"/g, '&quot;')}">📋 Copy</button>
                </div>
                <pre><code>${escapeHtml(code)}</code></pre>
            </div>
        `;
    });
    
    // Step 4: Inline code (sudah lewat escapeHtml, aman)
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    // Step 5: Headings
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // Step 6: Bold + italic
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Step 7: List
    html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');
    
    // Step 8: Line breaks
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
                btn.textContent = '✅ Copied!';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            }).catch(() => {
                btn.textContent = '❌ Failed';
                setTimeout(() => {
                    btn.textContent = '📋 Copy';
                }, 2000);
            });
        };
        btn.addEventListener('click', listener);
        btn._listener = listener;
    });
}

// ==================== ADD MESSAGE TO CHAT ====================
function addMessageToChat(role, content) {
    const message, content) {
    const messageEl = document.createElement("div");
    messageEl.className = `message ${role}-message`;
    
    if (roleEl = document.createElement("div");
    messageEl.className = `message ${role}-message`;
    
    if (role === 'assistant') {
        const htmlContent = renderMarkdown(content);
 === 'assistant') {
        const htmlContent = renderMarkdown(content);
        messageEl.innerHTML = `<div class="message-content">${htmlContent}</        messageEl.innerHTML = `<div class="message-content">${htmlContent}</div>div>`;
        attachCopyListeners(messageEl);
    } else {
        messageEl.innerHTML = `<div class="message-content"><p>${escapeHtml(content`;
        attachCopyListeners(messageEl);
    } else {
        messageEl.innerHTML = `<div class="message-content"><p>${escapeHtml(content)}</p></div>`;
    }
    
    chatMessages.appendChild(messageEl);
   )}</p></div>`;
    }
    
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ==================== S chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ==================== SEND MEND MESSAGE TO API ====================
async function sendMessage() {
    const message = userInput.value.trim();
    if (message === ""ESSAGE TO API ====================
async function sendMessage() {
    const message = userInput.value.trim();
    if (message === "" || isProcessing) return;

    isProcessing = true;
    userInput.disabled = true;
    sendButton.disabled = true;

 || isProcessing) return;

    isProcessing = true;
    userInput.disabled = true;
    sendButton.disabled = true;

    addMessageToChat("user", message);
    userInput.value = "";
    userInput.style.height = "auto";
    typingIndicator.classList.add("visible    addMessageToChat("user", message);
    userInput.value = "";
    userInput.style.height = "auto";
    typingIndicator");
    chatHistory.push({ role: "user", content: message });

    try {
        const assistantMessageEl =.classList.add("visible");
    chatHistory.push({ role: "user", content: message });

    try {
        const assistantMessageEl = document.createElement("div");
        assistantMessageEl.className = "message assistant-message";
        assistantMessageEl.innerHTML = '<div class="message-content"></div document.createElement("div");
        assistantMessageEl.className = "message assistant-message";
        assistantMessageEl.innerHTML = '<div class="message-content"></div>';
        chatMessages.appendChild(assistantMessageEl);
       >';
        chatMessages.appendChild(assistantMessageEl);
        const assistantContentDiv = assistantMessageEl const assistantContentDiv = assistantMessageEl.querySelector(".message-content");
        chatMessages.scrollTop = chatMessages.scrollHeight;

        const response = await fetch("/api/chat", {
            method.querySelector(".message-content");
        chatMessages.scrollTop = chatMessages.scrollHeight;

        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json": "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: chatHistory }),
        });

        if (!response.ok || !response.body) throw new Error(" },
            body: JSON.stringify({ messages: chatHistory }),
        });

        if (!response.ok || !response.body) throw new Error("Failed to get response");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let responseText = "";
        let buffer = "";

        const flushText = ()Failed to get response");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let responseText = "";
        let buffer = "";

        const flushText = () => {
            const htmlContent = renderMarkdown(responseText);
            assistantContent => {
            const htmlContent = renderMarkdown(responseText);
            assistantContentDiv.innerHTML = htmlDiv.innerHTML = htmlContent;
            attachCopyListeners(assistantMessageEl);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        };

        while (true) {
            const { done, valueContent;
            attachCopyListeners(assistantMessageEl);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        };

        while (true) {
            const { done, } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const parsed = consumeSseEvents(buffer);
            buffer = parsed value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const parsed = consumeSseEvents(buffer);
            buffer =.buffer;

            for (const data of parsed.events) {
                if (data === "[DONE]") parsed.buffer;

            for (const data of parsed.events) {
                if (data === "[DONE]") continue;
                try {
                    const jsonData = JSON.parse(data);
                    let content = "";
                    if (typeof json continue;
                try {
                    const jsonData = JSON.parse(data);
                    letData.response === "string" && jsonData.response.length > 0) {
                        content = jsonData.response;
                    } else if ( content = "";
                    if (typeof jsonData.response === "string" && jsonData.response.length > 0) {
                        content = jsonData.response;
                    } else if (jsonData.choices?.[0]?.delta?.content) {
                        content = jsonData.jsonData.choices?.[0]?.delta?.content) {
                        content = jsonData.choices[0].delta.content;
                    }
                    if (content) {
                        responseText += contentchoices[0].delta.content;
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

        if (responseText.length >;
                        flushText();
                    }
                } catch (e) {
                    console.error("Parse error:", e);
                }
            }
        }

        if (responseText.length > 0) {
 0) {
            chatHistory.push({ role: "assistant", content: responseText });
        }
    } catch (error) {
        console.error("Error:", error            chatHistory.push({ role: "assistant", content: responseText });
        }
    } catch (error) {
        console.error("Error);
        addMessageToChat("assistant", "Sorry, there was an error processing your request. 😓");
    } finally {
        typingIndicator.classList.remove(":", error);
        addMessageToChat("assistant", "Sorry, there was an error processing your request. 😓");
    } finally {
        typingIndicator.classList.remove("visible");
        isProcessing = false;
        userInput.disabled = false;
visible");
        isProcessing = false;
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.focus();
    }
}

// ==================== SSE EVENT P        sendButton.disabled = false;
        userInput.focus();
    }
}

// ==================== SSE EVENT PARSER ====================
function consumeSseEvents(buffer) {
    let normalized = buffer.replace(/\r/g, "");
    const events = [];
   ARSER ====================
function consumeSseEvents(buffer) {
    let normalized = buffer.replace(/\r/g, "");
    const events = [];
    let eventEndIndex;
    while ((eventEndIndex = normalized.indexOf("\n\n")) !== - let eventEndIndex;
    while ((eventEndIndex = normalized.indexOf("\n\n")) !== -1) {
        const rawEvent = normalized.slice(0, eventEndIndex);
        normalized = normalized.slice(eventEndIndex + 21) {
        const rawEvent = normalized.slice(0, eventEndIndex);
        normalized = normalized.slice(eventEnd);
        const lines = rawEvent.split("\n");
        const dataLines = [];
        for (const line of lines) {
            if (line.startsWith("data:")) {
                dataLinesIndex + 2);
        const lines = rawEvent.split("\n");
        const dataLines = [];
        for (const line of lines) {
            if (line.startsWith("data:")) {
                dataLines.push(line.slice("data:".length).trimStart());
            }
        }
        if (dataLines.length === 0) continue;
        events.push(dataLines.join("\.push(line.slice("data:".length).trimStart());
            }
        }
        if (dataLines.length === 0) continue;
        events.push(dataLines.join("\n"));
    }
    return { events, buffer: normalized };
}
