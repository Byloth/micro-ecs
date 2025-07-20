import type { Constructor } from "@byloth/core";

import type Entity from "../entity.js";
import type Component from "../component.js";

export default class EntityContext
{
    private get _entity(): Entity { return this._component.entity!; }

    private readonly _component: Component;

    private readonly _dependencies: Set<Component>;
    public get dependencies(): ReadonlySet<Component> { return this._dependencies; }

    private _onDispose?: (context: EntityContext) => void;

    public constructor(component: Component)
    {
        this._component = component;
        this._dependencies = new Set();
    }

    public depend<C extends Component>(type: Constructor<C>): C
    {
        const dependency = this._entity["_addDependency"](this._component, type);
        this._dependencies.add(dependency);

        return dependency as C;
    }
    public release(type: Constructor<Component>): void
    {
        const dependency = this._entity["_removeDependency"](this._component, type);
        this._dependencies.delete(dependency);
    }

    public dispose(): void
    {
        if (this._onDispose)
        {
            this._onDispose(this);
            this._onDispose = undefined;
        }

        this._dependencies.clear();
    }
}
