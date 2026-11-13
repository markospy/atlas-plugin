import assert from "node:assert/strict";
import test from "node:test";

import {
	assertAllowedEndpoint,
	DEFAULT_PROVIDER_SETTINGS,
	HostNotAllowedError,
} from "../src/providers.ts";

const local = { ...DEFAULT_PROVIDER_SETTINGS };

test("localhost pasa y un host no listado falla", () => {
	assert.doesNotThrow(() => assertAllowedEndpoint(local, "http://127.0.0.1:11434"));
	assert.doesNotThrow(() => assertAllowedEndpoint(local, "http://localhost:1234/v1"));
	assert.throws(
		() => assertAllowedEndpoint(local, "https://api.openai.com/v1"),
		HostNotAllowedError,
	);
	assert.throws(
		() => assertAllowedEndpoint(local, "http://192.168.1.20:11434"),
		HostNotAllowedError,
	);
});

test("la nube solo entra con opt-in y el host en la lista blanca", () => {
	const opted = { ...local, cloudOptIn: true, allowedHosts: ["api.openai.com"] };
	assert.doesNotThrow(() => assertAllowedEndpoint(opted, "https://api.openai.com/v1"));
	assert.throws(
		() => assertAllowedEndpoint(opted, "https://generativelanguage.googleapis.com"),
		(error) => {
			assert.ok(error instanceof HostNotAllowedError);
			assert.match(error.message, /Host no permitido: generativelanguage.googleapis.com/);
			return true;
		},
	);
});
