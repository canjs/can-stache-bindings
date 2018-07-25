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

@signature `on:el:DOM_EVENT='CALL_EXPRESSION'`

Listens to an event on the element and calls the [can-stache/expressions/call] when that event occurs.

```html
<div on:el:click="doSomething()"/>
```

Parameters are the same as [can-stache-bindings.event#on_VIEW_MODEL_OR_DOM_EVENT__CALL_EXPRESSION_ on:VIEW_MODEL_OR_DOM_EVENT='CALL_EXPRESSION']

@signature `on:vm:VIEW_MODEL_EVENT='CALL_EXPRESSION'`

Listens to an event on the element’s [can-component::ViewModel ViewModel] and calls the [can-stache/expressions/call] when that event occurs.

```html
<my-component on:vm:show="doSomething()"/>
```

Parameters are the same as [can-stache-bindings.event#on_VIEW_MODEL_OR_DOM_EVENT__CALL_EXPRESSION_ on:VIEW_MODEL_OR_DOM_EVENT='CALL_EXPRESSION']

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

## DOM events

`on:el:` will listen for events on the DOM, `on:` can also be used to listen for DOM events if the element does not have a [can-component::ViewModel ViewModel].

```html
<div on:click="doSomething()"/>
```

By adding `on:EVENT='methodKey()'` to an element, the function pointed to
by `methodKey` is bound to the element’s `EVENT` event. The function can be
passed any number of arguments from the surrounding scope, or `name=value`
attributes for named arguments. Direct arguments will be provided to the
handler in the order they were given.

The following uses `on:click='../items.splice(scope.index,1)'` to remove an
item from `items` when that item is clicked on.

@demo demos/can-stache-bindings/event-args.html
@codepen

### Special Event Types

[can-stache-bindings] supports creating special event types
(events that aren’t natively triggered by the DOM), which are
bound by adding attributes like `on:SPECIAL='KEY'`. This is
similar to [$.special](http://benalman.com/news/2010/03/jquery-special-events/) in jQuery.

### on:enter

`on:enter` is a special event that calls its handler whenever the enter
key is pressed while focused on the current element. For example:

```html
<input type='text' on:enter='save()' />
```

The above template snippet would call the save method
(in the [can-view-scope scope]) whenever
the user hits the enter key on this input.

## viewModel events

To listen on a [can-component Component’s] [can-component.prototype.ViewModel ViewModel], prepend the event with `on:` (`on:vm:` can also be used to be make this more explicit) like:

```html
<player-edit
	on:close="removeEdit()"
	player:from="editingPlayer"/>
```

ViewModels can publish events on themselves. The following `<player-edit>` component
dispatches a `"close"` event on itself when its `close` method is called:

```js
Component.extend( {
	tag: "player-edit",
	view: stache( $( "#player-edit-stache" ).html() ),
	ViewModel: DefineMap.extend( {
		player: Player,
		close: function() {
			this.dispatch( "close" );
		}
	} )
} );
```

The following demo uses this ability to create a close button that
hides the player editor:

@demo demos/can-component/paginate_next_event.html
@codepen

## Changing a property when an event occurs

An event on either the element or viewModel can be set to bind the element’s value to a property
on the scope like:

```html
<input type="text" value="" on:blur:value:to="myScopeProp">
```

This will set the value of myScopeProp to the input’s value anytime the input loses focus.
