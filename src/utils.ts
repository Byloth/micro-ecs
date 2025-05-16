import type { Constructor } from "@byloth/core";

import Component from "./component.js";
import type { HiddenProps } from "./types.js";

export function getHierarchy(cls: Constructor<Component>): Constructor<Component>[]
{
    const cache = (cls as HiddenProps)["__μECS_hierarchy__"];
    if (cache?.length) { return cache; }

    const hierarchy: Constructor<Component>[] = [];
    const queue: Constructor<Component>[] = [cls];

    const seen = new Set<Constructor<Component>>();
    while (queue.length)
    {
        const current = queue.shift()!;
        if (seen.has(current)) { throw new Error(); }

        seen.add(current);
        hierarchy.unshift(current);

        const inherits = (current as HiddenProps)["__μECS_inherits__"];
        if (!(inherits.length)) { continue; }

        queue.unshift(...inherits);
    }

    (cls as HiddenProps)["__μECS_hierarchy__"] = hierarchy;

    return hierarchy;
}
