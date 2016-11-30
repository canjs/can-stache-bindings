@module can-stache-bindings
@parent can-core
@group can-stache-bindings.syntaxes Syntaxes
@package ../package.json

Provides template event, one-way bindings, and two-way bindings.

@body

## Use

The `can-stache-bindings` plugin provides useful [can-view-callbacks.attr custom attributes] for template declarative event, one-way bindings, and two-way
bindings on element attributes, component [can-component::ViewModel ViewModels], and the [can-view-scope scope]. Bindings look like:


- `(event)="key()"` for event binding.
- `{prop}="key"` for one-way binding to a child.
- `{^prop}="key"` for one-way binding to a parent.
- `{(prop)}="key"` for two-way binding.

Prepending `$` to a binding like `($event)="key()"` changes the binding from the `ViewModel` to the element’s attributes or properties.

> __Note:__ DOM attribute names are case-insensitive, use hypens (-) to in the attribute name to setup camelCase bindings.

The following are the bindings that should be used with [can-stache]:

#### [can-stache-bindings.event event]

Binds to `childEvent` on `<my-component>`'s [can-component::ViewModel ViewModel] and calls
`method` on the [can-view-scope scope] with the specified arguments:

```
<my-component (child-event)="method('primitive', key, hash1=key1)"/>
```

Binds to `domEvent` on `<my-component>` and calls
`method` on the [can-view-scope scope] with the specified arguments.

```
<my-component ($dom-event)="method('primitive', key, hash1=key1)"/>
```

#### [can-stache-bindings.toChild one-way to child]

Updates `childProp` in `<my-component>`’s [can-component::ViewModel ViewModel] with `value` in the [can-view-scope scope]:

```
<my-component {child-prop}="value"/>
```

Updates the `child-attr` attribute or property on `<my-component>` with `value`
in the [can-view-scope scope]:

```
<my-component {$child-attr}="value"/>
```

#### [can-stache-bindings.toParent one-way to parent]

Updates `value` in the [can-view-scope scope]  with `childProp`
in `<my-component>`’s [can-component::ViewModel ViewModel]:

```
<my-component {^child-prop}="value"/>
```

Updates `value`
in the [can-view-scope scope] with the `child-attr` attribute or property on `<my-component>`:

```
<my-component {^$child-attr}="value"/>
```

#### [can-stache-bindings.twoWay two-way]

Updates `childProp` in `<my-component>`’s [can-component::ViewModel ViewModel] with `value` in the [can-view-scope scope] and vice versa:

```
<my-component {(child-prop)}="value"/>
```

Updates the `child-attr` attribute or property on `<my-component>` with `value`
in the [can-view-scope scope] and vice versa:

```
<my-component {($child-attr)}="value"/>
```
