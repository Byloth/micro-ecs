import { ReferenceException } from "@byloth/core";

import type Entity from "../entity.js";
import type Component from "../component.js";
import type { InitializeArgs } from "../object-pool/types.js";
import type { ComponentType } from "../types.js";

export default class EntityContext
{
    protected readonly _component: Component;
    protected get _entity(): Entity { return this._component.entity!; }

    protected readonly _children: Set<ComponentType>;
    public get children(): ReadonlySet<ComponentType> { return this._children; }

    protected readonly _dependencies: Set<Component>;
    public get dependencies(): ReadonlySet<Component> { return this._dependencies; }

    protected _onDispose?: (context: EntityContext) => void;

    public constructor(component: Component)
    {
        this._component = component;

        this._children = new Set();
        this._dependencies = new Set();
    }

    public createChild<C extends Component>(Type: ComponentType<C>, ...args: InitializeArgs<C>): C
    {
        if ((import.meta.env.DEV) && (this._children.has(Type)))
        {
            throw new ReferenceException("The child already exists in the context.");
        }

        const child = this._entity.createComponent(Type, ...args as InitializeArgs<C>);
        this._children.add(Type);

        this._entity["_addDependency"](this._component, Type);
        this._dependencies.add(child);

        return child;
    }

    public useComponent<C extends Component>(Type: ComponentType<C>): C
    {
        const dependency = this._entity["_addDependency"](this._component, Type);
        this._dependencies.add(dependency);

        return dependency as C;
    }

    public releaseComponent<C extends Component>(Type: ComponentType<C>): void;
    public releaseComponent<C extends Component>(component: C): void;
    public releaseComponent<C extends Component>(component: ComponentType<C> | C): void
    {
        const Type = (typeof component === "function") ? component : component.constructor as ComponentType;

        const dependency = this._entity["_removeDependency"](this._component, Type);
        this._dependencies.delete(dependency);
    }

    public destroyChild<C extends Component>(Type: ComponentType<C>): void;
    public destroyChild<C extends Component>(component: C): void;
    public destroyChild<C extends Component>(component: ComponentType<C> | C): void
    {
        const Type = (typeof component === "function") ? component : component.constructor as ComponentType<C>;

        if ((import.meta.env.DEV) && !(this._children.has(Type)))
        {
            throw new ReferenceException("The child doesn't exist in the context.");
        }

        const dependency = this._entity["_removeDependency"](this._component, Type);
        this._dependencies.delete(dependency);

        this._entity.destroyComponent(Type);
        this._children.delete(Type);
    }

    public dispose(): void
    {
        if (this._onDispose)
        {
            this._onDispose(this);
            this._onDispose = undefined;
        }

        for (const Type of this._children) { this._entity.destroyComponent(Type); }

        this._children.clear();
        this._dependencies.clear();
    }
}
