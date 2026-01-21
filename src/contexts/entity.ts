import type Entity from "../entity.js";
import type Component from "../component.js";
import type { ComponentType } from "src/types.js";

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

    public useComponent<C extends Component>(type: ComponentType<C>): C
    {
        const dependency = this._entity["_addDependency"](this._component, type);
        this._dependencies.add(dependency);

        return dependency as C;
    }

    public releaseComponent<C extends Component>(type: ComponentType<C>): void;
    public releaseComponent<C extends Component>(component: C): void;
    public releaseComponent<C extends Component>(component: ComponentType<C> | C): void
    {
        const type = (typeof component === "function") ? component : component.constructor as ComponentType;

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
