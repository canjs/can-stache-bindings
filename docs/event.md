@function can-stache-bindings.event \(event\)
@parent can-stache-bindings.syntaxes 0

@description Respond to events on elements or component ViewModels.

@signature `($DOM_EVENT)='CALL_EXPRESSION'`

Listens to an event on the element and calls the [can-stache/expressions/call] when that event occurs.

```
<div ($click)="doSomething()"/>
```

@param {String} DOM_EVENT A DOM event name like `click`.

@param {can-stache/expressions/call} CALL_EXPRESSION A call expression (e.g. `method(key)`) that is called when the `DOM_EVENT` is fired. The following key values are also supported:

 - `%element` - The element the event happened upon.
 - `%event` - The event object.
 - `%viewModel` - If the element is a [can-component], the component’s [can-component::ViewModel ViewModel].
 - `%context` - The current context.
 - `%scope` - The current [can-view-scope scope].
 - `%arguments` - The arguments passed when the event was dispatched/triggered.

@signature `(VIEW_MODEL_EVENT)='CALL_EXPRESSION'`

Listens to an event on the element’s [can-component::ViewModel ViewModel] and calls the [can-stache/expressions/call] when that event occurs.

```
<my-component (show)="doSomething()"/>
```

@param {String} VIEW_MODEL_EVENT A view model event.

@param {can-stache.expressions} CALL_EXPRESSION A call expression like `method(key)` that is called when the `VIEW_MODEL_EVENT`
is fired. The following key values are also supported:

 - `%element` - The element the event happened upon.
 - `%event` - The event object.
 - `%viewModel` - If the element is a [can-component], the component’s [can-component::ViewModel ViewModel].
 - `%context` - The current context.
 - `%scope` - The current [can-view-scope].
 - `%arguments` - The arguments passed when the event was dispatched/triggered.


@body

## Use

The use of `(event)` bindings changes between listening on __DOM events__ and __viewModel events__.

## DOM events

To listen for a DOM event, wrap the event name with `($event)` like:

```
<div ($click)="doSomething()"/>
```

By adding `($EVENT)='methodKey()'` to an element, the function pointed to
by `methodKey` is bound to the element’s `EVENT` event. The function can be
passed any number of arguments from the surrounding scope, or `name=value`
attributes for named arguments. Direct arguments will be provided to the
handler in the order they were given.

The following uses `($click)="items.splice(%index,1)"` to remove a
item from `items` when that item is clicked on.

@demo demos/can-stache-bindings/event-args.html

### Special Event Types

[can-stache-bindings] supports creating special event types
(events that aren’t natively triggered by the DOM), which are
bound by adding attributes like `($SPECIAL)='KEY'`. This is
similar to [$.special](http://benalman.com/news/2010/03/jquery-special-events/).

### ($enter)

`($enter)` is a special event that calls its handler whenever the enter
key is pressed while focused on the current element. For example:

	<input type='text' ($enter)='save()' />

The above template snippet would call the save method
(in the [can-view-scope scope]) whenever
the user hits the enter key on this input.

## viewModel events

To listen on a [can-component Component’s] [can-component.prototype.ViewModel ViewModel], wrap the event name with `(event)` like:

```
<player-edit
  	(close)="removeEdit()"
  	{player}="editingPlayer"/>
```

ViewModels can publish events on themselves. The following `<player-edit>` component
dispatches a `"close"` event on itself when its `close` method is called:

```
Component.extend({
  tag: "player-edit",
  template: can.view('player-edit-stache'),
  viewModel: {
    close: function(){
      this.dispatch("close");
    }
  }
});
```

The following demo uses this ability to create a close button that
hides the player editor:

@demo demos/can-component/paginate_next_event.html
