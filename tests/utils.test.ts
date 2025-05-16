import { describe, it, expect } from "vitest";

import { getHierarchy } from "../src/utils.js";
import { Component } from "../src/index.js";
import type { HiddenProps } from "src/types.js";

describe("getHierarchy", () =>
{
    it("Should return hierarchy for a class with no inheritance", () =>
    {
        class ComponentA extends Component { }

        const result = getHierarchy(ComponentA);
        expect(result).toEqual([ComponentA]);
    });

    it("Should return hierarchy for a class with single inheritance", () =>
    {
        class ParentA extends Component { }
        class ComponentA extends ParentA
        {
            // eslint-disable-next-line camelcase
            protected static override readonly __μECS_inherits__ = [ParentA];
        }

        const result = getHierarchy(ComponentA);
        expect(result).toEqual([ParentA, ComponentA]);
    });

    it("Should return hierarchy for a class with multiple inheritance levels", () =>
    {
        class ParentA extends Component { }
        class ChildA extends ParentA
        {
            // eslint-disable-next-line camelcase
            protected static override readonly __μECS_inherits__ = [ParentA];
        }
        class ComponentA extends ChildA
        {
            // eslint-disable-next-line camelcase
            protected static override readonly __μECS_inherits__ = [ChildA];
        }

        const result = getHierarchy(ComponentA);
        expect(result).toEqual([ParentA, ChildA, ComponentA]);
    });
    it("Should return parent hierarchy if no inheritance is defined", () =>
    {
        class ParentA extends Component { }
        class ChildA extends ParentA
        {
            // eslint-disable-next-line camelcase
            protected static override readonly __μECS_inherits__ = [ParentA];
        }
        class ComponentA extends ChildA { }

        const result = getHierarchy(ComponentA);
        expect(result).toEqual([ParentA, ComponentA]);
    });
    it("Should be possible to block inheritance", () =>
    {
        class ParentA extends Component { }
        class ChildA extends ParentA
        {
            // eslint-disable-next-line camelcase
            protected static override readonly __μECS_inherits__ = [ParentA];
        }
        class ComponentA extends ChildA
        {
            // eslint-disable-next-line camelcase
            protected static override readonly __μECS_inherits__ = [];
        }

        const result = getHierarchy(ComponentA);
        expect(result).toEqual([ComponentA]);
    });

    it("Should return cached hierarchy if already computed", () =>
    {
        class ParentA extends Component { }
        class ComponentA extends ParentA
        {
            // eslint-disable-next-line camelcase
            protected static override readonly __μECS_inherits__ = [ParentA];
        }

        const first = getHierarchy(ComponentA);
        const second = getHierarchy(ComponentA);

        expect(second).toBe(first);
        expect(second).toEqual([ParentA, ComponentA]);
    });
    it("Should be possible to override the hierarchy", () =>
    {
        class ParentA extends Component { }
        class ChildA extends ParentA
        {
            // eslint-disable-next-line camelcase
            protected static override readonly __μECS_inherits__ = [ParentA];
        }
        class ComponentA extends ChildA
        {
            // eslint-disable-next-line camelcase
            protected static override readonly __μECS_inherits__ = [ChildA];

            // eslint-disable-next-line camelcase
            protected static readonly __μECS_hierarchy__ = [ChildA];
        }

        const result = getHierarchy(ComponentA);
        expect(result).toEqual([ChildA]);
    });
    it("Should be possible to override the hierarchy even after hierarchy is computed", () =>
    {
        class ParentA extends Component { }
        class ChildA extends ParentA
        {
            // eslint-disable-next-line camelcase
            protected static override readonly __μECS_inherits__ = [ParentA];
        }
        class ComponentA extends ChildA
        {
            // eslint-disable-next-line camelcase
            protected static override readonly __μECS_inherits__ = [ChildA];
        }

        const first = getHierarchy(ComponentA);
        expect(first).toEqual([ParentA, ChildA, ComponentA]);

        ((ComponentA as unknown) as HiddenProps)["__μECS_hierarchy__"] = [ChildA];

        const second = getHierarchy(ComponentA);
        expect(second).not.toBe(first);
        expect(second).toEqual([ChildA]);
    });

    it("Should handle multiple inheritance", () =>
    {
        class ParentA extends Component { }
        class ChildA extends ParentA
        {
            // eslint-disable-next-line camelcase
            protected static override readonly __μECS_inherits__ = [ParentA];
        }
        class ParentB extends Component { }
        class ChildB extends ParentB
        {
            // eslint-disable-next-line camelcase
            protected static override readonly __μECS_inherits__ = [ParentB];
        }
        class ComponentA extends Component
        {
            // eslint-disable-next-line camelcase
            protected static override readonly __μECS_inherits__ = [ChildA, ChildB];
        }

        const result = getHierarchy(ComponentA);
        expect(result).toEqual([ParentB, ChildB, ParentA, ChildA, ComponentA]);
    });

    it("Should throw an error a doubly-inherited class is detected", () =>
    {
        class ParentA extends Component { }
        class ChildA extends ParentA
        {
            // eslint-disable-next-line camelcase
            protected static override readonly __μECS_inherits__ = [ParentA];
        }
        class ChildB extends ParentA
        {
            // eslint-disable-next-line camelcase
            protected static override readonly __μECS_inherits__ = [ParentA];
        }
        class ComponentA extends ChildA
        {
            // eslint-disable-next-line camelcase
            protected static override readonly __μECS_inherits__ = [ChildA, ChildB];
        }

        expect(() => getHierarchy(ComponentA)).toThrowError();
    });
    it("Should throw an error if a circular inheritance is detected", () =>
    {
        class ParentA extends Component { }
        class ChildA extends ParentA
        {
            // eslint-disable-next-line camelcase
            protected static override readonly __μECS_inherits__ = [ParentA];
        }
        class ComponentA extends ChildA
        {
            // eslint-disable-next-line camelcase
            protected static override readonly __μECS_inherits__ = [ChildA];
        }

        ((ComponentA as unknown) as HiddenProps)["__μECS_inherits__"] = [ComponentA];

        expect(() => getHierarchy(ComponentA)).toThrowError();
    });
});
