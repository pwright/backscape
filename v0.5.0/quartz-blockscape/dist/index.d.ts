import * as unified from 'unified';
import { Plugin } from 'unified';
import * as mdast from 'mdast';
import { Root } from 'mdast';

type BlockscapeRenderer = "lite" | "full";
interface RemarkBlockscapeOptions {
    defaultRenderer?: BlockscapeRenderer;
}
declare function validateBlockscapeMap(value: unknown, filePath?: string, pathPrefix?: string): void;
declare function validateBlockscapePayload(value: unknown, filePath?: string): void;
declare const remarkBlockscape: Plugin<[RemarkBlockscapeOptions?], Root>;

interface BlockscapeOptions {
    includeClient?: boolean;
    defaultRenderer?: BlockscapeRenderer;
}
declare const Blockscape: (opts?: BlockscapeOptions) => {
    name: string;
    markdownPlugins(): (unified.Plugin<[(RemarkBlockscapeOptions | undefined)?], mdast.Root> | {
        defaultRenderer: string;
    })[][];
    externalResources(): {
        js: {
            script: string;
            loadTime: string;
            contentType: string;
        }[];
        css: {
            content: string;
            inline: boolean;
        }[];
    };
};

export { Blockscape, type BlockscapeOptions, Blockscape as default, remarkBlockscape, validateBlockscapeMap, validateBlockscapePayload };
