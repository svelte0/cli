#!/usr/bin/env node
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import inquirer from "inquirer";
import ora from "ora";
import { REGISTRY_DEPENDENCIES, isSvelteProjectExists, CWD, getProjectData, getComponentData, getRegistries, getDependencies, Utils, DEV, DOMAIN_URL } from "./utils.js";
const utils = new Utils();
const projectId = process.argv[2];
const isSvelteProject = isSvelteProjectExists();
let updatingUI = false;

cli();

async function cli() {
	// if no project id
	if (!projectId) {
		console.error("Please provide project id, example 'npx @svelte0/cli@latest 123455322'.");
		return;
	}
	// check if svelte project exists
	if (!isSvelteProject) {
		console.error("Looks like you do not have a svelte project initialized.");
		const projectName = DEV
			? "projectName"
			: (await inquirer.prompt({ name: "data", type: "input", message: "Give your project a name to output command to initialize one.", default: "svelte-project" })).data;
		const cliCommand = DEV ? `npm i lucide-svelte && cd .. && bun src/main.ts ${projectId} && cd ${projectName}` : `npm i lucide-svelte && npx @svelte0/cli@latest ${projectId}`;
		console.error(
			`Run: npx sv create ${projectName} --no-install --template minimal --types ts && cd ${projectName} && npx sv add tailwindcss --no-install && npm i && npx shadcn-svelte@next init && ${cliCommand}`
		);
		return;
	}

	// get project data, check for api error, if any error stop function
	const projectData = await getProjectData(projectId);
	if (!projectData) return;

	// else get dependencies and registry dependencies needed for project's files
	const defaultPath = `src/lib/components/${utils.titleToSlug(projectData.title)}`;
	const outDirAsk: string = (await inquirer.prompt({ name: "data", type: "input", message: "Where should we save this UI to ?", default: defaultPath })).data.trim();
	const isPathARoute = outDirAsk.endsWith("+page.svelte");
	const userInput: string = outDirAsk.startsWith("/") ? outDirAsk.slice(1) : outDirAsk.startsWith("./") ? outDirAsk.slice(2) : outDirAsk;
	let uiPath = `${CWD}/${userInput.endsWith("/") ? userInput.slice(0, userInput.length - 1) : userInput}`;
	// check if ui path exists
	if (fs.existsSync(uiPath)) {
		console.error(`${userInput} ${isPathARoute ? "" : "is not empty and any files in there"} will be deleted`);
		const overwrite = (await inquirer.prompt({ name: "data", type: "confirm", message: "Would you like to continue ?" })).data as boolean;
		updatingUI = true;
		if (!overwrite) return;
	}
	// if user wants to use UI as page/route, there is no need to ask for UI title
	if (isPathARoute) {
		await installDependencies(createFiles({ files: projectData.files, uiPath, isPathARoute: true, uiTitle: "" }));
		console.log(`Created new route: ${uiPath}`);
		return;
	}
	// else ask for all information
	const uiTitleAsk = (await inquirer.prompt({ name: "data", type: "input", message: "What should we name this UI ?" })).data || "svelte0-component";
	const uiTitle = utils.titleToComponentName(uiTitleAsk);
	// create / update files
	await installDependencies(createFiles({ files: projectData.files, uiPath, isPathARoute: false, uiTitle }));
	console.log(`${updatingUI ? "Updated" : "Added"} new UI to: ${uiPath}`);
}

/** Create or update UI */
function createFiles(data: { files: { [fileName: string]: string }; uiPath: string; isPathARoute: boolean; uiTitle: string }) {
	let dependencies: string[] = [];
	let registries: string[] = [];
	// create / update files
	for (const [fileName, fileContent] of Object.entries(data.files)) {
		// If user want to create a route, use App.svelte as +page.svelte
		const filePath =
			data.isPathARoute && fileName === "App.svelte"
				? data.uiPath
				: data.isPathARoute && fileName !== "App.svelte"
				? `${data.uiPath.replace("/+page.svelte", "")}/components/${fileName}`
				: `${data.uiPath}/${fileName}`;
		// @ts-ignore
		const fileData: string = (data.isPathARoute ? fileContent.replaceAll("$project/", "./components/") : fileContent.replaceAll("$project/", "./")).replaceAll("$assets/", `${DOMAIN_URL}/images/`);
		// create files
		if (!fs.existsSync(filePath)) fs.mkdirSync(path.dirname(filePath), { recursive: true });
		fs.writeFileSync(filePath, fileData);
		// create index.js file for component
		if (fileName === "App.svelte" && !data.isPathARoute) {
			fs.writeFileSync(`${path.dirname(filePath)}/index.js`, `import { default as ${data.uiTitle} } from "./App.svelte";\nexport default ${data.uiTitle};`);
		}
		// handle registry
		for (const registry of getRegistries(fileData)) {
			if (!registries.includes(registry)) registries.push(registry);
			if (REGISTRY_DEPENDENCIES[registry]) {
				for (const registry2 of REGISTRY_DEPENDENCIES[registry]) {
					if (!registries.includes(registry2)) registries.push(registry2);
				}
			}
		}
		// handle npm packages
		for (const dependency of getDependencies(fileData)) {
			if (!dependencies.includes(dependency) && !dependency.startsWith("svelte") && ![".js", ".ts", ".svelte"].includes(path.extname(dependency))) dependencies.push(dependency);
		}
	}
	// return data
	return { dependencies, registries };
}

/** Install npm dependencies and install shadcn packages */
async function installDependencies(data: { dependencies: string[]; registries: string[] }) {
	// handle registries
	for (const component of data.registries) {
		const fileDirBase = `${CWD}/src/lib/components/ui/${component}`;
		// create ui
		if (!fs.existsSync(fileDirBase)) {
			const uiCreateSpinner = ora(`Creating ${`src/lib/components/ui/${component}`}`).start();
			const componentData = await getComponentData(component);
			// create component files
			for (const file of componentData.files) {
				if (!fs.existsSync(fileDirBase)) fs.mkdirSync(fileDirBase, { recursive: true });
				fs.writeFileSync(`${fileDirBase}/${file.name}`, file.content);
			}
			uiCreateSpinner.stop();
		}
	}
	// handle dependencies
	if (data.dependencies.length > 0) {
		const dependenciesSpinner = ora("Installing dependencies").start();
		exec(`cd ${CWD} && npm install ${data.dependencies.join(" ")}`, (error) => {
			// on error
			if (error) dependenciesSpinner.succeed(`Something went wrong installing: ${data.dependencies.join(", ")}`);
			// no error
			else dependenciesSpinner.succeed(`Done installing: ${data.dependencies.join(", ")}`);
		});
	}
}
