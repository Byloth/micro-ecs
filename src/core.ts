export default abstract class μObject
{
    // eslint-disable-next-line camelcase
    private static __μECS_nextId__ = 0;

    public readonly id: number;

    public constructor()
    {
        this.id = (μObject["__μECS_nextId__"] += 1);
    }
}
