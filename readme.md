# can-stache-bindings

[![Build Status](https://travis-ci.org/canjs/can-stache-bindings.png?branch=master)](https://travis-ci.org/canjs/can-stache-bindings)

Default binding syntaxes for [can-stache](https://github.com/canjs/can-stache).

  - <code>[{(child-prop)}="key"](#child-propkey)</code>
  - <code>[{($child-prop)}="key"](#child-propkey)</code>
  - <code>[{child-prop}="key"](#child-propkey)</code>
  - <code>[{$child-prop}="key"](#child-propkey)</code>
  - <code>[{^child-prop}="key"](#child-propkey)</code>
  - <code>[{^$child-prop}="key"](#child-propkey)</code>
  - <code>[($DOM_EVENT)='CALL_EXPRESSION'](#dom_eventcall_expression)</code>
  - <code>[(VIEW_MODEL_EVENT)='CALL_EXPRESSION'](#view_model_eventcall_expression)</code>
  - <code>[*ref-prop](#ref-prop)</code>

## API


### <code>{(child-prop)}="key"</code>


  Two-way binds `childProp` in the  [can.Component::viewModel viewModel] to 
  [can.stache.key] in the parent [can.view.Scope scope].  If `childProp` is updated `key` will be updated
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
  
1. __key__ <code>{String}</code>:
  The name of the property to two-way bind in the parent scope.
  

### <code>{($child-prop)}="key"</code>


  Two-way binds the element's `childProp` property or attribute to 
  [can.stache.key] in the parent [can.view.Scope scope].  If `childProp` is updated `key` will be updated
  and vice-versa.

  ```
  <input {($value)}="name"/>
  ```


1. __child-prop__ <code>{String}</code>:
  The name of the element's property or attribute to two-way bind.
  
1. __key__ <code>{String}</code>:
  The name of the property to two-way bind in the parent scope.
  

### <code>{child-prop}="key"</code>


  Imports [can.stache.key] in the [can.view.Scope scope] to `childProp` in [can.Component::viewModel viewModel]. It also updates
  `childProp` with the value of `key` when `key` changes.

  ```
  <my-component {some-prop}="value"/>
  ```


1. __child-prop__ <code>{String}</code>:
  The name of the property to set in the 
  component's viewmodel.
  
1. __key__ <code>{can.stache.expressions}</code>:
  A KeyLookup or Call expression whose value
  is used to set as `childProp`. 
  

### <code>{$child-prop}="key"</code>


  Imports [can.stache.key] in the [can.view.Scope scope] to `childProp` property or attribute on the element. 

  ```
  <input {$value}="name"/>
  ```

  This signature works, but the following should be used instead:
  
  ```
  <input value="{{name}}"/>
  ```


### <code>{^child-prop}="key"</code>


Exports `childProp` in the [can.Component::viewModel viewModel] to [can.stache.key] in the parent [can.view.Scope scope]. It also updates
`key` with the value of `childProp` when `childProp` changes.

```
<my-component {^some-prop}="value"/>
```


1. __child-prop__ <code>{String}</code>:
  The name of the property to export from the 
  child components viewmodel. Use `{^this}` or `{^.}` to export the entire viewModel.
  
1. __key__ <code>{String}</code>:
  The name of the property to set in the parent scope.
  

### <code>{^$child-prop}="key"</code>


  Exports the element's `childProp` property or attribute to [can.stache.key] in the parent [can.view.Scope scope]. It also updates
  `key` with the value of `childProp` when `childProp` changes.

  ```
  <input {^$value}="name"/>
  ```


1. __child-prop__ <code>{String}</code>:
  The name of the element's property or attribute to export.
  
1. __key__ <code>{String}</code>:
  The name of the property to set in the parent scope.
  
  

### <code>($DOM_EVENT)='CALL_EXPRESSION'</code>


Specify a callback function to be called on a particular DOM event.

```
<div ($click)="doSomething()"/>
```


1. __DOM_EVENT__ <code>{String}</code>:
  A DOM event name like "click". jQuery custom events can also
  be given. 
  
1. __CALL_EXPRESSION__ <code>{can.stache.expressions}</code>:
  A call expression like `method(key)` that is called when the `DOM_EVENT` 
  is fired. The following key values are also supported:
  
   - `%element` - The element the event happened upon.
   - `$element` - The [can.$] wrapped element the event happened upon.
   - `%event` - The event object.
   - `%viewModel` - If the element is a [can.Component], the component's [can.Component::viewModel viewModel].
   - `%context` - The current context.
   - `%scope` - The current [can.view.Scope].
  

### <code>(VIEW_MODEL_EVENT)='CALL_EXPRESSION'</code>


Specify a callback function to be called on a particular [can.Component::viewModel viewModel] event.

```
<my-component (show)="doSomething()"/>
```


1. __DOM_EVENT__ <code>{String}</code>:
  A DOM event name like "click". jQuery custom events can also
  be given. 
  
1. __CALL_EXPRESSION__ <code>{can.stache.expressions}</code>:
  A call expression like `method(key)` that is called when the `DOM_EVENT` 
  is fired. The following key values are also supported:
  
   - `%element` - The element the event happened upon.
   - `$element` - The [can.$] wrapped element the event happened upon.
   - `%event` - The event object.
   - `%viewModel` - If the element is a [can.Component], the component's [can.Component::viewModel viewModel].
   - `%context` - The current context.
   - `%scope` - The current [can.view.Scope].
  
  

### <code>*ref-prop</code>


  A shorthand for exporting an element's viewModel to the reference scope.


1. __ref-prop__ <code>{String}</code>:
  The name of the property to set in the template's 'references' scope.
  
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
