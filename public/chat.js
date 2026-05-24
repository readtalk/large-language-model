// ==================== DOM ELEMENTS ====================
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");
const emojiButton = document.getElementById("emoji-button");
const emojiPicker = document.getElementById("emoji-picker");

// ==================== CHAT STATE ====================
let chatHistory = [
    {
        role: "assistant",
        content:
            "Hello! please my nickname is Laura, a virtual assistant for you. How can I help you today? 🙂",
    },
];

let isProcessing = false;

// ==================== AUTO RESIZE TEXTAREA ====================
function autoResizeTextarea() {
    userInput.style.height = "auto";

    const newHeight = Math.min(userInput.scrollHeight, 140);

    userInput.style.height = newHeight + "px";
    userInput.style.overflowY =
        userInput.scrollHeight > 140 ? "auto" : "hidden";
}

userInput.addEventListener("input", autoResizeTextarea);

// ==================== SEND ON ENTER ====================
userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// ==================== SEND BUTTON ====================
sendButton.addEventListener("click", sendMessage);

// ==================== EMOJI PICKER ====================
if (emojiButton && emojiPicker) {
    emojiButton.addEventListener("click", (e) => {
        e.stopPropagation();
        emojiPicker.classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
        if (
            !emojiPicker.contains(e.target) &&
            e.target !== emojiButton
        ) {
            emojiPicker.classList.remove("show");
        }
    });

    document.querySelectorAll(".emoji-item").forEach((emoji) => {
        emoji.addEventListener("click", () => {
            const emojiChar = emoji.textContent;

            const start = userInput.selectionStart;
            const end = userInput.selectionEnd;

            const before = userInput.value.substring(0, start);
            const after = userInput.value.substring(end);

            userInput.value = before + emojiChar + after;

            userInput.focus();

            const cursor = start + emojiChar.length;

            userInput.setSelectionRange(cursor, cursor);

            autoResizeTextarea();

            emojiPicker.classList.remove("show");
        });
    });
}

// ==================== ESCAPE HTML ====================
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ==================== RENDER MARKDOWN ====================
function renderMarkdown(text) {
    let html = escapeHtml(text);

    // ==================== CODE BLOCK ====================
    html = html.replace(
        /```(\w*)\n([\s\S]*?)```/g,
        (match, language, code) => {
            const lang = language || "plain";
            const cleanCode = code.trim();

            return `
                <div class="code-block">
                    <div class="code-header">
                        <span class="code-lang">${escapeHtml(lang)}</span>

                        <button
                            class="copy-code-btn"
                            data-code="${escapeHtml(cleanCode).replace(/"/g, "&quot;")}"
                        >
                            📂 Copy
                        </button>
                    </div>

                    <pre><code>${escapeHtml(cleanCode)}</code></pre>
                </div>
            `;
        }
    );

    // ==================== INLINE CODE ====================
    html = html.replace(
        /`([^`]+)`/g,
        '<code class="inline-code">$1</code>'
    );

    // ==================== HEADINGS ====================
    html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");

    // ==================== BOLD ====================
    html = html.replace(
        /\*\*\*(.*?)\*\*\*/g,
        "<strong><em>$1</em></strong>"
    );

    html = html.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );

    html = html.replace(
        /\*(.*?)\*/g,
        "<em>$1</em>"
    );

    // ==================== BLOCKQUOTE ====================
    html = html.replace(
        /^> (.*)$/gm,
        "<blockquote>$1</blockquote>"
    );

    // ==================== UNORDERED LIST ====================
    html = html.replace(
        /^\- (.*)$/gm,
        "<li>$1</li>"
    );

    html = html.replace(
        /(<li>.*<\/li>)/gs,
        "<ul>$1</ul>"
    );

    // ==================== PARAGRAPH HANDLER ====================
    html = html
        .split(/\n{2,}/)
        .map((block) => {
            const trimmed = block.trim();

            if (!trimmed) return "";

            if (
                trimmed.startsWith("<div") ||
                trimmed.startsWith("<ul") ||
                trimmed.startsWith("<pre") ||
                trimmed.startsWith("<h1") ||
                trimmed.startsWith("<h2") ||
                trimmed.startsWith("<h3") ||
                trimmed.startsWith("<blockquote")
            ) {
                return trimmed;
            }

            return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
        })
        .join("");

    return html;
}

// ==================== COPY CODE BUTTON ====================
function attachCopyListeners(container) {
    container.querySelectorAll(".copy-code-btn").forEach((btn) => {
        btn.onclick = async () => {
            const code = btn.getAttribute("data-code");

            try {
                await navigator.clipboard.writeText(code);

                const oldText = btn.textContent;

                btn.textContent = "✔️ Copied!";

                setTimeout(() => {
                    btn.textContent = oldText;
                }, 2000);
            } catch (err) {
                btn.textContent = "❌ Failed";

                setTimeout(() => {
                    btn.textContent = "📂 Copy";
                }, 2000);
            }
        };
    });
}

// ==================== SCROLL TO BOTTOM ====================
function scrollToBottom() {
    requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

// ==================== ADD MESSAGE ====================
function addMessageToChat(role, content) {
    const messageEl = document.createElement("div");

    messageEl.className = `message ${role}-message`;

    if (role === "assistant") {
        const htmlContent = renderMarkdown(content);

        messageEl.innerHTML = `
            <div class="message-content">
                ${htmlContent}
            </div>
        `;

        attachCopyListeners(messageEl);
    } else {
        messageEl.innerHTML = `
            <div class="message-content">
                <p>${escapeHtml(content)}</p>
            </div>
        `;
    }

    chatMessages.appendChild(messageEl);

    scrollToBottom();

    return messageEl;
}

// ==================== SEND MESSAGE ====================
async function sendMessage() {
    const message = userInput.value.trim();

    if (!message || isProcessing) {
        return;
    }

    isProcessing = true;

    userInput.disabled = true;
    sendButton.disabled = true;

    addMessageToChat("user", message);

    chatHistory.push({
        role: "user",
        content: message,
    });

    userInput.value = "";
    userInput.style.height = "auto";

    typingIndicator.classList.add("visible");

    try {
        const assistantMessageEl = document.createElement("div");

        assistantMessageEl.className =
            "message assistant-message";

        assistantMessageEl.innerHTML =
            '<div class="message-content"></div>';

        chatMessages.appendChild(assistantMessageEl);

        const assistantContentDiv =
            assistantMessageEl.querySelector(".message-content");

        scrollToBottom();

        const response = await fetch("/api/chat", {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                messages: chatHistory,
            }),
        });

        if (!response.ok || !response.body) {
            throw new Error("Failed to get response");
        }

        const reader = response.body.getReader();

        const decoder = new TextDecoder();

        let responseText = "";

        let buffer = "";

        const flushText = () => {
            assistantContentDiv.innerHTML =
                renderMarkdown(responseText);

            attachCopyListeners(assistantMessageEl);

            scrollToBottom();
        };

        while (true) {
            const { done, value } =
                await reader.read();

            if (done) break;

            buffer += decoder.decode(value, {
                stream: true,
            });

            const parsed = consumeSseEvents(buffer);

            buffer = parsed.buffer;

            for (const data of parsed.events) {
                if (data === "[DONE]") {
                    continue;
                }

                try {
                    const jsonData = JSON.parse(data);

                    let content = "";

                    if (
                        typeof jsonData.response === "string"
                    ) {
                        content = jsonData.response;
                    } else if (
                        jsonData.choices?.[0]?.delta?.content
                    ) {
                        content =
                            jsonData.choices[0].delta.content;
                    }

                    if (content) {
                        responseText += content;

                        flushText();
                    }
                } catch (err) {
                    console.error(
                        "SSE parse error:",
                        err
                    );
                }
            }
        }

        if (responseText.trim()) {
            chatHistory.push({
                role: "assistant",
                content: responseText,
            });
        }
    } catch (error) {
        console.error("Chat error:", error);

        addMessageToChat(
            "assistant",
            "Sorry, there was an error processing your request. 😓"
        );
    } finally {
        typingIndicator.classList.remove("visible");

        isProcessing = false;

        userInput.disabled = false;
        sendButton.disabled = false;

        userInput.focus();
    }
}

// ==================== SSE PARSER ====================
function consumeSseEvents(buffer) {
    let normalized = buffer.replace(/\r/g, "");

    const events = [];

    let eventEndIndex;

    while (
        (eventEndIndex = normalized.indexOf("\n\n")) !== -1
    ) {
        const rawEvent = normalized.slice(
            0,
            eventEndIndex
        );

        normalized = normalized.slice(
            eventEndIndex + 2
        );

        const lines = rawEvent.split("\n");

        const dataLines = [];

        for (const line of lines) {
            if (line.startsWith("data:")) {
                dataLines.push(
                    line.slice("data:".length).trimStart()
                );
            }
        }

        if (dataLines.length > 0) {
            events.push(dataLines.join("\n"));
        }
    }

    return {
        events,
        buffer: normalized,
    };
}

// ==================== INITIAL SCROLL ====================
scrollToBottom();
