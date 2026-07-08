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

    /**
     * @returns The data attached to this node, or `undefined` if this node does not exist in the graph.
     */
    getCommit(commitSHA: string): T | undefined {
        this.fetchCommit(commitSHA, 1);
        if (!this.nodes.has(commitSHA)) {
            return undefined;
        }

        return this.nodes.get(commitSHA)!.data;
    }

    /** 
     * @returns An iterator over all of the nodes of this graph in no particular order
     */
    getCommits(): Iterable<Node<T>> {
        return this.nodes.values();
    }

    /**
     * @returns True if this node exists in the graph.
     */
    hasCommit(commitSHA: string): boolean {
        this.fetchCommit(commitSHA, 1);
        return this.nodes.has(commitSHA);
    }

    /**
     * @returns The parent edges of this node. Returns an empty iterable if this node does not exist.
     */
    parents(commitSHA: string): Iterable<string> {
        this.fetchCommit(commitSHA, 100);
        if (!this.nodes.has(commitSHA)) {
            return [];
        }

        return this.nodes.get(commitSHA)!.parents;
    }

    /**
     * Optionally fetch nodes
     */
    private fetchCommit(commitSHA: string, batchSize: number): void {
        if (!this.requestedNodes.has(commitSHA) && (!this.nodes.has(commitSHA) || !this.nodes.get(commitSHA)!.allParentsKnown)) {
            // Make a request to get information about this node (and likely a bunch more) and populate this graph.
            this.requestedNodes.add(commitSHA);
        }
    }
}

export { LazyGitHubGraph };