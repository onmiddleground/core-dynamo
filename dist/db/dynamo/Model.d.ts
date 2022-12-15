export declare class ModelAttribute {
    readonly alias: string;
    readonly longName: string;
    readonly type: string;
    visible: boolean;
    constructor(alias: string, longName: string, type: string, visible?: boolean);
}
export declare abstract class Model {
    private static FIELDS;
    protected static register(field: ModelAttribute): ModelAttribute;
    getAllVisible(): ModelAttribute[];
    getAliasNames(): string[];
}
