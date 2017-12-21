@module can-stache-bindings.legacy-syntaxes Deprecated Syntaxes
@parent can-stache-bindings.syntaxes 5

Provides template event, one-way bindings, and two-way bindings.

> Note: This syntax is **deprecated** and you should use the [can-stache-bindings new syntax] instead.

@body

## Use

The `can-stache-bindings` plugin provides useful [can-view-callbacks.attr custom attributes] for template declarative event, one-way bindings, and two-way
bindings on element attributes, component [can-component::ViewModel ViewModels], and the [can-view-scope scope].

The deprecated bindings are as follows:

- `(event)="key()"` for event binding.
- `{prop}="key"` for one-way binding to a child.
- `{^prop}="key"` for one-way binding to a parent.
- `{(prop)}="key"` for two-way binding.

Prepending `$` to a binding like `($event)="key()"` changes the binding from the `ViewModel` to the element’s attributes or properties.

> __Note:__ DOM attribute names are case-insensitive, use hyphens (-) to in the attribute name to setup camelCase bindings.

The following are the deprecated bindings that can be used with [can-stache]:

#### [can-stache-bindings.event event]

Binds to `childEvent` on `<my-component>`'s [can-component::ViewModel ViewModel] and calls
`method` on the [can-view-scope scope] with the specified arguments:

```html
<my-component (child-event)="method('primitive', key, hash1=key1)"/>
```

Binds to `domEvent` on `<my-component>` and calls
`method` on the [can-view-scope scope] with the specified arguments.

```html
<my-component ($dom-event)="method('primitive', key, hash1=key1)"/>
```

#### [can-stache-bindings.toChild one-way to child]

Updates `childProp` in `<my-component>`’s [can-component::ViewModel ViewModel] with `value` in the [can-view-scope scope]:

```html
<my-component {child-prop}="value"/>
```

Updates the `child-attr` attribute or property on `<my-component>` with `value`
in the [can-view-scope scope]:

```html
<my-component {$child-attr}="value"/>
```

> __Note:__ If value being passed to the component is an object, changes to the objects properties will still be visible to the component. Objects are passed by reference. See [can-stache-bindings#OneWayBindingWithObjects One Way Binding With Objects].

#### [can-stache-bindings.toParent one-way to parent]

Updates `value` in the [can-view-scope scope]  with `childProp`
in `<my-component>`’s [can-component::ViewModel ViewModel]:

```html
<my-component {^child-prop}="value"/>
```

Updates `value`
in the [can-view-scope scope] with the `child-attr` attribute or property on `<my-component>`:

```html
<my-component {^$child-attr}="value"/>
```

> __Note:__ If value being passed to the component is an object, changes to the objects properties will still be visible to the component. Objects are passed by reference. See [can-stache-bindings#OneWayBindingWithObjects One Way Binding With Objects].

#### [can-stache-bindings.twoWay two-way]

Updates `childProp` in `<my-component>`’s [can-component::ViewModel ViewModel] with `value` in the [can-view-scope scope] and vice versa:

```html
<my-component {(child-prop)}="value"/>
```

Updates the `child-attr` attribute or property on `<my-component>` with `value`
in the [can-view-scope scope] and vice versa:

```html
<my-component {($child-attr)}="value"/>
```

## One Way Binding With Objects

`{child-prop}="key"` ([can-stache-bindings.toChild one-way to child]) or `{^child-prop}="key"` ([can-stache-bindings.toParent one-way to parent]) is used to pass values from the current scope to a component or vice versa, respectively.

Generally, this binding only observes changes in one direction, but when [can-stache.key] is an object (POJO, [can-define/map/map DefineMap], etc), it is passed as a reference, behaving in much the same way as the following snippet.

```js
function component(bar) {
	// changes to bar's properties are preserved
	bar.quux = 'barfoo';

	// but replacing bar is not
	bar = {
		quux: 'hello world'
	};
}

var foo = {
	quux: 'foobar'
};
component(foo);
```
