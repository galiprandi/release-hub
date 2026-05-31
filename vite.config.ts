import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import http from "node:http";
import https from "node:https";
import type { Connect } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { DEFAULT_START_PORT, DEFAULT_MAX_PORTS } from "./src/config/portForward";
import { setupTerminalMiddleware } from "./src/config/terminalMiddleware";

const execAsync = promisify(exec);

const activePortForwards = new Map<string, ReturnType<typeof spawn>>();

// Handler for /local/exec endpoint - works in both dev and preview
const execHandler: Connect.NextHandleFunction = async (req, res) => {
	if (req.method !== "POST" && req.method !== "GET") {
		res.statusCode = 405;
		res.end("Method not allowed");
		return;
	}

	let command = "";

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
			command = parsed.command;
		} catch {
			res.statusCode = 400;
			res.end(JSON.stringify({ error: "Invalid JSON body" }));
			return;
		}
	} else {
		// GET method - command from query param
		const url = new URL(req.url || "", `http://localhost`);
		command = url.searchParams.get("command") || "";
	}

	if (!command || typeof command !== "string") {
		res.statusCode = 400;
		res.end(JSON.stringify({ error: "Missing command" }));
		return;
	}

	console.log(`RUN: ${command}`);

	try {
		const { stdout, stderr } = await execAsync(command);

		console.log(`SUCCESS: stdout length: ${stdout.length}, stderr length: ${stderr.length}`);

		res.setHeader("Content-Type", "application/json");
		res.end(JSON.stringify({ stdout, stderr, success: true }));
	} catch (error) {
		console.error(`ERROR executing command:`, error);
		res.setHeader("Content-Type", "application/json");
		res.end(
			JSON.stringify({
				error: error instanceof Error ? error.message : "Command failed",
				stderr:
					error instanceof Error && "stderr" in error
						? (error as { stderr: string }).stderr
						: "",
				stdout: error instanceof Error && "stdout" in error
					? (error as { stdout: string }).stdout
					: "",
				success: false,
			}),
		);
	}
};

// Handler for /health-proxy endpoint - proxy health checks to avoid CORS
const healthProxyHandler: Connect.NextHandleFunction = async (req, res) => {
	if (req.method !== 'GET') {
		res.statusCode = 405;
		res.end('Method not allowed');
		return;
	}

	const url = new URL(req.url || '', `http://localhost`);
	const targetUrl = url.searchParams.get('url');

	if (!targetUrl) {
		res.statusCode = 400;
		res.end(JSON.stringify({ error: 'Missing url parameter' }));
		return;
	}

	const healthUrl = targetUrl.endsWith('/') ? `${targetUrl}health` : `${targetUrl}/health`;
	console.log(`[health-proxy] Checking: ${healthUrl}`);

	try {
		const targetUrlObj = new URL(healthUrl);

		const isHttps = targetUrlObj.protocol === 'https:';
		const port = targetUrlObj.port || (isHttps ? 443 : 80);
		const options = {
			hostname: targetUrlObj.hostname,
			port,
			path: targetUrlObj.pathname + targetUrlObj.search,
			method: 'GET',
			rejectUnauthorized: false, // Ignore SSL certificate errors
			timeout: 5000,
			headers: {
				'Accept': 'application/json',
			},
		};

		const proxyReq = (isHttps ? https : http).request(options, (proxyRes) => {
			let data = '';
			proxyRes.on('data', (chunk) => {
				data += chunk;
			});
			proxyRes.on('end', () => {
				console.log(`[health-proxy] Success: ${healthUrl} -> ${proxyRes.statusCode}`);
				res.setHeader('Content-Type', 'application/json');
				res.statusCode = proxyRes.statusCode || 200;
				res.end(JSON.stringify({
					status: proxyRes.statusCode,
					statusText: proxyRes.statusMessage,
					data: data,
					headers: proxyRes.headers,
				}));
			});
		});

		proxyReq.on('error', (error) => {
			console.error(`[health-proxy] Error: ${healthUrl} ->`, error.message);
			res.setHeader('Content-Type', 'application/json');
			res.statusCode = 502;
			res.end(JSON.stringify({
				error: error.message,
				targetUrl: targetUrl,
				type: error.name,
			}));
		});

		proxyReq.on('timeout', () => {
			console.error(`[health-proxy] Timeout: ${healthUrl}`);
			proxyReq.destroy();
			res.setHeader('Content-Type', 'application/json');
			res.statusCode = 504;
			res.end(JSON.stringify({
				error: 'Timeout',
				targetUrl: targetUrl,
				type: 'TimeoutError',
			}));
		});

		proxyReq.end();
	} catch (error) {
		console.error(`[health-proxy] Error: ${targetUrl} ->`, error);
		res.setHeader('Content-Type', 'application/json');
		res.statusCode = 502;
		res.end(JSON.stringify({
			error: error instanceof Error ? error.message : 'Health check failed',
			targetUrl: targetUrl,
			type: error instanceof Error ? error.name : 'Unknown',
		}));
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

	const scriptPath = `./scripts/${action}.sh`;
	const command = `${scriptPath} ${repo}`;

	console.log(`RUN: ${command}`);

	try {
		const { stdout, stderr } = await execAsync(command);

		// Extract PR URL from output
		const prUrlMatch = stdout.match(/https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/);
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
				error: error instanceof Error ? error.message : "Script execution failed",
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

	if (!name) {
		res.statusCode = 400;
		res.end(JSON.stringify({ error: "Missing name parameter" }));
		return;
	}

	// Set SSE headers
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");
	res.setHeader("Access-Control-Allow-Origin", "*");

	console.log(`[k8s-logs-stream] Starting: ${resourceType}/${name} in namespace: ${namespace || 'default'}`);

	// Build kubectl logs command with -f (follow)
	let command: string;
	if (resourceType === "deployment") {
		// For deployments, we need to get the selector first
		const nsFlag = namespace ? `-n ${namespace}` : "";
		const ctxFlag = context ? `--context=${context}` : "";
		command = `kubectl get deployment ${name} ${nsFlag} ${ctxFlag} -o jsonpath='{.spec.selector.matchLabels}'`;
		
		exec(command, (error, stdout) => {
			if (error) {
				res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
				res.end();
				return;
			}

			const selector = stdout.trim();
			if (!selector) {
				res.write(`data: ${JSON.stringify({ error: "No selector found for deployment" })}\n\n`);
				res.end();
				return;
			}

			try {
				const labels = JSON.parse(selector);
				const labelSelector = Object.entries(labels).map(([k, v]) => `${k}=${v}`).join(',');
				
				// First check if there are pods with this selector
				const checkCommand = `kubectl get pods ${nsFlag} ${ctxFlag} -l ${labelSelector} -o jsonpath='{.items}'`;
				exec(checkCommand, (checkError, checkStdout) => {
					if (checkError) {
						res.write(`data: ${JSON.stringify({ error: checkError.message })}\n\n`);
						res.end();
						return;
					}

					const podsJson = checkStdout.trim();
					if (!podsJson || podsJson === "null" || podsJson === "[]") {
						res.write(`data: ${JSON.stringify({ error: "No pods found for this deployment" })}\n\n`);
						res.end();
						return;
					}

					// Pods exist, proceed with logs
					const logsCommand = `kubectl logs ${nsFlag} ${ctxFlag} -l ${labelSelector} -f --tail=100`;

					const logsProcess = spawn(logsCommand, { shell: true });

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
				});
			} catch {
				res.write(`data: ${JSON.stringify({ error: "Failed to parse selector" })}\n\n`);
				res.end();
			}
		});
	} else {
		// For pods
		const nsFlag = namespace ? `-n ${namespace}` : "";
		const ctxFlag = context ? `--context=${context}` : "";
		
		// First check if pod exists
		const checkCommand = `kubectl get pod ${name} ${nsFlag} ${ctxFlag} -o jsonpath='{.metadata.name}'`;
		exec(checkCommand, (checkError, checkStdout) => {
			if (checkError) {
				res.write(`data: ${JSON.stringify({ error: checkError.message })}\n\n`);
				res.end();
				return;
			}

			const podName = checkStdout.trim();
			if (!podName) {
				res.write(`data: ${JSON.stringify({ error: "Pod not found" })}\n\n`);
				res.end();
				return;
			}

			const logsCommand = `kubectl logs ${name} ${nsFlag} ${ctxFlag} -f --tail=100`;

			const logsProcess = spawn(logsCommand, { shell: true });

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
		});
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
	const startPort = parseInt(url.searchParams.get("startPort") || String(DEFAULT_START_PORT), 10);
	const max = parseInt(url.searchParams.get("max") || String(DEFAULT_MAX_PORTS), 10);

	// Collect ports already used by active port-forwards
	const activePorts = new Set(
		Array.from(activePortForwards.values()).map(
			(proc) => (proc as unknown as { _pfMeta?: { localPort: number } })._pfMeta?.localPort
		).filter((p): p is number => p != null)
	);

	let port: number | null = null;
	for (let p = startPort; p < startPort + max; p++) {
		if (activePorts.has(p)) continue;
		try {
			const { stdout } = await execAsync(`lsof -ti :${p}`);
			if (!stdout.trim()) {
				port = p;
				break;
			}
		} catch {
			// lsof returns exit code 1 when port is free
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
		const forwards = Array.from(activePortForwards.entries()).map(([key, proc]) => {
			const [context, namespace, deployment] = key.split("/");
			return {
				context,
				namespace,
				deployment,
				localPort: (proc as unknown as { _pfMeta?: { localPort: number; remotePort: number } })._pfMeta?.localPort || 0,
				remotePort: (proc as unknown as { _pfMeta?: { localPort: number; remotePort: number } })._pfMeta?.remotePort || 0,
			};
		});
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
		let payload: { deployment?: string; namespace?: string; context?: string } = {};
		try {
			payload = JSON.parse(body);
		} catch {
			res.statusCode = 400;
			res.end(JSON.stringify({ error: "Invalid JSON body", success: false }));
			return;
		}
		const { deployment, namespace, context } = payload;
		if (!deployment || !namespace) {
			res.statusCode = 400;
			res.end(JSON.stringify({ error: "Missing deployment or namespace", success: false }));
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
		let payload: { deployment?: string; namespace?: string; context?: string; localPort?: number; remotePort?: number } = {};
		try {
			payload = JSON.parse(body);
		} catch {
			res.statusCode = 400;
			res.end(JSON.stringify({ error: "Invalid JSON body", success: false }));
			return;
		}
		const { deployment, namespace, context } = payload;
		if (!deployment || !namespace) {
			res.statusCode = 400;
			res.end(JSON.stringify({ error: "Missing deployment or namespace", success: false }));
			return;
		}

		const key = `${context || ""}/${namespace}/${deployment}`;
		const localPort = Number(payload.localPort);
		const remotePort = Number(payload.remotePort);
		if (!localPort || !remotePort) {
			res.statusCode = 400;
			res.end(JSON.stringify({ error: "Missing localPort or remotePort", success: false }));
			return;
		}

		const existing = activePortForwards.get(key);
		if (existing) {
			existing.kill();
			activePortForwards.delete(key);
		}

		const ctxFlag = context ? `--context=${context}` : "";
		const nsFlag = `-n ${namespace}`;
		const command = `kubectl port-forward deployment/${deployment} ${localPort}:${remotePort} ${nsFlag} ${ctxFlag}`;

		console.log(`[port-forward] Starting: ${command}`);
		const proc = spawn(command, { shell: true });

		(proc as unknown as { _pfMeta: { localPort: number; remotePort: number } })._pfMeta = { localPort, remotePort };

		let stderrBuffer = "";
		proc.stderr.on("data", (data) => {
			stderrBuffer += data.toString();
			console.error(`[port-forward] stderr for ${key}:`, data.toString().trim());
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

		if (proc.killed || stderrBuffer.toLowerCase().includes("error") || stderrBuffer.toLowerCase().includes("forbidden")) {
			proc.kill();
			activePortForwards.delete(key);
			const rawError = stderrBuffer.trim();
			const errorMsg = rawError.toLowerCase().includes("forbidden")
				? "Prohibido"
				: (rawError || "Port-forward failed");
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
					if (id.includes("@tanstack/react-query") || id.includes("@tanstack/react-router")) {
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
