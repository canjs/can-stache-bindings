@module {Object} can-stache-bindings
@parent can-views
@collection can-core
@group can-stache-bindings.syntaxes Syntaxes
@package ../package.json
@outline 2

Listen to events and create one-way and two-way bindings.

@type {Object}

`can-stache-bindings` exports a binding object that can be added to [can-stache]
via [can-stache.addBindings] as follows:

  ```js
  import {stache, stacheBindings} from "can";

  stache.addBindings(stacheBindings);
  ```

  This is automatically done by [can-component]. So these bindings are
  typically available automatically in [can-stache].

@body

## Purpose

Bindings allow communication between html elements
and observables like [can-component.prototype.ViewModel ViewModels] and
[can-rest-model models].

Communication happens primarily by:

- Listening to events and calling methods (`<button on:click="this.doSomething()">`)
- Passing values (`<input value:from="this.name">`)

`can-stache-bindings` are designed to be:

- Powerful - Many different types of binding behaviors are possible:
  - Pass data down and keep updating: `<input value:from="this.name"/>`
  - Pass data up and keep updating: `<input value:to="this.name"/>`
  - Pass data up and update on a specified event: `<input on:input:value:to="this.name"/>`
  - Update both directions: `<input value:bind="this.name"/>`
  - Listen to events and call a method: `<input on:change="this.doSomething()"/>`
  - Listen to events and set a value: `<input on:change="this.name = scope.element.value"/>`
- Declarative - Instead of magic tags like `(click)` or `{(key)}`, it uses descriptive terms like `on:`, `:from`, `:to`, and `:bind` so beginners have an idea of what is happening.


`can-stache-bindings` is separate from `stache` as other view-binding syntaxes
have been supported in the past.

## Use

The `can-stache-bindings` plugin provides useful [can-view-callbacks.attr custom attributes] for template declarative events, one-way bindings, and two-way
bindings on element attributes, component [can-component::ViewModel ViewModels], and the [can-view-scope scope].
Bindings communicate between two entities, typically a __parent__
entity and a __child__ entity.  Bindings look like:


- `on:event="key()"` for event binding.
- `prop:from="key"` for one-way binding to a child.
- `prop:to="key"` for one-way binding to a parent.
- `prop:bind="key"` for two-way binding.

> __Note:__ DOM attribute names are case-insensitive, but [can-component::ViewModel ViewModel] or [can-view-scope scope] properties can be `camelCase` and [can-stache stache] will encode them so they work correctly in the DOM.

The following are the bindings available within [can-stache]:

- __[can-stache-bindings.event event]__

  Binds to `childEvent` on `<my-component>`'s [can-component::ViewModel ViewModel] and calls
  `method` on the [can-view-scope scope] with the specified arguments:

  ```html
  <my-component on:childEvent="method('primitive', key, hash1=key1)"/>
  ```

  If the element does not have a [can-component::ViewModel ViewModel], binds to `domEvent` on the element and calls
  `method` on the [can-view-scope scope] with the specified arguments:

  ```html
  <div on:domEvent="method('primitive', key, hash1=key1)"/>
  ```

  You can also set a value. The following sets the `todo.priority` property to `1` when the button is clicked:

  ```html
  <button on:click="todo.priority = 1">Critical</button>
  ```

- __[can-stache-bindings.toChild one-way to child]__

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

  > __Note:__ If the value being passed to the component is an object, changes to the object's properties will still be visible to the component.   Objects are passed by reference. See [can-stache-bindings#OneWayBindingWithObjects One Way Binding With Objects].

- __[can-stache-bindings.toParent one-way to parent]__

  Updates `value` in the [can-view-scope scope]  with `childProp`
  in `<my-component>`’s [can-component::ViewModel ViewModel]:

  ```html
  <my-component childProp:to="value"/>
  ```

  > This can be read as "send `childProp` _to_ `value`".

  If the element does not have a [can-component::ViewModel ViewModel], it updates `value`
  in the [can-view-scope scope] with the `childAttr` attribute or property of the element.

  ```html
  <div childAttr:to="value"/>
  ```

  > __Note:__ If the value being passed to the component is an object, changes to the object's properties will still be visible to the component.   Objects are passed by reference. See [can-stache-bindings#OneWayBindingWithObjects One Way Binding With Objects].

- __[can-stache-bindings.twoWay two-way]__

  Updates `childProp` in `<my-component>`’s [can-component::ViewModel ViewModel] with `value` in the [can-view-scope scope] and vice versa:

  ```html
  <my-component childProp:bind="value"/>
  ```

  Updates the `childAttr` attribute or property of the element with `value`
  in the [can-view-scope scope] and vice versa:

  ```html
  <div childAttr:bind="value"/>
  ```

### Call a function when an event happens on an element

Use [can-stache-bindings.event] to listen to when an event is dispatched on
an element.  The following calls the `ViewModel`'s `sayHi` method when the
button is clicked:

```html
<say-hi></say-hi>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "my-counter",
	view: `
		<button on:click="this.sayHi()">Say Hi</button>
	`,
	ViewModel: {
		sayHi(){
			alert("Hi!");
		}
	}
});
</script>
```

The event, element, and arguments the event handler would be called with are available
via [can-stache/keys/scope].  The following prevents the form from being submitted
by passing `scope.event`:

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "my-demo",
	view: `
		<form on:submit="this.reportData(scope.element, scope.event)">
			<input name="name" placeholder="name"/>
			<input name="age" placeholder="age"/>
			<button>Submit</button>
		</form>
		<h2>Data</h2>
		<ul>
			{{# for(data of this.submissions) }}
				<li>{{data}}</li>
			{{/for}}
		</ul>
	`,
	ViewModel: {
		submissions: {default: () => []},
		reportData(form, submitEvent){
			submitEvent.preventDefault();
			var data = JSON.stringify({
				name: form.name.value,
				age: form.age.value
			});
			this.submissions.push( data );
		}
	}
});
</script>
```
@codepen

### Call a function when a custom event happens on an element

Custom events can be a great way to simplify complex DOM interactions.
[can-stache-bindings.event] listens to:

- Custom events dispatched by the browser (`element.dispatchEvent(event)`)
- Custom events registered by [can-dom-events].

<details>
<summary>
See an example of dispatching custom events.
</summary>

The following example shows a `<in-view>` component that dispatches a `inview` [custom event](https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Creating_and_triggering_events) on elements when
they scroll into view. `<my-demo>` listens to those events and loads data with `<div on:inview="this.getData(item)">`.

```html
<my-demo></my-demo>
<style>
in-view { display: block; height: 90vh;
		  border: solid 1px black; overflow: auto; }
</style>
<script type="module">
import {Component} from "can";

var isVisibleSymbol = Symbol("isVisible");

Component.extend({
	tag: "in-view",
	view: `<content/>`,
	ViewModel: {
		connectedCallback(el) {
			function dispatchEvents(){
				// Get all visible elmenets
				var visible = Array.from(el.childNodes).filter( (child) => {
					return child.offsetTop > el.scrollTop
						&& child.offsetTop <= el.scrollTop + el.clientHeight
				});
				// dispatch event on elements that have not
				// been dispatched
				visible.forEach(function(child){
					if(!child[isVisibleSymbol]) {
						child[isVisibleSymbol] = true;
						child.dispatchEvent(new Event('inview'));
					}
				});
			}
			// Dispatch on visible elements right away
			dispatchEvents();
			// On scroll, dispatch
			this.listenTo(el,"scroll", dispatchEvents);
		}
	}
});

Component.extend({
	tag: "my-demo",
	view: `
		<in-view>
			{{# for(item of this.items) }}
				<div on:inview="this.getData(item)">
					{{item.data}}
				</div>
			{{/ for }}
		</in-view>
	`,
	ViewModel: {
		items: {
			default() {
				var items = [];
				for(var i = 0; i < 400; i++) {
					items.push({data: "unloaded"});
				}
				return items;
			}
		},
		getData(item) {
			item.data = "loading..."
			setTimeout(function(){
				item.data = "loaded";
			},Math.random() * 1000);
		}
	}
});
</script>
```
@codepen

</details>




<details>
<summary>
See an example of using custom events.
</summary>

CanJS has a special event registry - [can-dom-events]. You can add custom events to to this registry and
listen to those events with [can-stache-bindings.event].

CanJS already has several custom events:
- [can-dom-mutate/events/events domMutateEvents] - Listen to when an element is inserted or removed.
- [can-event-dom-enter] - Listen to when the _Enter_ key is pressed.

The following adds the enter and inserted event into the global registry and uses them:

```html
<my-demo></my-demo>
<script src="//cdnjs.cloudflare.com/ajax/libs/animejs/2.0.2/anime.min.js"></script>
<style>
.light {position: relative; left: 20px; width: 100px; height: 100px;}
.red {background-color: red;}
.green {background-color: green;}
.yellow {background-color: yellow;}
</style>
<script type="module">
import {Component, domEvents, enterEvent, domMutateDomEvents} from "can/everything";

domEvents.addEvent(enterEvent);
domEvents.addEvent(domMutateDomEvents.inserted);

Component.extend({
	tag: "my-demo",
	view: `
		<div class="container" tabindex="0"
			on:enter="this.nextState()">
			Click me and hit enter.
			{{# switch(this.state) }}
					{{# case("red") }}
							<div class="light red"
								on:inserted="this.shake(scope.element)">Red Light</div>
					{{/ case }}
					{{# case("yellow") }}
							<div class="light yellow"
								on:inserted="this.shake(scope.element)">Yellow Light</div>
					{{/ case }}
					{{# case("green") }}
							<div class="light green"
								on:inserted="this.shake(scope.element)">Green Light</div>
					{{/case}}
			{{/switch}}
		</div>
	`,
	ViewModel: {
		state: {default: "red"},
		nextState(){
			var states = {red: "yellow", yellow: "green", green: "red"};
			this.state = states[this.state];
		},
		shake(element){
			anime({
				targets: element,
				translateX: [ 10,-10,0 ],
				easing: 'linear'
			});
		}
	}
});
</script>
```
@codepen
@highlight 19,24

</details>


### Call a function when an event happens on a ViewModel

Use [can-stache-bindings.event] to listen to when an event is dispatched on
a [can-component]'s [can-component.prototype.ViewModel].

In the following example, `<my-demo>` listens to `number` events from `<random-number-generator>`'s `ViewModel`:

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "random-number-generator",
	ViewModel: {
		connectedCallback(){
			const interval = setInterval( () => {
				this.dispatch({type: "number", value: Math.random()})
			}, 1000);

			return ()=> {
				clearInterval(interval);
			};
		}
	}
})

Component.extend({
	tag: "my-demo",
	view: `
		<random-number-generator on:number="this.addNumber(scope.event.value)"/>
		<h2>Numbers</h2>
		<ul>
			{{# for(number of this.numbers) }}
				<li>{{number}}</li>
			{{/for}}
		</ul>
	`,
	ViewModel: {
		numbers: { default: ()=>[] },
		addNumber(number){
			this.numbers.push(number);
		}
	}
});
</script>
```
@codepen

Note that when properties are set on a `ViewModel` these produce events too. In the following example, `<my-demo>` listens to
`number` produced when `<random-number-generator>`'s `ViewModel`'s `number` property [can-define.types.value changes]:


```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "random-number-generator",
	ViewModel: {
		number: {
			value({resolve}){
				const interval = setInterval( () => {
					resolve(Math.random())
				}, 1000);

				return ()=> {
					clearInterval(interval);
				};
			}
		}
	}
});

Component.extend({
	tag: "my-demo",
	view: `
		<random-number-generator on:number="this.addNumber(scope.viewModel.number)"/>
		<h2>Numbers</h2>
		<ul>
			{{# for(number of this.numbers) }}
				<li>{{number}}</li>
			{{/for}}
		</ul>
	`,
	ViewModel: {
		numbers: { default: ()=>[] },
		addNumber(number){
			this.numbers.push(number);
		}
	}
});
</script>
```
@codepen

### Call a function when an event happens on a value in the scope (animation)

Use `on:event:by:value` to listen to an event and call a method.  This can often be useful for running animations.

The following listens to when a todo's `complete` event is fired and calls `this.shake`. `this.shake` uses [anime](http://animejs.com/) to animate the `<div>`:

```html
<my-demo></my-demo>
<script src="//cdnjs.cloudflare.com/ajax/libs/animejs/2.0.2/anime.min.js"></script>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "my-demo",
	view: `
		{{# for(todo of this.todos) }}
			<div on:complete:by:todo="this.shake(scope.element)">
				<input type="checkbox" checked:bind="todo.complete"/>
				{{todo.name}}
			</div>
		{{/ for }}
	`,
	ViewModel: {
		todos: {
			default: ()=> [
				{name: "animate", complete: false},
				{name: "celebrate", complete: true}
			]
		},
		shake(element){
			anime({
				targets: element,
				translateX: [ 10,-10,0 ],
				easing: 'linear'
			});
		}
	}
});
</script>
```
@codepen
@highlight 10


### Update an element's value from the scope

Use [can-stache-bindings.toChild] to:

- initialize an element's property or attribute with the
  value from [can-stache stache's] [can-view-scope scope], and
- update the element's property or attribute with the scope value changes.

The following shows updating the _BIG RED BUTTON_'s `disabled` from
`this.enabled` in the scope. The [can-stache.helpers.not] helper
is used to inverse the value of `this.enabled`. Notice that as `this.enabled`
changes, `disabled` updates.


```html
<my-demo></my-demo>
<style>
.big-red {
	background-color: red; color: white;
	display: block; width: 100%; height: 50vh;
	cursor: pointer;
}
.big-red:disabled {
	background-color: #800000;
	color: black; cursor: auto;
}
</style>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "my-demo",
	view: `
		<button on:click="this.enabled = true">Enable</button>
		<button on:click="this.enabled = false">Disable</button>

		<button
			disabled:from="not(this.enabled)"
			on:click="this.boom()"
			class="big-red">BIG RED BUTTON</button>
	`,
	ViewModel: {
		enabled: {default: false},
		boom() {
			alert("Red Alert!");
		}
	}
});
</script>
```
@highlight 23
@codepen



### Update a component ViewModel's value from the scope

Use [can-stache-bindings.toChild] to:

- initialize a [can-component Component]'s [can-component.prototype.ViewModel] property value from [can-stache stache's] [can-view-scope scope], and
- update the ViewModel property with the scope value changes.

The following

```html
<my-demo></my-demo>
<style>
percentage-slider {
	border: solid 1px black;
	width: 100px; height: 20px;
	display: inline-block;
}
.percent { background-color: red; height: 20px; }
</style>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "percentage-slider",
	view: `
		<div class="percent" style="width: {{this.percent}}%"></div>
	`,
	ViewModel: {
		percent: "number"
	}
});

Component.extend({
	tag: "my-demo",
	view: `
		Percent Complete: <br/>
		<percentage-slider percent:from="this.value"/>
		<br/>
		<button on:click="this.increase(-5)">-5</button>
		<button on:click="this.increase(5)">+5</button>
	`,
	ViewModel: {
		value: {default: 50, type: "number"},
		increase(amount){
			var newValue = this.value + amount;
			if(newValue >= 0 && newValue <= 100) {
				this.value += amount;
			}
		}
	}
});
</script>
```
@highlight 27
@codepen

[can-stache-bindings.toChild] can be used to pass the results of functions like `percent:from="this.method()"`.


### Pass a value from an element to the scope

Use [can-stache-bindings.toParent] to pass a value from an element to a value
on the scope.

The following updates `name` on the ViewModel when the `<input>`'s _change_ event fires:


```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "my-demo",
	view: `
		<p>Name: {{this.name}}</p>
		<p>Update name when "change" fires: <input value:to="this.name"/></p>
	`,
	ViewModel: {
		name: "string"
	}
});
</script>
```
@highlight 9
@codepen


The element value will be read immediately and used to set the scope value.  The following
shows that the default `name` will be overwritten to the empty string:

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "my-demo",
	view: `
		<p>Name: {{this.name}}</p>
		<p>Update name when "change" fires: <input value:to="this.name"/></p>
	`,
	ViewModel: {
		name: {default: "Justin"}
	}
});
</script>
```
@highlight 12
@codepen

Use `on:event:elementPropery:to` to customize which event to listen to.  The following
switches to the `input` event:

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "my-demo",
	view: `
		<p>Name: {{this.name}}</p>
		<p>Update name as you type: <input on:input:value:to="this.name"/></p>
	`,
	ViewModel: {
		name: {default: "Justin"}
	}
});
</script>
```
@highlight 9
@codepen

> NOTE: Using `on:event:elementPropery:to` prevents initialization of the value until an event happens.
> You'll notice the `name` is left as `"Justin"` until you start typing.


### Pass a value from a component to the scope

Use [can-stache-bindings.toParent] to pass a value from a component to a value
on the scope.




### TWO WAY




### Pass values between siblings



The following shows some of the various ways the `<my-demo>.viewModel`'s `name`
property value can be passed and updated:

```html
<my-demo></my-demo>
<script type="module">
import {Component, fixture} from "can";

Component.extend({
	tag: "random-name",
	view: `
		<button on:click="this.pickRandomName()">Pick Random Name</button>
	`,
	ViewModel: {
		name: "string",
		names: "any",
		pickRandomName(){
			this.name = fixture.rand(this.names,1)[0];
		}
	}
});

Component.extend({
	tag: "my-demo",
	view: `
		<p>The current value of name: {{this.name}}.</p>
		<p>Update name when "change" fires: <input value:to="this.name"/></p>
		<p>Update name as you type: <input on:input:value:to="this.name"/></p>
		<p>Update name as you type, but also update as name changes by
			other means: <input on:input:value:bind="this.name"/>
		<p><button on:click="this.name = 'Bohdi'">Set name to Bohdi</button></p>
		<p><random-name
			names:from="this.nameChoices"
			on:name="this.name = scope.viewModel.name"/></p>
	`,
	ViewModel: {
		name: {type: "string", default: "Justin"},
		nameChoices: {
			default: ()=> [
				"Ramiya","Justin","Payal","Kathrine","Barry","Maya"
			]
		}
	}
});

</script>
```
@codepen

## Use



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
