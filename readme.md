# can-stache-bindings

[![Build Status](https://travis-ci.org/canjs/can-stache-bindings.png?branch=master)](https://travis-ci.org/canjs/can-stache-bindings)

Default binding syntaxes for [can-stache](https://github.com/canjs/can-stache).

  - _syntaxes_
    - <code>[{(child-prop)}="key"](#child-propkey)</code>
    - <code>[{($child-prop)}="key"](#child-propkey)</code>
    - <code>[{child-prop}="key"](#child-propkey)</code>
    - <code>[{$child-prop}="key"](#child-propkey)</code>
    - <code>[{^child-prop}="key"](#child-propkey)</code>
    - <code>[{^$child-prop}="key"](#child-propkey)</code>
    - <code>[($DOM_EVENT)='CALL_EXPRESSION'](#dom_eventcall_expression)</code>
    - <code>[(VIEW_MODEL_EVENT)='CALL_EXPRESSION'](#view_model_eventcall_expression)</code>
    - <code>[*ref-prop](#ref-prop)</code>
  - _converters_
    - <code>[boolean-to-inList(item, list)](#boolean-to-inlistitem-list)</code>
    - <code>[string-to-any(~item)](#string-to-anyitem)</code>
    - <code>[not(~value)](#notvalue)</code>
    - <code>[index-to-selected(~item, list)](#index-to-selecteditem-list)</code>

## API


### <code>{(child-prop)}="key"</code>


  Two-way binds `childProp` in the  [can-component::ViewModel ViewModel] to
  [can-stache.key] in the parent [can-view-scope scope].  If `childProp` is updated `key` will be updated
  and vice-versa.

  ```
  <my-component {(some-prop)}="value"/>
  ```

  When setting up the binding:

  - If `childProp` is `undefined`, `key` will be set to `childProp`.
  - If `key` is `undefined`, `childProp` will be set to `key`.
  - If both `childProp` and `key` are defined, `key` will be set to `childProp`.




1. __child-prop__ <code>{String}</code>:
  The name of the property of the viewModel to two-way bind.

1. __key__ <code>{can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call|can-stache/expressions/helper}</code>:
  A call expression whose value will be used to two-way bind in the parent scope.


### <code>{($child-prop)}="key"</code>


  Two-way binds the element's `childProp` property or attribute to
  [can-stache.key] in the parent [can-view-scope scope].  If `childProp` is updated `key` will be updated
  and vice-versa.

  ```
  <input {($value)}="name"/>
  ```


1. __child-prop__ <code>{String}</code>:
  The name of the element's property or attribute to two-way bind.

1. __key__ <code>{can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call|can-stache/expressions/helper}</code>:
  A call expression whose value will be used to two-way bind in the parent scope.


### <code>{child-prop}="key"</code>


  Imports [can-stache.key] in the [can-view-scope scope] to `childProp` in [can-component::ViewModel ViewModel]. It also updates `childProp` with the value of `key` when `key` changes.

  ```
  <my-component {some-prop}="value"/>
  ```


1. __child-prop__ <code>{String}</code>:
  The name of the property to set in the
  component's viewmodel.

1. __key__ <code>{can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call|can-stache/expressions/helper}</code>:
  An expression whose resulting value is used to set as `childProp`.


### <code>{$child-prop}="key"</code>


  Imports [can-stache.key] in the [can-view-scope scope] to `childProp` property or attribute on the element.

  ```
  <input {$value}="name"/>
  ```

  This signature works, but the following should be used instead:

  ```
  <input value="{{name}}"/>
  ```


### <code>{^child-prop}="key"</code>


Exports `childProp` in the [can-component::ViewModel ViewModel] to [can-stache.key] in the parent [can-view-scope scope]. It also updates
`key` with the value of `childProp` when `childProp` changes.

```
<my-component {^some-prop}="value"/>
```


1. __child-prop__ <code>{String}</code>:
  The name of the property to export from the
  child components viewmodel. Use `{^this}` or `{^.}` to export the entire viewModel.

1. __key__ <code>{can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call|can-stache/expressions/helper}</code>:
  An expression that will be used to set in the parent scope.


### <code>{^$child-prop}="key"</code>


  Exports the element's `childProp` property or attribute to [can-stache.key] in the parent [can-view-scope scope]. It also updates
  `key` with the value of `childProp` when `childProp` changes.

  ```
  <input {^$value}="name"/>
  ```


1. __child-prop__ <code>{String}</code>:
  The name of the element's property or attribute to export.

1. __key__ <code>{can-stache/expressions/literal|can-stache/expressions/key-lookup|can-stache/expressions/call|can-stache/expressions/helper}</code>:
  An expression whose resulting value with be used to set in the parent scope.



### <code>($DOM_EVENT)='CALL_EXPRESSION'</code>


Listens to an event on the element and calls the [can-stache/expressions/call] when that event occurs.

```
<div ($click)="doSomething()"/>
```


1. __DOM_EVENT__ <code>{String}</code>:
  A DOM event name like "click".

1. __CALL_EXPRESSION__ <code>{can-stache/expressions/call}</code>:
  A call expression like `method(key)` that is called when the `DOM_EVENT` is fired. The following key values are also supported:

   - `%element` - The element the event happened upon.
   - `$element` - The element the event happened upon.
   - `%event` - The event object.
   - `%viewModel` - If the element is a [can-component], the component's [can-component::ViewModel ViewModel].
   - `%context` - The current context.
   - `%scope` - The current [can-view-scope scope].


### <code>(VIEW_MODEL_EVENT)='CALL_EXPRESSION'</code>


Listens to an event on the element's [can-component::ViewModel ViewModel] and calls the [can-stache/expressions/call] when that event occurs.

```
<my-component (show)="doSomething()"/>
```


1. __VIEW_MODEL_EVENT__ <code>{String}</code>:
  A view model event name.

1. __CALL_EXPRESSION__ <code>{can-stache.expressions}</code>:
  A call expression like `method(key)` that is called when the `VIEW_MODEL_EVENT`
  is fired. The following key values are also supported:

   - `%element` - The element the event happened upon.
   - `$element` - The [can.$] wrapped element the event happened upon.
   - `%event` - The event object.
   - `%viewModel` - If the element is a [can-component], the component's [can-component::ViewModel ViewModel].
   - `%context` - The current context.
   - `%scope` - The current [can-view-scope].



### <code>*ref-prop</code>


  A shorthand for exporting an element's viewModel to the reference scope.


1. __ref-prop__ <code>{String}</code>:
  The name of the property to set in the template's 'references' scope.


### <code>boolean-to-inList(item, list)</code>


When the getter is called, returns true if **item** is within the **list**, determined using `.indexOf`.

When the setter is called, if the new value is truthy then the item will be added to the list using `.push`; if it is falsey the item will removed from the list using `.splice`.

```handlebars
<input type="checkbox" {($value)}="boolean-to-inList(item, list)" />
```


1. __item__ <code>{*}</code>:
  The item to which to check
1. __list__ <code>{can-define/list/list|can-list|Array}</code>:
  The list

- __returns__ <code>{can-compute}</code>:
  A compute that will be used by undefined as a getter/setter when the element's value changes.


### <code>string-to-any(~item)</code>


When the getter is called, gets the value of the compute and calls `.toString()` on that value.

When the setter is called, takes the new value and converts it to the primitive value using [can-util/js/string-to-any/string-to-any] and sets the compute using that converted value.

```handlebars
<select {($value)}="string-to-any(~favePlayer)">
  <option value="23">Michael Jordan</option>
	<option value="32">Magic Johnson</option>
</select>
```


1. __item__ <code>{can-compute}</code>:
  A compute holding a primitive value.

- __returns__ <code>{can-compute}</code>:
  A compute that will be used by undefined as a getter/setter when the element's value changes.


### <code>not(~value)</code>


When the getter is called, gets the value of the compute and returns the negation.

When the setter is called, sets the compute's value to the negation of the new value derived from the element.

*Note* that `not` needs a compute so that it can update the scope's value when the setter is called.

```handlebars
<input type="checkbox" {($checked)}="not(~val)" />
```


1. __value__ <code>{can-compute}</code>:
  A value stored in a [can-compute].

- __returns__ <code>{can-compute}</code>:
  A compute that will be two-way bound by undefined as a getter/setter on the element.


### <code>index-to-selected(~item, list)</code>


When the getter is called, returns the index of the passed in item (which should be a [can-compute] from the provided list.

When the setter is called, takes the selected index value and finds the item from the list with that index and passes that to set the compute's value.

```handlebars
<select {($value)}="index-to-selected(~person, people)">

	{{#each people}}

		<option value="{{%index}}">{{name}}</option>

	{{/each}}

</select>
```


1. __item__ <code>{can-compute}</code>:
  A compute whose item is in the list.
1. __list__ <code>{can-define/list/list|can-list|Array}</code>:
  A list used to find the `item`.

- __returns__ <code>{can-compute}</code>:
  A compute that will be two-way bound to the select's value.


## Contributing

### Making a Build

To make a build of the distributables into `dist/` in the cloned repository run

```
npm install
node build
```

### Running the tests

Tests can run in the browser by opening a webserver and visiting the `test.html` page.
Automated tests that run the tests from the command line in Firefox can be run with

```
npm test
```
