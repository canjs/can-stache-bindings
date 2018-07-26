@function can-stache-bindings.twoWay twoWay:bind
@parent can-stache-bindings.syntaxes

@description Two-way bind a value in the [can-component.prototype.view-model viewModel] or the element to the parent scope.

@signature `childProp:bind="key"`

  Two-way binds `childProp` in the  [can-component.prototype.ViewModel ViewModel] to
  [can-stache.key] in the parent [can-view-scope scope].  If `childProp` is updated `key` will be updated
  and vice-versa.

  ```html
  <my-component someProp:bind="value"/>
  ```

  When setting up the binding:

  - If `childProp` is `undefined`, `key` will be set to `childProp`.
  - If `key` is `undefined`, `childProp` will be set to `key`.
  - If both `childProp` and `key` are defined, `key` will be set to `childProp`.



  @param {String} childProp The name of the property of the viewModel to two-way bind.

  @param {can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call|can-stache/expressions/helper} key A call expression whose value will be used to two-way bind in the parent scope.

@signature `child-prop:bind="key"`

  Two-way binds the element’s `child-prop` property or attribute to
  [can-stache.key] in the parent [can-view-scope scope].  If `child-prop` is updated, `key` will be updated
  and vice-versa.

  ```html
  <input value:bind="name"/>
  ```

  @param {String} child-prop The name of the element’s property or attribute to two-way bind.

  @param {can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call|can-stache/expressions/helper} key A call expression whose value will be used to two-way bind in the parent scope.

@signature `vm:childProp:bind="key"`

  Two-way binds `childProp` in the  [can-component.prototype.ViewModel ViewModel] to
  [can-stache.key] in the parent [can-view-scope scope].  If `childProp` is updated, `key` will be updated
  and vice-versa.

  ```html
  <my-component vm:someProp:bind="value"/>
  ```

  When setting up the binding:

  - If `childProp` is `undefined`, `key` will be set to `childProp`.
  - If `key` is `undefined`, `childProp` will be set to `key`.
  - If both `childProp` and `key` are defined, `key` will be set to `childProp`.



Parameters are the same as [can-stache-bindings.twoWay#childProp_bind__key_ childProp:bind="key"]

@signature `el:child-prop:bind="key"`

  Two-way binds the element’s `child-prop` property or attribute to
  [can-stache.key] in the parent [can-view-scope scope].  If `child-prop` is updated, `key` will be updated
  and vice-versa.

  ```html
  <input el:value:bind="name"/>
  ```

Parameters are the same as [can-stache-bindings.twoWay#child_prop_bind__key_ child-prop:bind="key"]

@body

## Use

`childProp:bind="key"` is used to two-way bind a value in a [can-component.prototype.ViewModel ViewModel] to
a value in the  [can-view-scope scope].  If one value changes, the other value is updated.

The following two-way binds the `<edit-plate>` element’s `plateName` to the `editing.licensePlate`
value in the scope.  This allows `plateName` to update if `editing.licensePlate` changes and
`editing.licensePlate` to update if `plateName` changes.

Click on one of the list items below and watch as its text appears in the input box. You can then edit the text and it will update in the list.

@demo demos/can-stache-bindings/two-way.html
@codepen

This demo can be expressed a bit easier with the references scope:

@demo demos/can-stache-bindings/reference.html
@codepen

## Initialization

When a binding is being initialized, the behavior of what the viewModel and scope properties
are set to depends on their initial values:

- If the viewModel value is `defined` and the scope is `undefined`, scope will be set to the viewModel value.
- If the viewModel value is `undefined` and the scope is `not undefined`, viewModel will be set to the scope value.
- If both the viewModel and scope are `not undefined`, viewModel will be set to the scope value.
