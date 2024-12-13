import { existsSync } from "fs";
import type { AddApiResData, RegistriesJsonData, RegistryJsonData } from "./types.js";
export const DEV = false;
export const CWD = DEV ? `${process.cwd()}/projectName` : process.cwd();
export const DOMAIN_URL = DEV ? "http://localhost:8000" : "https://svelte0.dev";
export const SHADCN_BASE_URL = "https://next.shadcn-svelte.com";

/** Registry dependencies needed for current one */
export const REGISTRY_DEPENDENCIES: { [key: string]: string[] } = {
	"toggle-group": ["toggle-group", "toggle"],
	"data-table": ["data-table"],
	calendar: ["button"],
	pagination: ["button"],
	carousel: ["button"],
	"alert-dialog": ["button"],
	select: ["separator"],
	sidebar: ["is-mobile", "input", "tooltip", "skeleton", "separator", "button", "sheet"],
	command: ["dialog"],
	"range-calendar": ["button"],
};

/** Check if svelte project exists or not */
export const isSvelteProjectExists = () => {
	const srcPath = `${CWD}/svelte.config.js`;
	const configPath = `${CWD}/svelte.config.js`;
	return existsSync(srcPath) && existsSync(configPath);
};

/** Get/Fetch project data */
export async function getProjectData(projectId: string) {
	const url = `${DOMAIN_URL}/api/project/add/${projectId}`;
	const request = await fetch(url);
	const response: AddApiResData = await request.json();
	// check for any error
	if (response.error === "yes") {
		console.error(response.data);
		return null;
	}
	// else return project data
	return response.data;
}

/** Get shadcn components */
export async function getComponents() {
	const url = `${SHADCN_BASE_URL}/registry/index.json`;
	const request = await fetch(url);
	const response: RegistriesJsonData[] = await request.json();
	return response;
}

/** Get component data */
export async function getComponentData(component: string) {
	const url = `${SHADCN_BASE_URL}/registry/styles/default/${component}.json`;
	const request = await fetch(url);
	const response: RegistryJsonData = await request.json();
	return response;
}

/** Get registry dependencies from UI code */
export function getRegistries(uiCode: string) {
	// const importedComponentLines = uiCode.match(/import\s*(?:\*\s+as\s+(\w+)|{\s*([^}]+)\s*})\s*from\s*["'](\$lib\/components\/ui(?:\/[^"']+)?)["'];?/g) || [];
	const importedComponentLines = uiCode.match(/import\s*(?:\*\s+as\s+(\w+)|{\s*([^}]+)\s*})\s*from\s*['"](\$lib\/components\/ui(?:\/[^'"]+)?)['"];?/g) || [];
	return [...new Set(importedComponentLines.map((data: string) => data.split("/ui/")[1].split('"')[0].trim()))];
}

export function getDependencies(uiCode: string) {
	const importRegex = /import\s+(?:(?:\*\s+as\s+\w+|\{\s*[^}]+\s*\}|\w+)\s+from\s+)?['"]([^'"\$][^'"]+)['"];?/g;
	const matches = [...uiCode.matchAll(importRegex)];
	return [...new Set(matches.map((match) => match[1]))];
}

export class Utils {
	/**
	 * Converts a title to a URL-friendly slug
	 * @param title The original title string
	 * @returns A lowercase slug with only letters and hyphens
	 */
	titleToSlug(title: string): string {
		return (
			title
				// Convert to lowercase
				.toLowerCase()
				// Remove numbers and non-letter characters
				.replace(/[^a-z\s]/g, "")
				// Replace spaces with hyphens
				.replace(/\s+/g, "-")
				// Remove consecutive hyphens
				.replace(/-+/g, "-")
				// Remove leading or trailing hyphens
				.replace(/^-+|-+$/g, "")
				.trim()
		);
	}

	/**
	 * Converts a title to a PascalCase component name
	 * @param title The original title string
	 * @returns A PascalCase component name
	 */
	titleToComponentName(title: string) {
		return (
			title
				// Remove non-alphanumeric characters
				.replace(/[^a-zA-Z0-9\s]/g, "")
				// Split into words
				.split(/\s+/)
				// Capitalize first letter of each word
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
				// Join words together
				.join("")
				.trim()
		);
	}
}
