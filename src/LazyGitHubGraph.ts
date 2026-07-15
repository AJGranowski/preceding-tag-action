import { GitHubAPI } from "./GitHubAPI";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type NotUndefined = {} | null;

interface Node<T> {
    allParentsKnown: boolean;
    commitSHA: string;
    data: T;
    parents: Set<string>;
}

class LazyGitHubGraph<T extends NotUndefined> {
    public static readonly MAX_FETCH_SIZE = GitHubAPI.MAX_BATCH_SIZE.fetchCommitList;

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

    getCommit(commitSHA: string, fetch?: 0): T | undefined
    getCommit(commitSHA: string, fetch: number): Promise<T | undefined>
    getCommit(commitSHA: string, fetch: number = 0): Promise<T | undefined> | T | undefined {
        if (fetch > 0) {
            return this.fetchCommits(commitSHA, fetch)
                .then(() => this.getCommit(commitSHA, 0));
        }

        if (!this.nodes.has(commitSHA)) {
            return undefined;
        }

        return this.nodes.get(commitSHA)!.data;
    }

    hasCommit(commitSHA: string, fetch?: 0): boolean
    hasCommit(commitSHA: string, fetch: number): Promise<boolean>
    hasCommit(commitSHA: string, fetch: number = 0): Promise<boolean> | boolean {
        if (fetch > 0) {
            return this.fetchCommits(commitSHA, fetch)
                .then(() => this.hasCommit(commitSHA, 0));
        }

        return this.nodes.has(commitSHA);
    }

    /**
     * @returns An iterator over all of the nodes of this graph in no particular order
     */
    getCommits(): IteratorObject<Node<T>> {
        return this.nodes.values();
    }

    /**
     * @returns The parent edges of this node. Returns an empty iterable if this node does not exist.
     */
    getParents(commitSHA: string, fetch?: 0): IteratorObject<string>
    getParents(commitSHA: string, fetch: number): Promise<IteratorObject<string>>
    getParents(commitSHA: string, fetch: number = 0): Promise<IteratorObject<string>> | IteratorObject<string> {
        if (fetch > 0) {
            return this.fetchCommits(commitSHA, fetch)
                .then(() => this.getParents(commitSHA, 0));
        }

        if (!this.nodes.has(commitSHA)) {
            return [].values();
        }

        return this.nodes.get(commitSHA)!.parents.values();
    }

    /**
     * Optionally fetch nodes
     */
    private async fetchCommits(commitSHA: string, batchSize: number): Promise<void> {
        if (this.shouldFetchCommit(commitSHA)) {
            let counter = 0;
            for await (const result of this.githubAPI.fetchCommitList(commitSHA, batchSize)) {
                let data = this.defaultDataFn();
                if (this.nodes.has(result.sha)) {
                    data = this.nodes.get(result.sha)!.data;
                }

                if (data != null && typeof data === "object") {
                    (data as any)["commitDate"] = result.commitDate;
                }

                this.nodes.set(result.sha, {
                    allParentsKnown: true,
                    commitSHA: result.sha,
                    data: data,
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

    /**
     * @returns true if fetching this commit might be useful
     */
    private shouldFetchCommit(commitSHA: string): boolean {
        return !this.requestedNodes.has(commitSHA) && (!this.nodes.has(commitSHA) || !this.nodes.get(commitSHA)!.allParentsKnown);
    }
}

export { LazyGitHubGraph };
export type { Node as LazyGitHubGraphNode };