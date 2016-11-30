@function can-stache-bindings.toChild {to-child}
@parent can-stache-bindings.syntaxes 1

@description One-way bind a value in the parent scope to the [can-component.prototype.ViewModel ViewModel].

@signature `{child-prop}="key"`

  Imports [can-stache.key] in the [can-view-scope scope] to `childProp` in [can-component.prototype.view-model viewModel]. It also updates `childProp` with the value of `key` when `key` changes.

  ```
  <my-component {some-prop}="value"/>
  ```

  @param {String} child-prop The name of the property to set in the
  component’s viewmodel.

  @param {can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call|can-stache/expressions/helper} key An expression whose resulting value is used to set as `childProp`.

@signature `{$child-prop}="key"`

  Imports [can-stache.key] in the [can-view-scope scope] to `childProp` property or attribute on the element.

  ```
  <input {$value}="name"/>
  ```

  This signature works, but the following should be used instead:

  ```
  <input value="{{name}}"/>
  ```

@body

## Use

`{child-prop}="key"` is used to pass values from the scope to a component.  You can use CallExpressions like:

```
<player-scores {scores}="game.scoresForPlayer('Alison')"/>
<player-scores {scores}="game.scoresForPlayer('Jeff')"/>
```

@demo demos/can-stache-bindings/to-child.html
