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

## Basic Use

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

### Pass an element to the scope

You can use `this:to="key"` to pass an element reference to a value on the scope (typically a ViewModel).

The following adds the `video` element to the `ViewModel` so it can be played when `playing` is set to true:

```html
<video-player src:raw="http://bit.ly/can-tom-n-jerry"></video-player>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "video-player",
	view: `
		<video this:to="this.video">
			<source src="{{src}}"/>
		</video>
		<button on:click="togglePlay()">
			{{#if(this.playing)}} Pause {{else}} Play {{/if}}
		</button>
	`,
	ViewModel: {
		video: "any",
		src: "string",
		playing: "boolean",
		togglePlay() {
			this.playing = !this.playing;
		},
		connectedCallback(element) {
			this.listenTo("playing", (event, isPlaying) => {
				if (isPlaying) {
					this.video.play();
				} else {
					this.video.pause();
				}
			});
		}
	}
});
</script>
```
@highlight 8
@codepen

### Pass a value from a component to the scope

Use [can-stache-bindings.toParent] to pass a value from a component to a value
on the scope.

The following uses passes random numbers from `<random-number-generator>` to
`<my-demo>` using `number:to=""`

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
					resolve(Math.random());
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
		<random-number-generator number:to="this.randomNumber"/>
		<h1>Your random number is {{this.randomNumber}}</h1>
	`,
	ViewModel: {
		randomNumber: "number"
	}
});
</script>
```
@highlight 24
@codepen

> NOTE: Just like passing an element value to the scope, passing a ViewModel value
> will overwrite existing scope values. You can use `on:event:key:to="scopeValue"`
> to specify the event to listen to.



### Keep a parent and child in sync

Use [can-stache-bindings.twoWay] to keep a parent and child value in sync.  Use [can-stache-bindings.twoWay]
to keep either an element or ViewModel value in sync with a scope value.

The following keeps an `<input>`'s `.value` in sync with `this.name` in the scope:

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "my-demo",
	view: `
		<p>Name is currently: {{this.name}}</p>
		<p><input value:bind="this.name"/></p>
	`,
	ViewModel: {
		name: {default: ""}
	}
});
</script>
```
@highlight 9
@codepen

Use `on:event:key:bind="scopeValue"` to specify the event that should
cause the scope value to update. The following updates `this.name` when
the `<input>`'s `input` event fires:

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "my-demo",
	view: `
		<p>Name is currently: {{this.name}}</p>
		<p><input on:input:value:bind="this.name"/></p>
	`,
	ViewModel: {
		name: {default: ""}
	}
});
</script>
```
@highlight 9
@codepen

> NOTE: [can-stache-bindings.twoWay] always initializes parent and child values to match, even if `on:event:key:bind="scopeKey"`
> is used to specify the type of event. Read more about initialization on [can-stache-bindings.twoWay].

The following keeps a [can-component.prototype.ViewModel] in sync with a
scope value:

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "name-editor",
	view: `
		<input placeholder="first" value:bind="first"/>
		<input placeholder="last" value:bind="last"/>
	`,
	ViewModel: {
		first: "string",
		last: "string",
		get fullName(){
			return this.first + " " + this.last;
		},
		set fullName(newVal) {
			var parts = newVal.split(" ");
			this.first = parts[0] || "";
			this.last = parts[1] || "";
		}
	}
});

Component.extend({
	tag: "my-demo",
	view: `
		<p>Name is currently: {{this.name}}</p>
		<p><name-editor fullName:bind="this.name"/></p>
		<p><button on:click="this.name = 'Captain Marvel'">Set name as Captain Marvel</button>
	`,
	ViewModel: {
		name: {default: "Carol Danvers"}
	}
});
</script>
```
@highlight 29
@codepen


## Other Uses

The following are some advanced or non-obvious use cases.

### Pass values between siblings

Sometimes you have two sibling components or elements that need to communicate and creating
a value in the parent component is unnecessary.  Use [can-stache.helpers.let] to create a
variable that gets passed between both elements. The following creates an `editing` variable that
is used to communicate between `<my-drivers>` and `<edit-plate>`:

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "my-drivers",
	view: `
		<ul>
			{{# for(driver of this.drivers) }}
				<li on:click="this.selected = driver">
					{{ driver.title }} {{ driver.first }} {{ driver.last }} - {{ driver.licensePlate }}
				</li>
			{{/ for }}
		</ul>
	`,
	ViewModel: {
		drivers: {
			default() {
				return [
					{ title: "Dr.", first: "Cosmo", last: "Kramer", licensePlate: "543210" },
					{ title: "Ms.", first: "Elaine", last: "Benes", licensePlate: "621433" }
				];
			}
		},
		selected: "any"
	}
});

Component.extend({
	tag: "edit-plate",
	view: `<input on:input='this.plateName = scope.element.value'
				 value:from='this.plateName'/>`,
	ViewModel: {
		plateName: "string"
	}
});

Component.extend({
	tag: 'my-demo',
	view: `
		{{ let editing=undefined }}
		<my-drivers selected:to="editing"/>
		<edit-plate plateName:bind="editing.licensePlate"/>
	`
});
</script>
```
@highlight 41
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

### Using converters

Converters allow you to setup two-way translations between __child__ and __parent__ values.  These work
great with [can-stache-bindings.toParent] and [can-stache-bindings.twoWay] bindings.  

For example, [can-stache.helpers.not] can be used to update a scope value with the opposite of the
element's `checked` property:

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
    tag: "my-demo",
    view: `
		<input type="checkbox" checked:bind="not(this.activated)"/> Disable
	`,
	ViewModel: {
		activated: {default: true, type: "boolean"}
	}
});
</script>
```
@codepen

[can-stache.helpers.not] comes with [can-stache], however [can-stache-converters] has a bunch of
other useful converters.  You can also create your own converters with [can-stache.addConverter].



### Binding to custom attributes (focused and values)

[can-attribute-observable] creates observables used for binding
element properties and attributes. Currently, it

```html
<my-demo></my-demo>
<style>
:focus { background-color: yellow; }
</style>
<script type="module">
import {Component} from "can";

Component.extend({
    tag: "my-demo",
    view: `
		<input
			on:input:value:bind="this.cardNumber"
			placeholder="Card Number (9 digits)"/>
		<input size="4"
			on:input:value:bind="this.cvcNumber"
			focused:from="this.cvcFocus"
			on:blur="this.dispatch('cvcBlur')"
			placeholder="CVC"/>
		<button
			focused:from="this.payFocus"
			on:blur="this.dispatch('payBlur')">Pay</button>
	`,
	ViewModel: {
		cardNumber: "string",
		cvcFocus: {
			value({listenTo, resolve}) {
				listenTo("cardNumber", (ev, newVal) => {
					if(newVal.length === 9) {
						resolve(true);
					} else {
						resolve(false);
					}
				});
				listenTo("cvcBlur", () => {
					resolve(false);
				});
			}
		},
		cvcNumber: "string",
		payFocus: {
			value({listenTo, resolve}) {
				listenTo("cvcNumber", (ev, newVal) => {
					if(newVal.length === 3) {
						resolve(true);
					} else {
						resolve(false);
					}
				});
				listenTo("payBlur", () => {
					resolve(false);
				});
			}
		}
	}
});
</script>
```
@codepen

Read [can-attribute-observable] for a `values` example with `<select multiple>`.

### Bindings with objects

All of the bindings pass single references between __parent__ and __child__ values.  This means that objects that are passed are
passed as-is, they are not cloned or copied in anyway. And this means that changes to an object might be visible to either parent or
child.  The following shows passing a `name` object and that changes to that object's `first` and `last` are visible to the `<my-demo>` component:

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "name-editor",
	view: `
		<input on:input:value:bind="this.name.first"/>
		<input on:input:value:bind="this.name.last"/>
	`,
	ViewModel: {
		name: "any"
	}
});


Component.extend({
	tag: "my-demo",
	view: `
		<p>First: {{this.name.first}}, Last: {{this.name.last}}</p>
		<name-editor name:from="this.name"/>
	`,
	ViewModel: {
		name: {
			default(){
				return {first: "Justin", last: "Meyer"};
			}
		}
	}
});
</script>
```
@codepen

### Sticky Bindings

[can-stache-bindings.twoWay] bindings are _sticky_.  This means that if a __child__ value updates a __parent__ value and the
__parent__ and __child__ value do not match, the __parent__ value will be used to update the __child__ an additional time.

In the following example, `<parent-component>` always ensures that `parentName` is upper-cased.  If you type lower-case
characters in the input (example: `foo bar`), you'll see that both _Parent Name_ and _Child Name_ are left upper-cased, but not the input's value.

```html
<parent-component></parent-component>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "child-component",
	view: `
		<p>Child Name: {{this.childName}}</p>
		<input value:bind="this.childName"/>
	`,
	ViewModel: {
		childName: "any"
	}
});

Component.extend({
	tag: "parent-component",
	view: `
		<p>Parent Name: {{this.parentName}}</p>
		<child-component childName:bind="this.parentName"/>
	`,
	ViewModel: {
		parentName: {
			default: "JUSTIN MEYER",
			set(newVal){
				return newVal.toUpperCase();
			}
		}

	}
});
</script>
```
@codepen

This happens because after `parentName` is set, [can-bind] compares `parentName`'s '`FOO BAR` to `childName`'s
`foo bar`.  Because the are not equal, `childName` is set to `FOO BAR`.  Setting `childName` to `FOO BAR` will
also try to set the `<input>` to `FOO BAR`, but because the `<input>` started the chain of changes, this change will not  
be allowed and a warning will be logged.  See [Semaphore Warnings](#Semaphorewarnings) for more information about these warnings.

This can be fixed by changing from a two-way binding to an event and [can-stache-bindings.toChild] binding as follows:


```html
<parent-component></parent-component>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "child-component",
	view: `
		<p>Child Name: {{this.childName}}</p>
		<input value:from="this.childName" on:change="this.childName = scope.element.value"/>
	`,
	ViewModel: {
		childName: "any"
	}
});

Component.extend({
	tag: "parent-component",
	view: `
		<p>Parent Name: {{this.parentName}}</p>
		<child-component childName:bind="this.parentName"/>
	`,
	ViewModel: {
		parentName: {
			default: "JUSTIN MEYER",
			set(newVal){
				return newVal.toUpperCase();
			}
		}

	}
});
</script>
```
@codepen

## Warnings

### Semaphore warnings

You might see semaphore warnings in your application like:

> ```
> can-bind: attempting to update child AttributeObservable<input.value> to new value: undefined
> …but the child semaphore is at 1 and the parent semaphore is at 1. The number of allowed updates is 1.
> The child value will remain unchanged; it’s currently: "".
> Read https://canjs.com/doc/can-bind.html#Warnings for more information. Printing mutation history:
> child AttributeObservable<input.value> set.
> child AttributeObservable<input.value> NOT set.
> ```

You can see this warning in the following demo:

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "my-drivers",
	view: `
		<ul>
			{{# for(driver of this.drivers) }}
				<li on:click="this.selected = driver">
					{{ driver.title }} {{ driver.first }} {{ driver.last }} - {{ driver.licensePlate }}
				</li>
			{{/ for }}
		</ul>
	`,
	ViewModel: {
		drivers: {
			default: function () {
				return [
					{ title: "Dr.", first: "Cosmo", last: "Kramer", licensePlate: "543210" },
					{ title: "Ms.", first: "Elaine", last: "Benes", licensePlate: "621433" }
				];
			}
		},
		selected: "any"
	}
});

Component.extend({
	tag: "edit-plate",
	view: `<input on:input:value:bind='this.plateName'/>`,
	ViewModel: {
		plateName: "string"
	}
});

Component.extend({
	tag: 'my-demo',
	view: `
		{{ let editing=undefined }}
		<my-drivers selected:to="editing"/>
		<edit-plate plateName:bind="editing.licensePlate"/>
	`
});
</script>
```
@highlight 42
@codepen

The reason this is shown is because:

1. `<input on:input:value:bind='this.plateName'/>` updates `plateName` to `""`.
2. That attempts to set `editing.licensePlate` to `""`. But since `editing` is `undefined`,
   it's impossible to set a `licensePlate` property on `undefined`. Then, because bindings are
   sticky, we will try to pass down `undefined` as the `plateName`.  However, this will not be allowed
   as both a child and parent updated happened in the same cycle.


## How it works

Custom attributes are registered with [can-view-callbacks]. [can-stache] will call back these
handlers as it encounters these attributes.

For data bindings:

1. When those callbacks are encountered, an observable value is setup for
   both sides of the binding.  For example, `keyA:bind="keyB"` will create an observable
   representing the `keyA` value and an observable representing the `keyB` value.
2. Those observables are passed to [can-bind] which is used to update one value when the
   other value changes.

For component data bindings:

1. When a component is created, it processes all the binding attributes at the same time
   and it figures out the right-hand (scope) values first.
   This is so [can-component] can create it's ViewModel with the values in the scope.  This avoids unnecessary changes
   and improves perofrmance.

For event bindings:

1.  It parses the binding and attaches an event listener. When that event listener is called,
    it parses the right-hand expression and runs it.
