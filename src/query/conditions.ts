import type { Constructor } from "@byloth/core";

import type Entity from "../entity.js";
import type Component from "../component.js";

export abstract class Condition
{
    public abstract evaluate(entity: Entity): boolean;
    public abstract toString(): string;
}

export class HasComponent extends Condition
{
    public readonly type: Constructor<Component>;

    public constructor(type: Constructor<Component>)
    {
        super();

        this.type = type;
    }

    public evaluate(entity: Entity): boolean
    {
        return entity.hasComponent(this.type);
    }
    public toString(): string
    {
        return `HasComponent(${this.type.name})`;
    }
}
export class HasTag extends Condition
{
    public readonly tag: string;

    public constructor(tag: string)
    {
        super();

        this.tag = tag;
    }

    public evaluate(entity: Entity): boolean
    {
        return entity.hasTag(this.tag);
    }
    public toString(): string
    {
        return `HasTag(${this.tag})`;
    }
}

export class And extends Condition
{
    private readonly _conditions!: Condition[];
    public get conditions(): readonly Condition[] { return this._conditions; }

    public constructor(...conditions: Condition[])
    {
        if (conditions.length === 0) { throw new Error(); }
        if (conditions.length === 1) { return conditions[0] as And; }

        super();

        this._conditions = [];
        for (const condition of conditions)
        {
            if (condition instanceof And) { this._conditions.push(...condition.conditions); }
            else { this._conditions.push(condition); }
        }
    }

    public evaluate(entity: Entity): boolean
    {
        for (const condition of this._conditions)
        {
            if (!(condition.evaluate(entity))) { return false; }
        }

        return true;
    }
    public toString(): string
    {
        const keys = this._conditions
            .map((condition) => condition.toString())
            .sort();

        return `And(${keys.join(", ")})`;
    }
}
export class Or extends Condition
{
    private readonly _conditions!: Condition[];
    public get conditions(): readonly Condition[] { return this._conditions; }

    public constructor(...conditions: Condition[])
    {
        if (conditions.length === 0) { throw new Error(); }
        if (conditions.length === 1) { return conditions[0] as Or; }

        super();

        this._conditions = [];
        for (const condition of conditions)
        {
            if (condition instanceof Or) { this._conditions.push(...condition.conditions); }
            else { this._conditions.push(condition); }
        }
    }

    public evaluate(entity: Entity): boolean
    {
        for (const condition of this._conditions)
        {
            if (condition.evaluate(entity)) { return true; }
        }

        return false;
    }
    public toString(): string
    {
        const keys = this._conditions
            .map((condition) => condition.toString())
            .sort();

        return `Or(${keys.join(", ")})`;
    }
}

export class Not extends Condition
{
    public readonly condition!: Condition;

    public constructor(condition: Condition)
    {
        if (condition instanceof Not) { return condition.condition as Not; }

        super();

        this.condition = condition;
    }

    public evaluate(entity: Entity): boolean
    {
        return !(this.condition.evaluate(entity));
    }
    public toString(): string
    {
        return `Not(${this.condition.toString()})`;
    }
}
