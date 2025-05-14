import type { Constructor } from "@byloth/core";

interface HierarchyCache<T extends object = object> extends Constructor<T>
{
    __hierarchy__?: Constructor<object>[];
}

// SMELLS: Remove `<object>` from the type signature once the `@byloth/core` package is updated.
//
export function getHierarchy(cls: Constructor<object>): Constructor<object>[]
{
    const hierarchy = (cls as HierarchyCache).__hierarchy__ ?? [];
    if (hierarchy.length) { return hierarchy; }

    let current = cls;
    while ((typeof current === "function") && (current !== Function.prototype))
    {
        hierarchy.unshift(current);

        current = Reflect.getPrototypeOf(current) as Constructor<object>;
    }

    (cls as HierarchyCache).__hierarchy__ = hierarchy;

    return hierarchy;
}
