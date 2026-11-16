import assert from "node:assert/strict";
import test from "node:test";

import {
	assertAllowedEndpoint,
	DEFAULT_PROVIDER_SETTINGS,
	HostNotAllowedError,
	ollamaProvider,
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

test("ollamaProvider llama a /api/generate sin stream y solo a hosts permitidos", async () => {
	const calls = [];
	const post = async (url, body) => (calls.push({ url, body }), { response: "Hola." });
	const settings = { ...DEFAULT_PROVIDER_SETTINGS, endpoint: "http://127.0.0.1:11434/", model: "llama3.2" };
	assert.equal(await ollamaProvider(settings, post).complete("Escribe."), "Hola.");
	assert.deepEqual(calls, [
		{ url: "http://127.0.0.1:11434/api/generate", body: { model: "llama3.2", prompt: "Escribe.", stream: false } },
	]);

	const cloud = { ...settings, endpoint: "https://api.example.com" };
	await assert.rejects(ollamaProvider(cloud, post).complete("x"), HostNotAllowedError);
	await assert.rejects(ollamaProvider({ ...settings, model: "" }, post).complete("x"), /modelo/);
	assert.equal(calls.length, 1);
});
