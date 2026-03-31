import { ReferenceException } from "@byloth/core";

export class DependencyException extends ReferenceException
{
    public constructor(message: string, cause?: unknown, name = "DependencyException")
    {
        super(message, cause, name);
    }

    public override readonly [Symbol.toStringTag]: string = "DependencyException";
}
