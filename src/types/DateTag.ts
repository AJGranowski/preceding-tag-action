import type { CommitDate } from "./CommitDate";
import type { Tag } from "./Tag";

interface DateTag extends Tag {
    commitDate: CommitDate
}

export type { DateTag };