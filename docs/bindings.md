@module can-stache-bindings
@parent can-views
@collection can-core
@group can-stache-bindings.syntaxes Syntaxes
@package ../package.json

Provides template events, one-way bindings, and two-way bindings.

@body

## Use

The `can-stache-bindings` plugin provides useful [can-view-callbacks.attr custom attributes] for template declarative events, one-way bindings, and two-way
bindings on element attributes, component [can-component::ViewModel ViewModels], and the [can-view-scope scope]. Bindings look like:


- `on:event="key()"` for event binding.
- `prop:from="key"` for one-way binding to a child.
- `prop:to="key"` for one-way binding to a parent.
- `prop:bind="key"` for two-way binding.

> __Note:__ DOM attribute names are case-insensitive, but [can-component::ViewModel ViewModel] or [can-view-scope scope] properties can be `camelCase` and [can-stache stache] will encode them so they work correctly in the DOM.

The following are the bindings that should be used with [can-stache]:

#### [can-stache-bindings.event event]

Binds to `childEvent` on `<my-component>`'s [can-component::ViewModel ViewModel] and calls
`method` on the [can-view-scope scope] with the specified arguments:

```html
<my-component on:childEvent="method('primitive', key, hash1=key1)"/>
```

If the element does not have a [can-component::ViewModel ViewModel], binds to `domEvent` on the element and calls
`method` on the [can-view-scope scope] with the specified arguments.

```html
<div on:domEvent="method('primitive', key, hash1=key1)"/>
```

You can also explicitly listen to events on the [can-component::ViewModel ViewModel] using `on:vm:childEvent` or on the element using `on:el:domEvent`.

#### [can-stache-bindings.toChild one-way to child]

Updates `childProp` in `<my-component>`’s [can-component::ViewModel ViewModel] with `value` in the [can-view-scope scope]:

```html
<my-component childProp:from="value"/>
```

> This can be read as "set `childProp` _from_ `value`".

If the element does not have a [can-component::ViewModel ViewModel], updates the `child-attr` attribute or property of the
element with `value` in the [can-view-scope scope]:

```html
<div child-attr:from="value"/>
```

You can also explicitly use the [can-component::ViewModel ViewModel] using `vm:childProp:from="value"` or the element using `el:child-attr:from="value"`.

> __Note:__ If the value being passed to the component is an object, changes to the object's properties will still be visible to the component. Objects are passed by reference. See [can-stache-bindings#OneWayBindingWithObjects One Way Binding With Objects].

#### [can-stache-bindings.toParent one-way to parent]

Updates `value` in the [can-view-scope scope]  with `childProp`
in `<my-component>`’s [can-component::ViewModel ViewModel]:

```html
<my-component childProp:to="value"/>
```

> This can be read as "send `childProp` _to_ `value`".

If the element does not have a [can-component::ViewModel ViewModel], it updates `value`
in the [can-view-scope scope] with the `child-attr` attribute or property of the element.

```html
<div child-attr:to="value"/>
```

You can also explicitly use the [can-component::ViewModel ViewModel] with `vm:childProp:to="value"` or the element with `el:child-attr:to="value"`.

> __Note:__ If the value being passed to the component is an object, changes to the object's properties will still be visible to the component. Objects are passed by reference. See [can-stache-bindings#OneWayBindingWithObjects One Way Binding With Objects].

#### [can-stache-bindings.twoWay two-way]

Updates `childProp` in `<my-component>`’s [can-component::ViewModel ViewModel] with `value` in the [can-view-scope scope] and vice versa:

```html
<my-component childProp:bind="value"/>
```

Updates the `child-attr` attribute or property of the element with `value`
in the [can-view-scope scope] and vice versa:

```html
<div child-attr:bind="value"/>
```

You can also explicitly use the [can-component::ViewModel ViewModel] with `vm:childProp:bind="value"` or the element with `el:child-attr:bind="value"`.

## One Way Binding With Objects

`childProp:from="key"` ([can-stache-bindings.toChild one-way to child]) or `child-prop:to="key"` ([can-stache-bindings.toParent one-way to parent]) is used to pass values from the current scope to a component, or from a component to the current scope, respectively.

Generally, this binding only observes changes in one direction, but when [can-stache.key] is an object (POJO, DefineMap, etc), it is passed as a reference, behaving in much the same way as the following snippet.

```js
function component( bar ) {

	// changes to bar's properties are preserved
	bar.quux = "barfoo";

	// but replacing bar is not
	bar = {
		quux: "hello world"
	};
}

const foo = {
	quux: "foobar"
};
component( foo );
```
