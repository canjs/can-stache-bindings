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

Use [can-stache-bindings.event] to listen to an event and call a method.  This can often be useful for running animations.

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


### Update an element's value from the scope

__Initialize an element with a value and keep the element up to date with the value__

Use [can-stache-bindings.toChild] to initialize an element's property or attribute with the
value from [can-stache stache's] [can-view-scope scope].  

```html
<my-demo></my-demo>
<script type="module">
import {Component} from "can";

Component.extend({
	tag: "my-counter",
	view: `
		Count: <span>{{this.count}}</span>
		<button on:click="this.increment()">+1</button>
	`,
	ViewModel: {
		count: {default: 0},
		increment() {
			this.count++;
		}
	}
});
</script>
```



### Update a component ViewModel's value from the scope

__Initialize a component's ViewModel with a value and keep the ViewModel up to date with the value__

### Pass a value from an element to the scope

### pass a value from


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
