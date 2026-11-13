export interface ProviderSettings {
	endpoint: string;
	cloudOptIn: boolean;
	allowedHosts: string[];
}

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
	endpoint: "",
	cloudOptIn: false,
	allowedHosts: [],
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
