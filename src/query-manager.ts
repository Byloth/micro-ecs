import { SetView, SmartIterator } from "@byloth/core";
import type { Constructor, ReadonlySetView } from "@byloth/core";

import type Entity from "./entity.js";
import type Component from "./component.js";
import type World from "./world.js";

export default class QueryManager<W extends World = World>
{
    private readonly _views: Map<Constructor<Component>, SetView<Component>>;
    private readonly _world: W;

    private readonly _onEntityComponentAdd = (_: Entity, component: Component) =>
    {
        const view = this._views.get(component.constructor as Constructor<Component>);
        if (!(view)) { return; }

        view.add(component);
    };
    private readonly _onEntityComponentRemove = (_: Entity, component: Component) =>
    {
        const view = this._views.get(component.constructor as Constructor<Component>);
        if (!(view)) { return; }

        view.delete(component);
    };

    public constructor(world: W)
    {
        this._views = new Map();

        this._world = world;
        this._world.subscribe("entity:component:add", this._onEntityComponentAdd);
        this._world.subscribe("entity:component:remove", this._onEntityComponentRemove);
    }

    public pickOne<C extends Component>(type: Constructor<C>): C | undefined
    {
        const view = this._views.get(type) as SetView<C> | undefined;
        if (view)
        {
            const { value } = view.values()
                .next();

            return value;
        }

        for (const entity of this._world.entities.values())
        {
            const component = entity.getComponent(type);
            if (component) { return component; }
        }

        return undefined;
    }
    public pickAll<C extends Component>(type: Constructor<C>): SmartIterator<C>
    {
        const view = this._views.get(type) as SetView<C> | undefined;
        if (view) { return new SmartIterator(view); }

        return new SmartIterator(this._world.entities.values())
            .map((entity) => entity.getComponent(type))
            .filter<C>(((component) => component !== undefined));
    }

    public query<C extends Component>(type: Constructor<C>): ReadonlySetView<C>
    {
        const view = this._views.get(type) as SetView<C> | undefined;
        if (view) { return view; }

        const components = new SetView<C>();
        for (const entity of this._world.entities.values())
        {
            const component = entity.getComponent(type);
            if (component) { components.add(component); }
        }

        this._views.set(type, components);

        return components;
    }

    public dispose(): void
    {
        this._world.unsubscribe("entity:component:add", this._onEntityComponentAdd);
        this._world.unsubscribe("entity:component:remove", this._onEntityComponentRemove);

        for (const view of this._views.values()) { view.clear(); }
        this._views.clear();
    }
}
