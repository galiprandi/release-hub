import { exec } from "node:child_process";
import { promisify } from "node:util";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const execAsync = promisify(exec);

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
				// Generic exec endpoint - executes any bash command
				server.middlewares.use("/local/exec", async (req, res) => {
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

					try {
						const { stdout, stderr } = await execAsync(command);

						res.setHeader("Content-Type", "application/json");
						res.end(JSON.stringify({ stdout, stderr, success: true }));
					} catch (error) {
						res.statusCode = 500;
						res.end(
							JSON.stringify({
								error:
									error instanceof Error ? error.message : "Command failed",
								stderr:
									error instanceof Error && "stderr" in error
										? (error as { stderr: string }).stderr
										: "",
								success: false,
							}),
						);
					}
				});
			},
		},
	],
	resolve: {
		alias: {
			"@": "/src",
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
});
