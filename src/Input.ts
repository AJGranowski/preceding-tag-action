import type { getBooleanInput, getInput } from "@actions/core";
import type { context } from "@actions/github";

import type { Repository } from "./types/Repository";

type Core_getBooleanInput = typeof getBooleanInput;
type Core_getInput = typeof getInput;
type Github_context = typeof context;

class Input {
    private readonly context: Github_context;
    private readonly getBooleanInput: Core_getBooleanInput;
    private readonly getInput: Core_getInput;
    constructor(getInput: Core_getInput, getBooleanInput: Core_getBooleanInput, context: Github_context) {
        this.context = context;
        this.getBooleanInput = getBooleanInput;
        this.getInput = getInput;
    }

    /**
     * Get the tag filtering regular expression, defaults to matching every non-zero string.
     */
    getFilter(): RegExp {
        const filterString = this.getInput("regex");
        if (filterString.length === 0) {
            return /^.+$/;
        }

        return new RegExp(filterString);
    }

    /**
     * Return the include-ref option, defaults to false.
     */
    getIncludeRef(): boolean {
        if (this.getInput("include-ref").length === 0) {
            return false;
        }

        return this.getBooleanInput("include-ref");
    }

    /**
     * Get the ref to get the preceding tag of. Defaults to HEAD if not supplied for some reason.
     */
    getRef(): string {
        const startsWithRef = /^refs\//i;
        const invalidGitSequences = /(\.\/)|(\.\.)|(\.lock$)|[~^:?*[@\\]|(\/\/)|(\.$)/;
        const invalidURLSequences = /[?&/]|(^\.)|(\.$)/;
        const ref = this.getInput("ref");
        if (startsWithRef.test(ref) || invalidGitSequences.test(ref) || invalidURLSequences.test(ref)) {
            throw new Error(`Invalid input ref "${ref}"`);
        }

        return ref.length > 0 ? ref : "HEAD";
    }

    /**
     * Generate a Repository object, either from the action inputs or the context this action is running in.
     */
    getRepository(): Repository {
        const validRepositoryString = /^[a-z\d-]+\/[\w.-]+$/i;
        const invalidRepositorySequences = /(\/\.)|(\/\.\.)/;
        const inputString = this.getInput("repository");
        if (inputString.length === 0) {
            return {
                owner: this.context.repo.owner,
                repo: this.context.repo.repo
            };
        }

        const matcher = inputString.match(/^(?<owner>[^/]+)\/(?<repo>[^/]+)$/);
        if (!validRepositoryString.test(inputString) || invalidRepositorySequences.test(inputString) || matcher == null || matcher.groups == null) {
            throw new Error(`Invalid input repository "${inputString}". Expected format {owner}/{repo}`);
        }

        return {
            owner: matcher.groups.owner,
            repo: matcher.groups.repo
        };
    }

    /**
     * Return the token if it exists, or undefined.
     */
    getToken(): string | undefined {
        const token = this.getInput("token");
        if (token.length === 0) {
            return undefined;
        }

        return token;
    }
}

export { Input };