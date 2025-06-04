import { Exception } from "@byloth/core";

export class AdoptionException extends Exception
{
    public constructor(message: string, cause?: unknown, name = "AdoptionException")
    {
        super(message, cause, name);
    }

    public override readonly [Symbol.toStringTag]: string = "AdoptionException";
}
export class AttachmentException extends Exception
{
    public constructor(message: string, cause?: unknown, name = "AttachmentException")
    {
        super(message, cause, name);
    }

    public override readonly [Symbol.toStringTag]: string = "AttachmentException";
}
