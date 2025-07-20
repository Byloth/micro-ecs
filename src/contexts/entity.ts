import type { Constructor } from "@byloth/core";
import type Component from "../component.js";

export default class EntityContext
{
    public depend<C extends Component>(type: Constructor<C>): C
    {

    }

    public release<C extends Component>(type: Constructor<C>): void
    {

    }
}
