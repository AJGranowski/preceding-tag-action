import type { GitHubAPI } from "./GitHubAPI";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type NotUndefined = {} | null;

interface Node<T> {
    allParentsKnown: boolean;
    commitSHA: string
    data: T;
    parents: Set<string>;
}

class LazyGitHubGraph<T extends NotUndefined> {
    private readonly githubAPI: GitHubAPI;
    private readonly defaultDataFn: () => T;

    /**
     * Directional graph data.
     */
    private nodes: Map<string, Node<T>>;

    /**
     * List of requested things that may or may not be valid nodes.
     * Used to prevent repeated requests on invalid nodes.
     */
    private requestedNodes: Set<string>;

    constructor(githubAPI: GitHubAPI, defaultDataFn: () => T) {
        this.githubAPI = githubAPI;
        this.defaultDataFn = defaultDataFn;
        this.nodes = new Map();
        this.requestedNodes = new Set();
    }

    /**
     * Add a node to the graph (such as tagged commits)
     */
    addCommit(commitSHA: string, data?: T, parents?: Set<string>, allParentsKnown?: boolean): void {
        if (this.nodes.has(commitSHA)) {
            throw new Error(`${commitSHA} already exists in the graph`);
        }

        this.nodes.set(commitSHA, {
            allParentsKnown: parents != null && allParentsKnown === true,
            commitSHA: commitSHA,
            data: arguments.length >= 2 ? data! : this.defaultDataFn(),
            parents: parents != null ? parents : new Set()
        });
    }

    getCommit(commitSHA: string, fetch?: false): T | undefined
    async getCommit(commitSHA: string, fetch: true): Promise<T | undefined>
    getCommit(commitSHA: string, fetch: boolean = false): Promise<T | undefined> | T | undefined {
        if (fetch) {
            return this.fetchCommits(commitSHA, 1)
                .then(() => this.getCommit(commitSHA, false));
        }

        if (!this.nodes.has(commitSHA)) {
            return undefined;
        }

        return this.nodes.get(commitSHA)!.data;
    }

    hasCommit(commitSHA: string, fetch?: false): boolean
    async hasCommit(commitSHA: string, fetch: true): Promise<boolean>
    hasCommit(commitSHA: string, fetch: boolean = false): Promise<boolean> | boolean {
        if (fetch) {
            return this.fetchCommits(commitSHA, 1)
                .then(() => this.hasCommit(commitSHA, false));
        }

        return this.nodes.has(commitSHA);
    }

    /**
     * @returns An iterator over all of the nodes of this graph in no particular order
     */
    getCommits(): Iterable<Node<T>> {
        return this.nodes.values();
    }

    /**
     * @returns The parent edges of this node. Returns an empty iterable if this node does not exist.
     */
    async getParents(commitSHA: string): Promise<Iterable<string>> {
        await this.fetchCommits(commitSHA, 10);
        if (!this.nodes.has(commitSHA)) {
            return [];
        }

        return this.nodes.get(commitSHA)!.parents;
    }

    /**
     * Optionally fetch nodes
     */
    private async fetchCommits(commitSHA: string, batchSize: number): Promise<void> {
        if (!this.requestedNodes.has(commitSHA) && (!this.nodes.has(commitSHA) || !this.nodes.get(commitSHA)!.allParentsKnown)) {
            let counter = 0;
            for await (const result of this.githubAPI.fetchCommitList(commitSHA, batchSize)) {
                this.nodes.set(result.sha, {
                    allParentsKnown: true,
                    commitSHA: result.sha,
                    data: this.defaultDataFn(),
                    parents: new Set(result.parentSHAs)
                });

                counter++;
                if (counter >= batchSize) {
                    break;
                }
            }

            this.requestedNodes.add(commitSHA);
        }
    }
}

export { LazyGitHubGraph };