// DOM elements
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");
const quickPromptsContainer = document.getElementById("quick-prompts");

// Chat state
let chatHistory = [
    {
        role: "assistant",
        content: "Halo! Saya Anna Laura, Coding Assistant kamu. Mau bantu apa hari ini?",
    },
];

let isProcessing = false;

// Quick Prompt Examples untuk Coding Assistant
const quickPrompts = [
    "Bantu saya buat fungsi ...",
    "Jelaskan kode ini",
    "Review dan perbaiki kode saya",
    "Buat unit test untuk fungsi ini",
    "Optimasi kode ini supaya lebih efisien",
    "Convert kode ini ke TypeScript"
];

// Auto-resize textarea
userInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
});

// Send on Enter (tanpa Shift)
userInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendButton.addEventListener("click", sendMessage);

// Render Quick Prompts
function renderQuickPrompts() {
    quickPromptsContainer.innerHTML = "";
    quickPrompts.forEach(prompt => {
        const btn = document.createElement("button");
        btn.className = "quick-btn";
        btn.textContent = prompt;
        btn.addEventListener("click", () => {
            userInput.value = prompt;
            sendMessage();
        });
        quickPromptsContainer.appendChild(btn);
    });
}

// Add message to chat with better rendering
function addMessageToChat(role, content) {
    const messageEl = document.createElement("div");
    messageEl.className = `message ${role}-message`;

    // Simple markdown-like rendering untuk code blocks
    let processedContent = content
        .replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre><code class="language-${lang || 'plaintext'}">${escapeHtml(code.trim())}</code></pre>`;
        })
        .replace(/\n/g, "<br>");

    messageEl.innerHTML = `<div class="message-content">${processedContent}</div>`;
    chatMessages.appendChild(messageEl);

    // Apply syntax highlighting
    if (typeof hljs !== "undefined") {
        messageEl.querySelectorAll("pre code").forEach(block => {
            hljs.highlightElement(block);
            addCopyButton(block);
        });
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageEl;
}

// Escape HTML untuk mencegah XSS
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Tambahkan tombol Copy
function addCopyButton(codeBlock) {
    const pre = codeBlock.parentElement;
    if (pre.querySelector(".copy-btn")) return;

    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", () => {
        const text = codeBlock.textContent;
        navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = "Copied!";
            setTimeout(() => {
                copyBtn.textContent = "Copy";
            }, 2000);
        });
    });

    pre.style.position = "relative";
    pre.appendChild(copyBtn);
}

/**
 * Send Message
 */
async function sendMessage() {
    const message = userInput.value.trim();
    if (message === "" || isProcessing) return;

    isProcessing = true;
    userInput.disabled = true;
    sendButton.disabled = true;

    // Tampilkan pesan user
    addMessageToChat("user", message);

    userInput.value = "";
    userInput.style.height = "auto";

    typingIndicator.style.display = "block";

    chatHistory.push({ role: "user", content: message });

    try {
        const assistantMessageEl = document.createElement("div");
        assistantMessageEl.className = "message assistant-message";
        assistantMessageEl.innerHTML = `<div class="message-content"><p></p></div>`;
        chatMessages.appendChild(assistantMessageEl);

        const assistantTextEl = assistantMessageEl.querySelector("p");

        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: chatHistory }),
        });

        if (!response.ok) throw new Error("Failed to get response");

        // Streaming logic (sama seperti sebelumnya, tapi dengan perbaikan)
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let responseText = "";
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const parsed = consumeSseEvents(buffer);
            buffer = parsed.buffer;

            for (const data of parsed.events) {
                if (data === "[DONE]") break;
                try {
                    const jsonData = JSON.parse(data);
                    let content = jsonData.response || jsonData.choices?.[0]?.delta?.content || "";
                    if (content) {
                        responseText += content;
                        assistantTextEl.textContent = responseText;
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                } catch (e) {}
            }
        }

        // Final rendering dengan highlight
        if (responseText) {
            chatHistory.push({ role: "assistant", content: responseText });
            // Re-render final message dengan highlight
            assistantMessageEl.remove();
            addMessageToChat("assistant", responseText);
        }

    } catch (error) {
        console.error("Error:", error);
        addMessageToChat("assistant", "Maaf, terjadi kesalahan. Coba lagi ya.");
    } finally {
        typingIndicator.style.display = "none";
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
        if (dataLines.length > 0) {
            events.push(dataLines.join("\n"));
        }
    }
    return { events, buffer: normalized };
}

// Initialize
renderQuickPrompts();
chatMessages.scrollTop = chatMessages.scrollHeight;
