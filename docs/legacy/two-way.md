@function can-stache-bindings.legacy-twoWay {\(two-way\)}
@parent can-stache-bindings.legacy-syntaxes 3

@description Two-way bind a value in the [can-component.prototype.view-model viewModel] or the element to the parent scope.

@deprecated {3.8} This syntax is deprecated in favor of [can-stache-bindings.twoWay childProp:bind="key"]

@signature `{(child-prop)}="key"`

  Two-way binds `childProp` in the  [can-component.prototype.ViewModel ViewModel] to
  [can-stache.key] in the parent [can-view-scope scope].  If `childProp` is updated `key` will be updated
  and vice-versa.

  ```html
  <my-component {(some-prop)}="value"/>
  ```

  When setting up the binding:

  - If `childProp` is `undefined`, `key` will be set to `childProp`.
  - If `key` is `undefined`, `childProp` will be set to `key`.
  - If both `childProp` and `key` are defined, `key` will be set to `childProp`.



  @param {String} child-prop The name of the property of the viewModel to two-way bind.

  @param {can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call|can-stache/expressions/helper} key A call expression whose value will be used to two-way bind in the parent scope.

@signature `{($child-prop)}="key"`

  Two-way binds the element’s `childProp` property or attribute to
  [can-stache.key] in the parent [can-view-scope scope].  If `childProp` is updated `key` will be updated
  and vice-versa.

  ```html
  <input {($value)}="name"/>
  ```

  @param {String} child-prop The name of the element’s property or attribute to two-way bind.

  @param {can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call|can-stache/expressions/helper} key A call expression whose value will be used to two-way bind in the parent scope.

@body

## Use

`{(child-prop)}="key"` is used to two-way bind a value in a [can-component.prototype.ViewModel ViewModel] to
a value in the  [can-view-scope scope].  If one value changes, the other value is updated.

The following two-way binds the `<edit-plate>` element’s `plateName` to the `editing.licensePlate`
value in the scope.  This allows `plateName` to update if `editing.licensePlate` changes and
`editing.licensePlate` to update if `plateName` changes.

@demo demos/can-stache-bindings-legacy/two-way.html

This demo can be expressed a bit easier with the references scope:

@demo demos/can-stache-bindings-legacy/reference.html

## Initialization

When a binding is being initialized, the behavior of what the viewModel and scope properties
are set to depends on their initial values.

If the viewModel value is `not undefined` and the scope is `undefined`, scope will be set to the viewModel value.

If the viewModel value is `undefined` and the scope is `not undefined`, viewModel will be set to the scope value.

If both the viewModel and scope are `not undefined`, viewModel will be set to the scope value.
