import { describe, it, expect } from "vitest";
import { Component, Entity, HasComponent, HasTag, And, Or, Not } from "../../src/index.js";

describe("HasComponent", () =>
{
    it("Should evaluate to true if the entity has the specified component", () =>
    {
        class TestComponent1 extends Component { }
        class TestComponent2 extends Component { }
        class TestComponent3 extends Component { }

        const entity = new Entity();
        entity.addComponent(new TestComponent1());
        entity.addComponent(new TestComponent2());
        entity.addComponent(new TestComponent3());

        const condition = new HasComponent(TestComponent2);
        expect(condition.evaluate(entity)).toBe(true);
    });
    it("Should evaluate to false if the entity does not have the specified component", () =>
    {
        class TestComponent1 extends Component { }
        class TestComponent2 extends Component { }
        class TestComponent3 extends Component { }

        const entity = new Entity();
        entity.addComponent(new TestComponent1());
        entity.addComponent(new TestComponent3());

        const condition = new HasComponent(TestComponent2);
        expect(condition.evaluate(entity)).toBe(false);
    });

    it("Should return the correct string representation", () =>
    {
        class TestComponent extends Component { }

        const condition = new HasComponent(TestComponent);
        expect(condition.toString()).toBe("HasComponent(TestComponent)");
    });
});
describe("HasTag", () =>
{
    it("Should evaluate to true if the entity has the specified tag", () =>
    {
        const entity = new Entity();
        entity.addTag("tag:test:1");
        entity.addTag("tag:test:2");
        entity.addTag("tag:test:3");

        const condition = new HasTag("tag:test:2");
        expect(condition.evaluate(entity)).toBe(true);
    });
    it("Should evaluate to false if the entity does not have the specified tag", () =>
    {
        const entity = new Entity();
        entity.addTag("tag:test:1");
        entity.addTag("tag:test:3");

        const condition = new HasTag("tag:test:2");
        expect(condition.evaluate(entity)).toBe(false);
    });

    it("Should return the correct string representation", () =>
    {
        const condition = new HasTag("tag:test:1");
        expect(condition.toString()).toBe("HasTag(tag:test:1)");
    });
});

describe("And", () =>
{
    it("Should evaluate to true if all conditions are true", () =>
    {
        class TestComponent extends Component { }

        const entity = new Entity();
        entity.addComponent(new TestComponent());
        entity.addTag("tag:test");

        const condition = new And(new HasComponent(TestComponent), new HasTag("tag:test"));
        expect(condition.evaluate(entity)).toBe(true);
    });
    it("Should evaluate to false if any condition is false", () =>
    {
        class TestComponent extends Component { }

        const entity = new Entity();
        entity.addComponent(new TestComponent());

        const condition = new And(new HasComponent(TestComponent), new HasTag("tag:test"));
        expect(condition.evaluate(entity)).toBe(false);
    });

    it("Should return the correct string representation", () =>
    {
        class TestComponent extends Component { }

        const condition1 = new HasComponent(TestComponent);
        const condition2 = new HasTag("tag:test");

        const condition = new And(condition1, condition2);
        expect(condition.toString()).toBe("And(HasComponent(TestComponent), HasTag(tag:test))");
    });
});
describe("Or", () =>
{
    it("Should evaluate to true if any condition is true", () =>
    {
        class TestComponent extends Component { }

        const entity = new Entity();
        entity.addComponent(new TestComponent());

        const condition = new Or(new HasComponent(TestComponent), new HasTag("tag:test"));
        expect(condition.evaluate(entity)).toBe(true);
    });
    it("Should evaluate to false if all conditions are false", () =>
    {
        const entity = new Entity();

        const condition = new Or(new HasComponent(Component), new HasTag("tag:test"));
        expect(condition.evaluate(entity)).toBe(false);
    });

    it("Should return the correct string representation", () =>
    {
        class TestComponent extends Component { }

        const condition1 = new HasComponent(TestComponent);
        const condition2 = new HasTag("tag:test");

        const condition = new Or(condition1, condition2);
        expect(condition.toString()).toBe("Or(HasComponent(TestComponent), HasTag(tag:test))");
    });
});
describe("Not", () =>
{
    it("Should evaluate to true if the condition is false", () =>
    {
        class TestComponent1 extends Component { }
        class TestComponent2 extends Component { }
        class TestComponent3 extends Component { }

        const entity = new Entity();
        entity.addComponent(new TestComponent1());
        entity.addComponent(new TestComponent3());

        const condition = new Not(new HasComponent(TestComponent2));
        expect(condition.evaluate(entity)).toBe(true);
    });
    it("Should evaluate to false if the condition is true", () =>
    {
        class TestComponent1 extends Component { }
        class TestComponent2 extends Component { }
        class TestComponent3 extends Component { }

        const entity = new Entity();
        entity.addComponent(new TestComponent1());
        entity.addComponent(new TestComponent2());
        entity.addComponent(new TestComponent3());

        const condition = new Not(new HasComponent(TestComponent2));
        expect(condition.evaluate(entity)).toBe(false);
    });

    it("Should return the correct string representation", () =>
    {
        const condition = new Not(new HasTag("tag:test"));
        expect(condition.toString()).toBe("Not(HasTag(tag:test))");
    });
});
