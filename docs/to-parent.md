@function can-stache-bindings.toParent toParent:to
@parent can-stache-bindings.syntaxes 2

@description One-way bind a value from the [can-component.prototype.view-model viewModel] or element to the parent scope.

@signature `childProp:to="key"`

Exports `childProp` in the [can-component.prototype.ViewModel ViewModel] to [can-stache.key] in the parent [can-view-scope scope]. It also updates
`key` with the value of `childProp` when `childProp` changes.

```
<my-component someProp:to="value"/>
```

> __Note:__ If [can-stache.key] is an object, changes to the objects properties will still be visible to the component. Objects are passed by reference. See [can-stache-bindings#OneWayBindingWithObjects One Way Binding With Objects].

@param {String} childProp The name of the property to export from the
child components viewmodel. Use `this:to` or `.:to` to export the entire viewModel.

@param {can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call|can-stache/expressions/helper} key An expression that will be used to set in the parent scope.

@signature `child-prop:to="key"`

  Exports the element’s `child-prop` property or attribute to [can-stache.key] in the parent [can-view-scope scope]. It also updates
  `key` with the value of `child-prop` when `child-prop` changes.

  ```
  <input value:to="name"/>
  ```

  @param {String} child-prop The name of the element’s property or attribute to export.

  @param {can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call|can-stache/expressions/helper} key An expression whose resulting value with be used to set in the parent scope.

@signature `vm:childProp:to="key"`

Exports `childProp` in the [can-component.prototype.ViewModel ViewModel] to [can-stache.key] in the parent [can-view-scope scope]. It also updates
`key` with the value of `childProp` when `childProp` changes.

```
<my-component vm:someProp:to="value"/>
```

> __Note:__ If [can-stache.key] is an object, changes to the objects properties will still be visible to the component. Objects are passed by reference. See [can-stache-bindings#OneWayBindingWithObjects One Way Binding With Objects].

@param {String} childProp The name of the property to export from the
child components viewmodel. Use `this:to` or `.:to` to export the entire viewModel.

@param {can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call|can-stache/expressions/helper} key An expression that will be used to set in the parent scope.

@signature `el:child-prop:to="key"`

  Exports the element’s `child-prop` property or attribute to [can-stache.key] in the parent [can-view-scope scope]. It also updates
  `key` with the value of `child-prop` when `child-prop` changes.

  ```
  <input el:value:to="name"/>
  ```

  @param {String} child-prop The name of the element’s property or attribute to export.

  @param {can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call|can-stache/expressions/helper} key An expression whose resulting value with be used to set in the parent scope.


@body

## Use

Depending on whether the element has a [can-component.prototype.ViewModel ViewModel], `:to` bindings change
between exporting __viewModel properties__ or __DOM properties__.

## Exporting ViewModel properties

`childProp:to="key"` can be used to export single values or the complete view model from a
child component into the parent scope. Typically, the values are exported to the references scope.

In the following example, it connects the __selected__ driver in `<drivers-list>` with an editable __plateName__ in
`<edit-plate>`:

    <drivers-list selected:to="*editing"/>
    <edit-plate plateName:bind="*editing.licensePlate"/>

@demo demos/can-stache-bindings/to-parent.html

## Exporting DOM properties

`child-prop:to="key"` can be used to export an attribute value into the scope.  For example:

```
<input value:to="name"/>
```

Updates `name` in the scope when the `<input>` element’s `value` changes.

## Exporting Functions

You can export a function to the parent scope with a binding like:

```
<my-tabs @addPanel:to="@*addPanel">
```

And pass the method like:

```
<my-panel addPanel:from="@*addPanel" title="CanJS">CanJS Content</my-panel>
```

Check it out in this demo:

@demo demos/can-stache-bindings/to-parent-function.html

Notice that `@` is used to prevent reading the function. You can read more about the [@ operator in the can-stache docs](https://canjs.com/doc/can-stache/keys/at.html).
