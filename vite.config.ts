import { execSync, spawn } from "node:child_process";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import { promisify } from "node:util";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Connect } from "vite";
import {
	DEFAULT_START_PORT,
	DEFAULT_MAX_PORTS,
} from "./src/config/portForward";
import { setupTerminalMiddleware } from "./src/config/terminalMiddleware";
import {
	VALIDATION,
	SAFE_COMMANDS,
	isInternalAddress,
} from "./src/utils/security";
import { spawnAsync } from "./src/utils/node/spawn";

const lookup = promisify(dns.lookup);

// Get short git commit hash
let gitShortHash = "unknown";
try {
	gitShortHash = execSync("git rev-parse --short HEAD", {
		encoding: "utf-8",
	}).trim();
} catch {
	// Fallback if not in git repo
}

const activePortForwards = new Map<string, ReturnType<typeof spawn>>();

/**
 * Handler for /local/exec endpoint - works in both dev and preview
 *
 * SECURITY: Commands are executed via spawn(..., { shell: false }), which means
 * each array element is passed as a single argument. Shell metacharacters like | ; > <
 * inside an argument are treated as literal text by the target process (e.g. jq),
 * NOT as shell operators. Adding a regex to block them here breaks legitimate commands
 * (e.g. gh api --jq '.[] | {name}') without adding any real security benefit.
 *
 * The actual security guarantees come from:
 * 1. runCommand() requiring an array of arguments (rejecting strings)
 * 2. spawn() with shell: false, which bypasses the shell entirely
 */
const execHandler: Connect.NextHandleFunction = async (req, res) => {
	if (req.method !== "POST" && req.method !== "GET") {
		res.statusCode = 405;
		res.end("Method not allowed");
		return;
	}

	let args: string[] = [];
	let stdin = "";

	if (req.method === "POST") {
		let body = "";
		await new Promise((resolve) => {
			req.on("data", (chunk) => {
				body += chunk;
			});
			req.on("end", resolve);
		});
		try {
			const parsed = JSON.parse(body);
			args = parsed.args;
			stdin = parsed.stdin;
		} catch {
			res.statusCode = 400;
			res.end(JSON.stringify({ error: "Invalid JSON body" }));
			return;
		}
	} else {
		// GET method - args from query param (JSON stringified array)
		const url = new URL(req.url || "", `http://localhost`);
		const argsParam = url.searchParams.get("args") || "[]";
		try {
			args = JSON.parse(argsParam);
		} catch {
			args = [];
		}
	}

	if (!Array.isArray(args) || args.length === 0) {
		res.statusCode = 400;
		res.end(JSON.stringify({ error: "Missing or invalid args" }));
		return;
	}

	const command = args[0];
	if (!SAFE_COMMANDS.includes(command)) {
		res.statusCode = 403;
		res.end(
			JSON.stringify({
				error: `Command "${command}" is not in the allow-list`,
				success: false,
			}),
		);
		return;
	}

	// NOTE: Do NOT add a shell-metacharacter regex here.
	// With spawn(shell: false) these chars are harmless literal text.
	// A previous regex /[;&|><]/ broke all gh api --jq commands.
	// See: https://github.com/galiprandi/release-hub/issues/TODO

	console.log(`RUN: ${args.join(" ")}`);

	const result = await spawnAsync(args, stdin);

	if (result.success) {
		console.log(
			`SUCCESS: stdout length: ${result.stdout.length}, stderr length: ${result.stderr.length}`,
		);
		res.setHeader("Content-Type", "application/json");
		res.end(
			JSON.stringify({
				stdout: result.stdout,
				stderr: result.stderr,
				success: true,
			}),
		);
	} else {
		console.error(`ERROR executing command:`, result.error || "Command failed");
		res.setHeader("Content-Type", "application/json");
		res.end(
			JSON.stringify({
				error: result.error || "Command failed",
				stderr: result.stderr,
				stdout: result.stdout,
				success: false,
			}),
		);
	}
};

// Handler for /health-proxy endpoint - proxy health checks to avoid CORS
const healthProxyHandler: Connect.NextHandleFunction = async (req, res) => {
	if (req.method !== "GET") {
		res.statusCode = 405;
		res.end("Method not allowed");
		return;
	}

	const url = new URL(req.url || "", `http://localhost`);
	const targetUrl = url.searchParams.get("url");

	if (!targetUrl) {
		res.statusCode = 400;
		res.end(JSON.stringify({ error: "Missing url parameter" }));
		return;
	}

	try {
		const initialUrlObj = new URL(targetUrl);
		const originalHostname = initialUrlObj.hostname;

		// Initial hostname check
		if (isInternalAddress(originalHostname)) {
			res.statusCode = 403;
			res.end(
				JSON.stringify({ error: "Access to internal targets is forbidden" }),
			);
			return;
		}

		// DNS Rebinding Protection: Resolve hostname and check IPs
		let resolvedIp: string;
		try {
			const { address } = await lookup(originalHostname);
			resolvedIp = address;

			if (isInternalAddress(resolvedIp)) {
				res.statusCode = 403;
				res.end(
					JSON.stringify({ error: "Resolved IP is internal and forbidden" }),
				);
				return;
			}
		} catch (dnsError) {
			console.error(
				`[health-proxy] DNS resolution failed for ${originalHostname}:`,
				dnsError,
			);
			res.statusCode = 502;
			res.end(
				JSON.stringify({ error: `DNS resolution failed: ${originalHostname}` }),
			);
			return;
		}

		const healthUrl = targetUrl.endsWith("/")
			? `${targetUrl}health`
			: `${targetUrl}/health`;
		console.log(
			`[health-proxy] Checking: ${healthUrl} (Resolved: ${resolvedIp})`,
		);

		const targetUrlObj = new URL(healthUrl);

		const isHttps = targetUrlObj.protocol === "https:";
		const port = targetUrlObj.port || (isHttps ? 443 : 80);
		const options = {
			hostname: resolvedIp, // Use resolved IP to prevent DNS Rebinding
			port,
			path: targetUrlObj.pathname + targetUrlObj.search,
			method: "GET",
			rejectUnauthorized: false, // Ignore SSL certificate errors
			servername: originalHostname, // CRITICAL: Required for SNI and certificate validation when hostname is an IP
			timeout: 5000,
			headers: {
				Accept: "application/json",
				Host: originalHostname, // Pass original hostname for virtual hosting
			},
		};

		const proxyReq = (isHttps ? https : http).request(options, (proxyRes) => {
			let data = "";
			proxyRes.on("data", (chunk) => {
				data += chunk;
			});
			proxyRes.on("end", () => {
				console.log(
					`[health-proxy] Success: ${healthUrl} -> ${proxyRes.statusCode}`,
				);
				res.setHeader("Content-Type", "application/json");
				res.statusCode = proxyRes.statusCode || 200;
				res.end(
					JSON.stringify({
						status: proxyRes.statusCode,
						statusText: proxyRes.statusMessage,
						data: data,
						headers: proxyRes.headers,
					}),
				);
			});
		});

		proxyReq.on("error", (error) => {
			console.error(`[health-proxy] Error: ${healthUrl} ->`, error.message);
			res.setHeader("Content-Type", "application/json");
			res.statusCode = 502;
			res.end(
				JSON.stringify({
					error: error.message,
					targetUrl: targetUrl,
					type: error.name,
				}),
			);
		});

		proxyReq.on("timeout", () => {
			console.error(`[health-proxy] Timeout: ${healthUrl}`);
			proxyReq.destroy();
			res.setHeader("Content-Type", "application/json");
			res.statusCode = 504;
			res.end(
				JSON.stringify({
					error: "Timeout",
					targetUrl: targetUrl,
					type: "TimeoutError",
				}),
			);
		});

		proxyReq.end();
	} catch (error) {
		console.error(`[health-proxy] Error: ${targetUrl} ->`, error);
		res.setHeader("Content-Type", "application/json");
		res.statusCode = 502;
		res.end(
			JSON.stringify({
				error: error instanceof Error ? error.message : "Health check failed",
				targetUrl: targetUrl,
				type: error instanceof Error ? error.name : "Unknown",
			}),
		);
	}
};

// Handler for /local/script endpoint - executes scripts based on action
const scriptHandler: Connect.NextHandleFunction = async (req, res) => {
	if (req.method !== "POST") {
		res.statusCode = 405;
		res.end("Method not allowed");
		return;
	}

	let body = "";
	await new Promise((resolve) => {
		req.on("data", (chunk) => {
			body += chunk;
		});
		req.on("end", resolve);
	});

	let repo = "Cencosud-xlabs/yumi-ticket-control";
	let action = "trigger-staging-redeploy";

	try {
		const parsed = JSON.parse(body);
		repo = parsed.repo || repo;
		action = parsed.action || action;
	} catch {
		// Use defaults if body is invalid
	}

	// Sanitize action and repo to prevent path traversal and argument injection
	// Strict allow-list for action ensures it stays within authorized scripts in ./scripts/
	if (!VALIDATION.scripts.test(action)) {
		res.statusCode = 403;
		res.end(
			JSON.stringify({
				error: `Action "${action}" is not in the allow-list`,
				success: false,
			}),
		);
		return;
	}

	// Repo should follow org/repo pattern (alphanumeric, hyphen, underscore, dot, slash)
	// Explicitly disallow .. and ensure it doesn't start with a hyphen to prevent flag injection
	if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(repo) || repo.includes("..")) {
		res.statusCode = 400;
		res.end(JSON.stringify({ error: "Invalid repo name", success: false }));
		return;
	}

	const scriptPath = `./scripts/${action}.sh`;
	const args = [scriptPath, repo];

	console.log(`RUN: ${args.join(" ")}`);

	try {
		const { stdout, stderr, success, error } = await spawnAsync(args);
		if (!success) throw new Error(error || "Script failed");

		// Extract PR URL from output
		const prUrlMatch = stdout.match(
			/https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/,
		);
		const prUrl = prUrlMatch ? prUrlMatch[0] : null;

		res.setHeader("Content-Type", "application/json");
		res.end(
			JSON.stringify({
				prUrl,
				stdout,
				stderr,
				success: true,
			}),
		);
	} catch (error) {
		res.statusCode = 500;
		res.end(
			JSON.stringify({
				error:
					error instanceof Error ? error.message : "Script execution failed",
				stderr:
					error instanceof Error && "stderr" in error
						? (error as { stderr: string }).stderr
						: "",
				success: false,
			}),
		);
	}
};

// Handler for /local/k8s-logs-stream endpoint - SSE streaming for Kubernetes logs
const k8sLogsStreamHandler: Connect.NextHandleFunction = (req, res) => {
	if (req.method !== "GET") {
		res.statusCode = 405;
		res.end("Method not allowed");
		return;
	}

	const url = new URL(req.url || "", `http://localhost`);
	const resourceType = url.searchParams.get("resourceType") || "pod";
	const name = url.searchParams.get("name");
	const namespace = url.searchParams.get("namespace");
	const context = url.searchParams.get("context");

	if (!name || !VALIDATION.k8sName.test(name)) {
		res.statusCode = 400;
		res.end(JSON.stringify({ error: "Invalid or missing name parameter" }));
		return;
	}

	if (!VALIDATION.resourceType.test(resourceType)) {
		res.statusCode = 400;
		res.end(JSON.stringify({ error: "Invalid resourceType" }));
		return;
	}

	if (namespace && !VALIDATION.k8sNamespace.test(namespace)) {
		res.statusCode = 400;
		res.end(JSON.stringify({ error: "Invalid namespace" }));
		return;
	}

	if (context && !VALIDATION.context.test(context)) {
		res.statusCode = 400;
		res.end(JSON.stringify({ error: "Invalid context" }));
		return;
	}

	// Set SSE headers
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");
	res.setHeader("Access-Control-Allow-Origin", "*");

	console.log(
		`[k8s-logs-stream] Starting: ${resourceType}/${name} in namespace: ${namespace || "default"}`,
	);

	// Build kubectl logs command with -f (follow)
	if (resourceType === "deployment") {
		// For deployments, we need to get the selector first
		const args = [
			"kubectl",
			"get",
			"deployment",
			name,
			"-o",
			"jsonpath={.spec.selector.matchLabels}",
		];
		if (namespace) args.push("-n", namespace);
		if (context) args.push("--context", context);

		spawnAsync(args).then(({ stdout, success, error }) => {
			if (!success) {
				res.write(
					`data: ${JSON.stringify({ error: error || "Failed to get deployment selector" })}\n\n`,
				);
				res.end();
				return;
			}

			const selector = stdout.trim();
			if (!selector) {
				res.write(
					`data: ${JSON.stringify({ error: "No selector found for deployment" })}\n\n`,
				);
				res.end();
				return;
			}

			try {
				const labels = JSON.parse(selector);
				const labelSelector = Object.entries(labels)
					.map(([k, v]) => `${k}=${v}`)
					.join(",");

				// First check if there are pods with this selector
				const checkArgs = [
					"kubectl",
					"get",
					"pods",
					"-l",
					labelSelector,
					"-o",
					"jsonpath={.items}",
				];
				if (namespace) checkArgs.push("-n", namespace);
				if (context) checkArgs.push("--context", context);

				spawnAsync(checkArgs).then(
					({
						stdout: checkStdout,
						success: checkSuccess,
						error: checkError,
					}) => {
						if (!checkSuccess) {
							res.write(
								`data: ${JSON.stringify({ error: checkError || "Failed to check pods" })}\n\n`,
							);
							res.end();
							return;
						}

						const podsJson = checkStdout.trim();
						if (!podsJson || podsJson === "null" || podsJson === "[]") {
							res.write(
								`data: ${JSON.stringify({ error: "No pods found for this deployment" })}\n\n`,
							);
							res.end();
							return;
						}

						// Pods exist, proceed with logs
						const logsArgs = [
							"kubectl",
							"logs",
							"-l",
							labelSelector,
							"-f",
							"--tail=100",
						];
						if (namespace) logsArgs.push("-n", namespace);
						if (context) logsArgs.push("--context", context);

						const logsProcess = spawn(logsArgs[0], logsArgs.slice(1), {
							shell: false,
						});

						logsProcess.stdout.on("data", (data) => {
							const lines = data.toString().split("\n").filter(Boolean);
							lines.forEach((line: string) => {
								res.write(`data: ${line}\n\n`);
							});
						});

						logsProcess.stderr.on("data", (data) => {
							const lines = data.toString().split("\n").filter(Boolean);
							lines.forEach((line: string) => {
								res.write(`data: ${line}\n\n`);
							});
						});

						logsProcess.on("error", (err) => {
							console.error(`[k8s-logs-stream] Error:`, err);
							res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
							res.end();
						});

						logsProcess.on("close", (code) => {
							console.log(`[k8s-logs-stream] Closed with code: ${code}`);
							res.end();
						});

						req.on("close", () => {
							console.log(`[k8s-logs-stream] Client disconnected`);
							logsProcess.kill();
						});
					},
				);
			} catch {
				res.write(
					`data: ${JSON.stringify({ error: "Failed to parse selector" })}\n\n`,
				);
				res.end();
			}
		});
	} else {
		// For pods
		// First check if pod exists
		const checkArgs = [
			"kubectl",
			"get",
			"pod",
			name,
			"-o",
			"jsonpath={.metadata.name}",
		];
		if (namespace) checkArgs.push("-n", namespace);
		if (context) checkArgs.push("--context", context);

		spawnAsync(checkArgs).then(
			({ stdout: checkStdout, success: checkSuccess, error: checkError }) => {
				if (!checkSuccess) {
					res.write(
						`data: ${JSON.stringify({ error: checkError || "Pod not found" })}\n\n`,
					);
					res.end();
					return;
				}

				const podName = checkStdout.trim();
				if (!podName) {
					res.write(`data: ${JSON.stringify({ error: "Pod not found" })}\n\n`);
					res.end();
					return;
				}

				const logsArgs = ["kubectl", "logs", name, "-f", "--tail=100"];
				if (namespace) logsArgs.push("-n", namespace);
				if (context) logsArgs.push("--context", context);

				const logsProcess = spawn(logsArgs[0], logsArgs.slice(1), {
					shell: false,
				});

				logsProcess.stdout.on("data", (data) => {
					const lines = data.toString().split("\n").filter(Boolean);
					lines.forEach((line: string) => {
						res.write(`data: ${line}\n\n`);
					});
				});

				logsProcess.stderr.on("data", (data) => {
					const lines = data.toString().split("\n").filter(Boolean);
					lines.forEach((line: string) => {
						res.write(`data: ${line}\n\n`);
					});
				});

				logsProcess.on("error", (err) => {
					console.error(`[k8s-logs-stream] Error:`, err);
					res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
					res.end();
				});

				logsProcess.on("close", (code) => {
					console.log(`[k8s-logs-stream] Closed with code: ${code}`);
					res.end();
				});

				req.on("close", () => {
					console.log(`[k8s-logs-stream] Client disconnected`);
					logsProcess.kill();
				});
			},
		);
	}
};

// Handler for /local/port-free endpoint - find a free local port
const portFreeHandler: Connect.NextHandleFunction = async (req, res) => {
	if (req.method !== "GET") {
		res.statusCode = 405;
		res.end("Method not allowed");
		return;
	}

	const url = new URL(req.url || "", `http://localhost`);
	const startPort = parseInt(
		url.searchParams.get("startPort") || String(DEFAULT_START_PORT),
		10,
	);
	const max = parseInt(
		url.searchParams.get("max") || String(DEFAULT_MAX_PORTS),
		10,
	);

	if (Number.isNaN(startPort) || startPort < 1024 || startPort > 65535) {
		res.statusCode = 400;
		res.end(JSON.stringify({ error: "Invalid startPort" }));
		return;
	}

	if (Number.isNaN(max) || max < 1 || max > 100) {
		res.statusCode = 400;
		res.end(JSON.stringify({ error: "Invalid max parameter" }));
		return;
	}

	// Collect ports already used by active port-forwards
	const activePorts = new Set(
		Array.from(activePortForwards.values())
			.map(
				(proc) =>
					(proc as unknown as { _pfMeta?: { localPort: number } })._pfMeta
						?.localPort,
			)
			.filter((p): p is number => p != null),
	);

	let port: number | null = null;
	for (let p = startPort; p < startPort + max; p++) {
		if (activePorts.has(p)) continue;
		const { stdout, success } = await spawnAsync(["lsof", "-ti", `:${p}`]);
		if (!success || !stdout.trim()) {
			port = p;
			break;
		}
	}

	res.setHeader("Content-Type", "application/json");
	res.end(JSON.stringify({ port }));
};

// Handler for /local/port-forward endpoint - manage kubectl port-forward processes
const portForwardHandler: Connect.NextHandleFunction = async (req, res) => {
	if (req.method === "GET") {
		const forwards = Array.from(activePortForwards.entries()).map(
			([key, proc]) => {
				const [context, namespace, deployment] = key.split("/");
				return {
					context,
					namespace,
					deployment,
					localPort:
						(
							proc as unknown as {
								_pfMeta?: { localPort: number; remotePort: number };
							}
						)._pfMeta?.localPort || 0,
					remotePort:
						(
							proc as unknown as {
								_pfMeta?: { localPort: number; remotePort: number };
							}
						)._pfMeta?.remotePort || 0,
				};
			},
		);
		res.setHeader("Content-Type", "application/json");
		res.end(JSON.stringify({ portForwards: forwards }));
		return;
	}

	if (req.method === "DELETE") {
		let body = "";
		await new Promise((resolve) => {
			req.on("data", (chunk) => {
				body += chunk;
			});
			req.on("end", resolve);
		});
		let payload: { deployment?: string; namespace?: string; context?: string } =
			{};
		try {
			payload = JSON.parse(body);
		} catch {
			res.statusCode = 400;
			res.end(JSON.stringify({ error: "Invalid JSON body", success: false }));
			return;
		}
		const { deployment, namespace, context } = payload;
		if (
			!deployment ||
			!namespace ||
			!VALIDATION.k8sName.test(deployment) ||
			!VALIDATION.k8sNamespace.test(namespace)
		) {
			res.statusCode = 400;
			res.end(
				JSON.stringify({
					error: "Invalid or missing deployment/namespace",
					success: false,
				}),
			);
			return;
		}
		if (context && !VALIDATION.context.test(context)) {
			res.statusCode = 400;
			res.end(JSON.stringify({ error: "Invalid context", success: false }));
			return;
		}

		const key = `${context || ""}/${namespace}/${deployment}`;
		const existing = activePortForwards.get(key);
		if (existing) {
			existing.kill();
			activePortForwards.delete(key);
		}
		res.setHeader("Content-Type", "application/json");
		res.end(JSON.stringify({ success: true }));
		return;
	}

	if (req.method === "POST") {
		let body = "";
		await new Promise((resolve) => {
			req.on("data", (chunk) => {
				body += chunk;
			});
			req.on("end", resolve);
		});
		let payload: {
			deployment?: string;
			namespace?: string;
			context?: string;
			localPort?: number;
			remotePort?: number;
		} = {};
		try {
			payload = JSON.parse(body);
		} catch {
			res.statusCode = 400;
			res.end(JSON.stringify({ error: "Invalid JSON body", success: false }));
			return;
		}
		const { deployment, namespace, context } = payload;
		if (
			!deployment ||
			!namespace ||
			!VALIDATION.k8sName.test(deployment) ||
			!VALIDATION.k8sNamespace.test(namespace)
		) {
			res.statusCode = 400;
			res.end(
				JSON.stringify({
					error: "Invalid or missing deployment/namespace",
					success: false,
				}),
			);
			return;
		}
		if (context && !VALIDATION.context.test(context)) {
			res.statusCode = 400;
			res.end(JSON.stringify({ error: "Invalid context", success: false }));
			return;
		}

		const key = `${context || ""}/${namespace}/${deployment}`;
		const localPort = Number(payload.localPort);
		const remotePort = Number(payload.remotePort);
		if (!localPort || !remotePort) {
			res.statusCode = 400;
			res.end(
				JSON.stringify({
					error: "Missing localPort or remotePort",
					success: false,
				}),
			);
			return;
		}

		const existing = activePortForwards.get(key);
		if (existing) {
			existing.kill();
			activePortForwards.delete(key);
		}

		const args = [
			"kubectl",
			"port-forward",
			`deployment/${deployment}`,
			`${localPort}:${remotePort}`,
			"-n",
			namespace,
		];
		if (context) args.push(`--context=${context}`);

		console.log(`[port-forward] Starting: ${args.join(" ")}`);
		const proc = spawn(args[0], args.slice(1), { shell: false });

		(
			proc as unknown as { _pfMeta: { localPort: number; remotePort: number } }
		)._pfMeta = { localPort, remotePort };

		let stderrBuffer = "";
		proc.stderr.on("data", (data) => {
			stderrBuffer += data.toString();
			console.error(
				`[port-forward] stderr for ${key}:`,
				data.toString().trim(),
			);
		});

		proc.on("error", (err) => {
			console.error(`[port-forward] Error for ${key}:`, err.message);
			activePortForwards.delete(key);
		});

		proc.on("close", (code) => {
			console.log(`[port-forward] Closed for ${key} with code:`, code);
			activePortForwards.delete(key);
		});

		activePortForwards.set(key, proc);

		const startTime = Date.now();
		await new Promise((resolve) => {
			const interval = setInterval(() => {
				if (proc.killed || Date.now() - startTime > 3000) {
					clearInterval(interval);
					resolve(undefined);
				}
			}, 200);
		});

		if (
			proc.killed ||
			stderrBuffer.toLowerCase().includes("error") ||
			stderrBuffer.toLowerCase().includes("forbidden")
		) {
			proc.kill();
			activePortForwards.delete(key);
			const rawError = stderrBuffer.trim();
			const errorMsg = rawError.toLowerCase().includes("forbidden")
				? "Prohibido"
				: rawError || "Port-forward failed";
			res.setHeader("Content-Type", "application/json");
			res.statusCode = 200;
			res.end(JSON.stringify({ error: errorMsg, success: false }));
			return;
		}

		res.setHeader("Content-Type", "application/json");
		res.end(JSON.stringify({ success: true }));
		return;
	}

	res.statusCode = 405;
	res.end("Method not allowed");
};

// https://vite.dev/config/
export default defineConfig({
	define: {
		"import.meta.env.VITE_GIT_COMMIT_HASH": JSON.stringify(gitShortHash),
	},
	plugins: [
		tanstackRouter(),
		react({
			babel: {
				plugins: [["babel-plugin-react-compiler"]],
			},
		}),
		tailwindcss(),
		{
			name: "cmd",
			configureServer(server) {
				if (server.httpServer) {
					setupTerminalMiddleware(server.httpServer);
				}
				// Generic exec endpoint - executes any bash command
				server.middlewares.use("/local/exec", execHandler);
				// Script endpoint - executes scripts based on action
				server.middlewares.use("/local/script", scriptHandler);
				// Health proxy endpoint - avoids CORS when checking service health
				server.middlewares.use("/health-proxy", healthProxyHandler);
				// Kubernetes logs stream endpoint - SSE streaming for k8s logs
				server.middlewares.use("/local/k8s-logs-stream", k8sLogsStreamHandler);
				// Port forward endpoint - manage kubectl port-forward processes
				server.middlewares.use("/local/port-forward", portForwardHandler);
				// Port free endpoint - find a free local port
				server.middlewares.use("/local/port-free", portFreeHandler);
			},
			configurePreviewServer(server) {
				if (server.httpServer) {
					setupTerminalMiddleware(server.httpServer);
				}
				// Same endpoint for preview mode
				server.middlewares.use("/local/exec", execHandler);
				server.middlewares.use("/local/script", scriptHandler);
				server.middlewares.use("/health-proxy", healthProxyHandler);
				server.middlewares.use("/local/k8s-logs-stream", k8sLogsStreamHandler);
				server.middlewares.use("/local/port-forward", portForwardHandler);
				server.middlewares.use("/local/port-free", portFreeHandler);
			},
		},
	],
	resolve: {
		alias: {
			"@": "/src",
		},
	},
	build: {
		chunkSizeWarningLimit: 1000,
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					// React ecosystem
					if (id.includes("react") || id.includes("react-dom")) {
						return "react";
					}
					// TanStack ecosystem
					if (
						id.includes("@tanstack/react-query") ||
						id.includes("@tanstack/react-router")
					) {
						return "tanstack";
					}
					// UI components
					if (id.includes("lucide-react")) {
						return "ui";
					}
				},
			},
		},
	},
	server: {
		proxy: {
			"/api": {
				target: "https://seki-bff-api.cencosudx.com",
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ""),
			},
		},
	},
	preview: {
		port: 30779,
		strictPort: true,
	},
});
