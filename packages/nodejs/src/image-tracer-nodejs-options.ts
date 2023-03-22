
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import { Options } from '@image-tracer-ts/core';


export enum OutputFormat {
	PNG = 'png',
	SVG = 'svg',
}

export interface ImageTracerNodejsOptions extends Options {
	output?: OutputFormat | OutputFormat[],
	out?: string,
	preset: keyof typeof Options.Presets,
}

export namespace ImageTracerNodejsOptions {
	export async function fromArgs(): Promise<[string, ImageTracerNodejsOptions]> {
		const argv = await yargs(hideBin(process.argv)).argv
		const [fileName] = argv._
		const userOptions = argv as Partial<ImageTracerNodejsOptions>
		const input = (userOptions.preset) ? Object.assign({}, Options.Presets[userOptions.preset], argv) : userOptions
		const baseOptions = Options.buildFrom(input) as ImageTracerNodejsOptions;
		argv.out && (baseOptions.out = argv.out as string)
		return [fileName?.toString(), baseOptions];
	}
}
