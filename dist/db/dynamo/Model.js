"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Model = exports.ModelAttribute = void 0;
class ModelAttribute {
    constructor(alias, longName, type, visible = true) {
        this.alias = alias;
        this.longName = longName;
        this.type = type;
        this.visible = visible;
    }
}
exports.ModelAttribute = ModelAttribute;
class Model {
    static register(field) {
        Model.FIELDS.push(field);
        return field;
    }
    getAllVisible() {
        return Model.FIELDS.filter((f) => f.visible ? f : f);
    }
    getAliasNames() {
        const visibleValues = Model.FIELDS.filter((f) => f.visible ? f : f);
        return visibleValues.map(v => v.alias);
    }
}
exports.Model = Model;
Model.FIELDS = [];
//# sourceMappingURL=Model.js.map