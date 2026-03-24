# API Reference

::: warning Work in Progress
The API reference is being written. Check the [source code](https://github.com/Byloth/micro-ecs/tree/master/packages/core/src) in the meantime.
:::

## Core Classes

| Class | Description |
|-------|-------------|
| [`World`](#world) | Central container. Manages entities, systems, resources, and events. |
| [`Entity`](#entity) | Container for components. Can be enabled/disabled. |
| [`Component`](#component) | Data attached to an entity. |
| [`System`](#system) | Logic that operates on entities/components each tick. |
| [`Resource`](#resource) | Singleton data shared across systems. |

## World

```typescript
class World<T extends CallbackMap = {}>
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `entities` | `ReadonlyMap<number, Entity>` | All entities in the world. |
| `systems` | `ReadonlyMap<SystemType, System>` | All registered systems. |
| `resources` | `ReadonlyMap<ResourceType, Resource>` | All registered resources. |

### Methods

| Method | Description |
|--------|-------------|
| `addEntity(entity)` | Add an entity to the world. |
| `removeEntity(entityOrId)` | Remove an entity from the world. |
| `addSystem(system)` | Register a system. |
| `removeSystem(systemOrType)` | Unregister a system. |
| `addResource(resource)` | Register a resource. |
| `removeResource(resourceOrType)` | Unregister a resource. |
| `addService(service)` | Register an object as both system and resource. |
| `getComponentView(...types)` | Get a cached [`QueryView`](#queryview) for the given component types. |
| `getFirstComponent(type)` | Get the first component of the given type. |
| `getFirstComponents(...types)` | Get the first entity's components matching all types. |
| `findAllComponents(...types)` | Iterate all matching component tuples. |
| `emit(event, ...args)` | Emit a custom event. |
| `update(deltaTime)` | Tick all enabled systems in priority order. |
| `dispose()` | Dispose the world and all its contents. |

## Entity

```typescript
class Entity<W extends World = World> extends Resource<W>
```

| Property / Method | Description |
|-------------------|-------------|
| `id` | Unique numeric identifier. |
| `isEnabled` | Whether the entity is active. |
| `components` | `ReadonlyMap<ComponentType, Component>` |
| `addComponent(component)` | Attach a component. |
| `removeComponent(componentOrType)` | Detach a component. |
| `getComponent(type)` | Get a component by type. |
| `hasComponent(type)` | Check if a component exists. |
| `enable()` / `disable()` | Toggle the entity. |

## Component

```typescript
class Component<E extends Entity = Entity>
```

| Property / Method | Description |
|-------------------|-------------|
| `static Id` | Unique numeric type identifier (lazily assigned). |
| `isEnabled` | Whether the component is active. |
| `entity` | The entity this component is attached to. |
| `enable()` / `disable()` | Toggle the component. |

## System

```typescript
class System<W extends World = World> extends Resource<W>
```

| Property / Method | Description |
|-------------------|-------------|
| `priority` | Execution order (lower = earlier). |
| `isEnabled` | Whether the system is active. |
| `update(deltaTime)` | Override to implement logic. |
| `enable()` / `disable()` | Toggle the system. |

## QueryView

A cached, auto-updating view returned by `world.getComponentView(...types)`.

| Property / Method | Description |
|-------------------|-------------|
| `entities` | `Entity[]` — direct array access. |
| `components` | `T[]` — direct array access. |
| `get(entity)` | Get component tuple for an entity. |
| `has(entity)` | Check if an entity is in the view. |
| `onAdd(callback)` | Subscribe to entity-added events. |
| `onRemove(callback)` | Subscribe to entity-removed events. |
| `onClear(callback)` | Subscribe to clear events. |
| `[Symbol.iterator]()` | Iterate `[entity, components]` tuples. |
