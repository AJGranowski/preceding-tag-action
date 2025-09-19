import type { getBooleanInput, getInput, warning } from "@actions/core";
import type { context } from "@actions/github";

import type { Repository } from "./types/Repository";

type Core_getBooleanInput = typeof getBooleanInput;
type Core_getInput = typeof getInput;
type Core_warning = typeof warning;
type Github_context = typeof context;

type MemoizationTable = {
    [key in keyof Input]?: key extends `get${string}` ? ReturnType<Input[key]> : never
}

class Input {
    private readonly context: Github_context;
    private readonly getBooleanInput: Core_getBooleanInput;
    private readonly getInput: Core_getInput;
    private readonly warning: Core_warning;

    private readonly memoization: MemoizationTable;

    constructor(getInput: Core_getInput, getBooleanInput: Core_getBooleanInput, warning: Core_warning, context: Github_context) {
        this.context = context;
        this.getBooleanInput = getBooleanInput;
        this.getInput = getInput;
        this.warning = warning;

        this.memoization = {};
    }

    /**
     * The default value to return if no preceding tag was found.
     */
    getDefaultTag(): string {
        if (this.memoization.getDefaultTag != null) {
            return this.memoization.getDefaultTag;
        }

        const defaultTag = this.getInput("default-tag");
        if (defaultTag.length === 0) {
            return "";
        }

        if (!this.getFilter().test(defaultTag)) {
            this.warning(`Input default-tag "${defaultTag}" does not match the tag filter.`);
        }

        this.memoization.getDefaultTag = defaultTag;
        return defaultTag;
    }

    /**
     * Get the tag filtering regular expression, defaults to matching every non-zero string.
     */
    getFilter(): RegExp {
        if (this.memoization.getFilter != null) {
            return this.memoization.getFilter;
        }

        const filterString = this.getInput("regex");
        if (filterString.length === 0) {
            return /^.+$/;
        }

        this.memoization.getFilter = new RegExp(filterString);
        return this.memoization.getFilter;
    }

    /**
     * Return the include-ref option, defaults to false.
     */
    getIncludeRef(): boolean {
        if (this.memoization.getIncludeRef != null) {
            return this.memoization.getIncludeRef;
        }

        if (this.getInput("include-ref").length === 0) {
            this.memoization.getIncludeRef = false;
            return this.memoization.getIncludeRef;
        } else {
            this.memoization.getIncludeRef = this.getBooleanInput("include-ref");
        }

        return this.memoization.getIncludeRef;
    }

    /**
     * Get the ref to get the preceding tag of. Defaults to HEAD if not supplied for some reason.
     */
    getRef(): string {
        if (this.memoization.getRef != null) {
            return this.memoization.getRef;
        }

        const startsWithRef = /^refs\//i;
        const invalidGitSequences = /(\.\/)|(\.\.)|(\.lock$)|[~^:?*[@\\]|(\/\/)|(\.$)/;
        const invalidURLSequences = /[?&/$%]|(^\.)|(\.$)/;
        const ref = this.getInput("ref");
        if (startsWithRef.test(ref) || invalidGitSequences.test(ref) || invalidURLSequences.test(ref)) {
            throw new SyntaxError(`Invalid input ref "${ref}"`);
        }

        this.memoization.getRef = ref.length > 0 ? ref : "HEAD";
        return this.memoization.getRef;
    }

    /**
     * Generate a Repository object, either from the action inputs or the context this action is running in.
     */
    getRepository(): Repository {
        if (this.memoization.getRepository != null) {
            return this.memoization.getRepository;
        }

        const validRepositoryString = /^[a-z\d-]+\/[\w.-]+$/i;
        const invalidRepositorySequences = /(\/\.)|(\/\.\.)/;
        const inputString = this.getInput("repository");
        if (inputString.length === 0) {
            this.memoization.getRepository = {
                owner: this.context.repo.owner,
                repo: this.context.repo.repo
            };

            return this.memoization.getRepository;
        }

        const matcher = inputString.match(/^(?<owner>[^/]+)\/(?<repo>[^/]+)$/);
        if (!validRepositoryString.test(inputString) || invalidRepositorySequences.test(inputString) || matcher == null || matcher.groups == null) {
            throw new SyntaxError(`Invalid input repository "${inputString}". Expected format {owner}/{repo}`);
        }

        this.memoization.getRepository = {
            owner: matcher.groups.owner,
            repo: matcher.groups.repo
        };

        return this.memoization.getRepository;
    }

    /**
     * Return the token if it exists, or undefined.
     */
    getToken(): string | undefined {
        if ("getToken" in this.memoization) {
            return this.memoization.getToken;
        }

        const token = this.getInput("token");
        if (token.length === 0) {
            this.memoization.getToken = undefined;
        } else {
            this.memoization.getToken = token;
        }

        return this.memoization.getToken;
    }
}

export { Input };