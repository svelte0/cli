/** Type for adding project to code base */
export type AddApiResData = { error: "yes"; data: string } | { error: "no"; data: { files: { [key: string]: string }; title: string; prompt: string } };

export interface RegistriesJsonData {
	name: string;
	type: string;
	dependencies: string[];
	registryDependencies: any[];
	files: {
		path: string;
		type: string;
	};
}

export interface RegistryJsonData {
	name: string;
	type: string;
	dependencies: string[];
	registryDependencies: string[];
	files: {
		name: string;
		content: string;
		type: string;
		target: string;
	}[];
}
