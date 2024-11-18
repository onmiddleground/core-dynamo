export class ModelAttribute {
    constructor(public readonly alias: string,
                public readonly longName: string,
                public readonly type: string,
                public visible: boolean = true) {}
}

export abstract class Model {
    private static FIELDS: any[] = [];

    protected static register(field: ModelAttribute): ModelAttribute {
        Model.FIELDS.push(field);
        return field;
    }

    getAllVisible(): ModelAttribute[] {
        return Model.FIELDS.filter((f:ModelAttribute) => f.visible ? f : f);
    }

    public getAliasNames() {
        const visibleValues: ModelAttribute[] = Model.FIELDS.filter((f:ModelAttribute) => f.visible ? f : f);
        return visibleValues.map(v => v.alias);
    }
}