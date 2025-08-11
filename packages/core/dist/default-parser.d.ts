import { BaseParser } from "./base-parser";
export declare class DefaultParser extends BaseParser {
    protected getSourceData(rawMarkdown: string): any | null;
    protected extractTitle(data: any, defaultTitle: string): string;
    protected extractStatus(data: any): string;
    protected extractType(data: any): string;
    protected extractCategory(data: any): string | null;
    protected extractCreated(data: any): Date | null;
    protected extractDiscussionsTo(data: any): string | null;
    protected extractAuthors(data: any): {
        name: string;
        githubHandle?: string;
        email?: string;
    }[];
    protected extractRequires(data: any): string[];
}
