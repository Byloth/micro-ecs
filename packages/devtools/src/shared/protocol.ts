export interface ComponentSnapshot
{
    name: string;
    isEnabled: boolean;
}

export interface EntitySnapshot
{
    id: number;
    name: string;
    isEnabled: boolean;
    components: ComponentSnapshot[];
}

export interface SystemSnapshot
{
    name: string;
    priority: number;
    isEnabled: boolean;
    isService: boolean;
}

export interface ResourceSnapshot
{
    name: string;
}

export interface WorldSnapshot
{
    entities: EntitySnapshot[];
    systems: SystemSnapshot[];
    resources: ResourceSnapshot[];
}

export type ECSMessage =
    | { type: "snapshot", payload: WorldSnapshot };
