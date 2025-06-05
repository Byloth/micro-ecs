import type { Disposable } from "./types.js";

export default class μObject
{
    private readonly _disposables: Disposable[];

    public constructor()
    {
        this._disposables = [];
    }

    public register(disposable: Disposable): void
    {
        this._disposables.push(disposable);
    }
    public unregister(disposable: Disposable): void
    {
        const index = this._disposables.indexOf(disposable);
        if (index < 0)
        {
            throw new ReferenceError("Unable to remove the required disposable. " +
                "The disposable was never added or was already removed.");
        }

        this._disposables.splice(index, 1);
    }

    public dispose(): void
    {
        for (const disposable of this._disposables)
        {
            disposable.dispose();
        }

        this._disposables.length = 0;
    }
}
