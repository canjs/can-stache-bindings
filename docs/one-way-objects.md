@function can-stache-bindings.oneWayObjects {one-way} (for objects)
@parent can-stache-bindings.notes 0

@body

## One Way Binding for Objects

`{child-prop}="key"` ([can-stache-bindings.toChild one-way to child]) or `{^child-prop}="key"` ([can-stache-bindings.toParent one-way to parent]) is used to pass values from the scope to a component or vice versa, respectively.

Generally, this binding only observes changes in one direction, but when [can-stache.key] is an object (POJO, DefineMap, etc), changes to the object itself are two-way; the one-way only applies to the object itself, not to changes to it's properties.

In the following example, changes to both inputs will be reflect in the other, as the value bound to the input is a property of the one-way bound value. Replacing the object as done with `child.changeObj()` is not passed, as is the intent of one-way binding.

```
Templates:
    // parent-component
    <h1>Parent</h1>
    <input type="text" {($value)}="obj.foo">
    <child-component {obj}="obj"></child-component>

    // child-component
    <h1>Child</h1>
    <input type="text" {($value)}="obj.foo">
    <button ($click)="changeObj()">Change Obj</button>

ViewModels:
    // parent-component
    var ParentViewModel = can.DefineMap.extend({
        obj: {
            value: function() {
                return { foo: 'bar' }
            }
        }
    });

    // child-component
    var ChildViewModel = can.DefineMap.extend({
        obj: 'object',
        changeObj: function() {
            this.obj = { foo: 'xyz' };
        }
    });
```
