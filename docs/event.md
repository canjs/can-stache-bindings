@function can-stache-bindings.event on:event
@parent can-stache-bindings.syntaxes

@description Respond to events on elements or component ViewModels.

@signature `on:VIEW_MODEL_OR_DOM_EVENT='CALL_EXPRESSION'`

If the element has a [can-component::ViewModel ViewModel], listens to an event on the [can-component::ViewModel ViewModel] and calls the [can-stache/expressions/call] when that event occurs.

If the element does **not** have a [can-component::ViewModel ViewModel], listens to an event on the element and calls the [can-stache/expressions/call] when that event occurs.

```html
<my-component on:show="doSomething()"/>
```

@param {String} VIEW_MODEL_OR_DOM_EVENT A viewModel or DOM event.

@param {can-stache.expressions} CALL_EXPRESSION A call expression like `method(key)` that is called when the `VIEW_MODEL_EVENT`
is fired. The following [can-stache/keys/scope] key values are also supported:

 - `scope.element` - The element the event happened upon.
 - `scope.event` - The event object.
 - `scope.viewModel` - If the element is a [can-component], the component’s [can-component::ViewModel ViewModel].
 - `scope.context` - The current context.
 - `scope.scope` - The current [can-view-scope].
 - `scope.arguments` - The arguments passed when the event was dispatched/triggered.

@signature `on:VIEW_MODEL_OR_DOM_EVENT='KEY = VALUE'`

  Listen to an event and set a property value.  The following sets the `priority` property when
  a button is clicked:

  ```html
  <my-demo></my-demo>
  <script type='module'>
  import {Component} from "can";
  Component.extend({
    tag: "my-demo",
    view: `
      <p>Priority: {{this.priority}}</p>
      <button on:click="this.priority = 0">Urgent</button>
      <button on:click="this.priority = 1">Critical</button>
      <button on:click="this.priority = 10">Fahgettaboudit</button>
    `,
    ViewModel: {
      priority: {default: null}
    }
  });
  </script>
  ```
  @codepen

@param {String} VIEW_MODEL_OR_DOM_EVENT A viewModel or DOM event.

@param {String} key A key value to set. This can be any key accessible by the scope. For example:

- Set values on the __viewModel__ - `on:click="this.priority = 0"`.
- Set values on a __variable__ in the scope - `on:click="todo.priority = 0"`.
- Set values on a [can-stache/keys/scope] value - `on:click="scope.element.value = 0"`

@param {can-stache.expressions} VALUE An expression that evaluates to a value. For example:

- __primitives__ - `on:click="this.priority = 0"`
- __variables__ - `on:click="this.priority = todo.priority"`
- __functions__ - `on:click="this.priority = this.getPriority(todo)"`

The following [can-stache/keys/scope] values can also be read:

 - `scope.element` - The element the event happened upon.
 - `scope.event` - The event object.
 - `scope.viewModel` - If the element is a [can-component], the component’s [can-component::ViewModel ViewModel].
 - `scope.context` - The current context.
 - `scope.scope` - The current [can-view-scope].
 - `scope.arguments` - The arguments passed when the event was dispatched/triggered.

@param {can-stache.expressions} CALL_EXPRESSION A call expression like `method(key)` that is called when the `VIEW_MODEL_EVENT`
is fired.

@signature `on:VIEW_MODEL_OR_DOM_EVENT:KEY:to='SCOPE_VALUE'`

If the element has a [can-component::ViewModel ViewModel], listens to an event on the [can-component::ViewModel ViewModel] and binds the element’s value to the `SCOPE_VALUE` when that event occurs.

If the element does **not** have a [can-component::ViewModel ViewModel], listens to an event on the element and binds the element’s value to the `SCOPE_VALUE` when that event occurs.

```html
<my-component on:show:value:to="myScopeProp"/>
```

@param {String} VIEW_MODEL_OR_DOM_EVENT A viewModel or DOM event.

@param {String} SCOPE_VALUE A value in the current scope.

@signature `on:SCOPE_EVENT:by:this='CALL_EXPRESSION'`

Listens to an event on the [can-view-scope scope] and calls the [can-stache/expressions/call] when that event occurs.

```html
<my-component on:show:by:this="doSomething()"/>
```

@param {String} SCOPE_EVENT a scope event.

@param {can-stache.expressions} CALL_EXPRESSION A call expression like `method(key)` that is called when the `VIEW_MODEL_EVENT` is fired. Same as [can-stache-bindings.event#on_VIEW_MODEL_OR_DOM_EVENT__CALL_EXPRESSION_ on:VIEW_MODEL_OR_DOM_EVENT='CALL_EXPRESSION']

@signature `on:SCOPE_PROP_EVENT:by:SCOPE_PROP='CALL_EXPRESSION'`

Listens to an event on a property of the [can-view-scope scope] and calls the [can-stache/expressions/call] when that event occurs.

```html
<my-component on:show:by:obj="doSomething()"/>
```

@param {String} SCOPE_PROP_EVENT an event triggered by a scope property.

@param {String} SCOPE_PROP a scope property.

@param {can-stache.expressions} CALL_EXPRESSION A call expression like `method(key)` that is called when the `VIEW_MODEL_EVENT`
is fired. Same as [can-stache-bindings.event#on_VIEW_MODEL_OR_DOM_EVENT__CALL_EXPRESSION_ on:VIEW_MODEL_OR_DOM_EVENT='CALL_EXPRESSION']


@body

## Use

The [can-stache-bindings] page has many examples of [can-stache-bindings.event].
