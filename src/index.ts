/**
 * READTalk - Anna Laura AI LLM App
 * 
 * This template demonstrates how to implement Anna Laura an LLM-powered chat interface with
 * streaming responses using Server-Sent Events (SSE).
 *
 * @license MIT
 */
import { Env, ChatMessage } from "./types";

// Model ID for Workers AI model
const MODEL_ID = "@cf/meta/llama-3.1-8b-instruct-fp8";

// Default system prompt
const SYSTEM_PROMPT =
	"introduce yourself by the nickname Laura to attention a conversation. You are a helpful and friendly assistant. Provide concise and accurate responses. Anna Laura AI is part of READTalk Messenger, a Chat application developed by SOEPARNO ENTERPRISE Corp., a digital company from Sukabumi City, West Java, Indonesia.";

export default {
	/**
	 * Main request handler for the Worker
	 */
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		const url = new URL(request.url);

		// Handle static assets (frontend)
		if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
			return env.ASSETS.fetch(request);
		}

		// API Routes
		if (url.pathname === "/api/chat") {
			if (request.method === "POST") {
				return handleChatRequest(request, env);
			}
			return new Response("Method not allowed", { status: 405 });
		}

		// ==================== NEW: NEWS API ====================
		if (url.pathname === "/api/news") {
			if (request.method === "GET") {
				return handleNewsRequest();
			}
			return new Response("Method not allowed", { status: 405 });
		}

		// Handle 404 for unmatched routes
		return new Response("Not found", { status: 404 });
	},
} satisfies ExportedHandler<Env>;

/**
 * Handles chat API requests
 */
async function handleChatRequest(
	request: Request,
	env: Env,
): Promise<Response> {
	try {
		const { messages = [] } = (await request.json()) as {
			messages: ChatMessage[];
		};

		if (!messages.some((msg) => msg.role === "system")) {
			messages.unshift({ role: "system", content: SYSTEM_PROMPT });
		}

		const stream = await env.AI.run(
			MODEL_ID,
			{
				messages,
				max_tokens: 1024,
				stream: true,
			},
		);

		return new Response(stream, {
			headers: {
				"content-type": "text/event-stream; charset=utf-8",
				"cache-control": "no-cache",
				connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error("Error processing chat request:", error);
		return new Response(
			JSON.stringify({ error: "Failed to process request" }),
			{
				status: 500,
				headers: { "content-type": "application/json" },
			},
		);
	}
}

// ==================== NEW: NEWS API HANDLER ====================
/**
 * Handles news API request - mengambil RSS dari Google News
 */
async function handleNewsRequest(): Promise<Response> {
	try {
		// Google News RSS feed (Top headlines in English/International)
		const rssUrl = 'https://news.google.com/rss?hl=en&gl=US&ceid=US:en';
		
		const response = await fetch(rssUrl);
		if (!response.ok) {
			throw new Error(`Failed to fetch RSS: ${response.status}`);
		}
		
		const rssText = await response.text();
		
		// Parse RSS XML sederhana (tanpa library eksternal)
		const items: { title: string; link: string; pubDate: string }[] = [];
		
		// Extract item tags
		const itemRegex = /<item>([\s\S]*?)<\/item>/g;
		const titleRegex = /<title>(.*?)<\/title>/;
		const linkRegex = /<link>(.*?)<\/link>/;
		const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
		
		let match;
		while ((match = itemRegex.exec(rssText)) !== null && items.length < 10) {
			const itemContent = match[1];
			const titleMatch = itemContent.match(titleRegex);
			const linkMatch = itemContent.match(linkRegex);
			const pubDateMatch = itemContent.match(pubDateRegex);
			
			if (titleMatch && linkMatch) {
				// Decode HTML entities
				const title = titleMatch[1]
					.replace(/&amp;/g, '&')
					.replace(/&lt;/g, '<')
					.replace(/&gt;/g, '>')
					.replace(/&quot;/g, '"')
					.replace(/&#39;/g, "'");
					
				items.push({
					title: title,
					link: linkMatch[1],
					pubDate: pubDateMatch ? pubDateMatch[1] : '',
				});
			}
		}
		
		return new Response(JSON.stringify({
			success: true,
			count: items.length,
			articles: items,
			source: 'Google News RSS',
			lastUpdated: new Date().toISOString(),
		}), {
			headers: {
				'content-type': 'application/json',
				'cache-control': 'public, max-age=300', // cache 5 menit
			},
		});
		
	} catch (error) {
		console.error('Error fetching news:', error);
		return new Response(
			JSON.stringify({
				success: false,
				error: 'Failed to fetch news',
				articles: [],
			}),
			{
				status: 500,
				headers: { 'content-type': 'application/json' },
			},
		);
	}
}
