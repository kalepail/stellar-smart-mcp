import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GitHubHandler } from "./github-handler";
import { Octokit } from "octokit";

// Context from the auth process, encrypted & stored in the auth token
// and provided to the DurableMCP as this.props
type Props = {
	login: string;
	name: string;
	email: string;
	accessToken: string;
};

export { StellarMCPStore } from "./store-do";

export class MyMCP extends McpAgent<Env, unknown, Props> {
	public server = new McpServer({
		name: "Github OAuth Proxy Demo",
		version: "1.0.0",
	});

	async init() {
		// Get all contract addresses for the user
		this.server.tool(
			"add",
			"Add two numbers together",
			{
				a: z.string().transform(Number).describe("The first number"),
				b: z.string().transform(Number).describe("The second number"),
			},
			async ({ a, b }) => {
				return {
					content: [{ type: "text", text: String(a + b) }],
				}
			}
		);

		// Use the upstream access token to facilitate tools
		this.server.tool(
			"userInfoOctokit",
			"Get user info from GitHub, via Octokit",
			{},
			async () => {
				const octokit = new Octokit({ auth: this.props.accessToken });
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(await octokit.rest.users.getAuthenticated()),
						},
					],
				};
			},
		);
	}
}

export default new OAuthProvider({
	apiRoute: "/sse",
	// TODO: fix these types
	// @ts-ignore
	apiHandler: MyMCP.mount("/sse"),
	// @ts-ignore
	defaultHandler: GitHubHandler,
	authorizeEndpoint: "/authorize",
	tokenEndpoint: "/token",
	clientRegistrationEndpoint: "/register",
});
