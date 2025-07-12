import { ReferenceException, RuntimeException } from "@byloth/core";

export class AdoptionException extends RuntimeException
{
    public constructor(message: string, cause?: unknown, name = "AdoptionException")
    {
        super(message, cause, name);
    }

    public override readonly [Symbol.toStringTag]: string = "AdoptionException";
}
export class AttachmentException extends RuntimeException
{
    public constructor(message: string, cause?: unknown, name = "AttachmentException")
    {
        super(message, cause, name);
    }

    public override readonly [Symbol.toStringTag]: string = "AttachmentException";
}

export class HierarchyException extends ReferenceException
{
    public constructor(message: string, cause?: unknown, name = "HierarchyException")
    {
        super(message, cause, name);
    }

    public override readonly [Symbol.toStringTag]: string = "HierarchyException";
}
