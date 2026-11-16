export interface ProviderSettings {
	endpoint: string;
	cloudOptIn: boolean;
	allowedHosts: string[];
	/** Model name the endpoint serves, e.g. `llama3.2`. */
	model: string;
}

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
	endpoint: "",
	cloudOptIn: false,
	allowedHosts: [],
	model: "",
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export class HostNotAllowedError extends Error {
	constructor(host: string) {
		super(
			`Host no permitido: ${host}. Si es local, usa localhost. Si es nube, actívala y añádelo a la lista blanca.`,
		);
		this.name = "HostNotAllowedError";
	}
}

export function endpointHost(endpoint: string): string {
	let hostname: string;
	try {
		hostname = new URL(endpoint).hostname;
	} catch {
		throw new HostNotAllowedError(endpoint);
	}
	if (hostname.startsWith("[") && hostname.endsWith("]")) {
		return hostname.slice(1, -1);
	}
	return hostname;
}

export function assertAllowedEndpoint(settings: ProviderSettings, endpoint: string): void {
	const host = endpointHost(endpoint);
	if (LOCAL_HOSTS.has(host)) {
		return;
	}
	if (settings.cloudOptIn && settings.allowedHosts.includes(host)) {
		return;
	}
	throw new HostNotAllowedError(host);
}

/** POST JSON, return parsed JSON. Obsidian's `requestUrl` in the plugin, a stub in tests. */
export type PostJson = (url: string, body: unknown) => Promise<unknown>;

/** Ollama `/api/generate`, non-streaming. The host check runs before every call. */
export function ollamaProvider(settings: ProviderSettings, post: PostJson): { complete(prompt: string): Promise<string> } {
	return {
		async complete(prompt) {
			if (settings.endpoint.length === 0 || settings.model.length === 0) {
				throw new Error("Configura endpoint y modelo en los ajustes de Atlas.");
			}
			assertAllowedEndpoint(settings, settings.endpoint);
			const url = `${settings.endpoint.replace(/\/+$/, "")}/api/generate`;
			const reply = (await post(url, { model: settings.model, prompt, stream: false })) as { response?: unknown };
			return typeof reply?.response === "string" ? reply.response : "";
		},
	};
}
