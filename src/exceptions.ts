import { ReferenceException, RuntimeException } from "@byloth/core";

export class AttachmentException extends RuntimeException
{
    public constructor(message: string, cause?: unknown, name = "AttachmentException")
    {
        super(message, cause, name);
    }

    public override readonly [Symbol.toStringTag]: string = "AttachmentException";
}

export class DependencyException extends ReferenceException
{
    public constructor(message: string, cause?: unknown, name = "DependencyException")
    {
        super(message, cause, name);
    }

    public override readonly [Symbol.toStringTag]: string = "DependencyException";
}
