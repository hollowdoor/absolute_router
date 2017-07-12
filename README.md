absolute-router
==============

Install
-----

`npm install --save absolute-router`

Usage
----

**Warning:** url parsing in `absolute-router` could be brittle. Especially in Internet Explorer. Post an issue on github if you know of some way to make url parsing more stable for the time being.

You may need to transpile using `babel`, `rollup+buble`, or `rollup+babel`.

This a file that tests several possible path patterns.

```javascript
import { Router } from 'absolute-router';
import t from 'tap';

const router = new Router({
    relay(controls){
        runTests(controls);
    }
});

router.route({
    ['/'](){
        //A return value can be any value including a promise.
        return '/';
    },
    ['/user'](params, query){
        return '/user';
    },
    ['/user/stuff'](){
        return '/user/stuff';
    },
    //Simple named parameter
    ['/user/stuff/:prop'](params, query){
        return params;
    },
    //Splat parameter
    ['/page/*nums'](params){
        return params;
    },
    //Using a regular expression parameter.
    ['/page/{[abc]}reg/bla'](params){
        return params;
    },
    ['/err'](){
        //Make your own error.
        //this.reject() returns a rejected promise.
        return this.reject('err');
    }
});

function runTests(controls){

    [
        '/',
        '/user',
        '/user/stuff'
    ].reduce((p, val)=>{
        return p.then(a=>{
            return controls.navigate(val).then(res=>t.equal(res, val));
        });
    }, Promise.resolve(null))
    .then(v=>{
        return controls.navigate('/user/stuff/thing?hello=world')
        .then(res=>t.equal(res.prop, 'thing', 'A param.'));
    })
    .then(v=>{
        return controls.navigate('/page/3/2/1')
        .then(res=>t.same(res.nums, [3,2,1], 'A splat.'));
    })
    .then(v=>{
        return controls.navigate('/page/a/bla')
        .then(res=>t.same(res.reg[0], 'a', 'A regular expression.'));
    })
    .then(v=>{
        return controls.navigate('/bla')
        .catch(e=>t.equal(e.status, 404));
    })
    .then(v=>{
        return controls.navigate('/err')
        .catch(e=>{
            t.equal(e.message, 'err');
            t.end();
        });
    })
    .catch(t.threw);
}
```

API
---

### new Router(options) -> router

Construct a router.

#### options.relay(controls) -> promise

The `relay()` options method exposes the controls for the router.

#### options.base

The base option is optional. The value of `options.base` will be passed to the URL constructor when `controls.navigate()` is called. See the [whatwg](https://url.spec.whatwg.org/#constructors) spec to learn more.

##### controls.navigate(path, ...args) -> promise

Call the navigate method to execute a route.

`...args` is added to the arguments of any executed route after `params`, and `query` arguments.

`path` can be a whole url including/excluding the query string, or just a path.

### router.route(routes)

Set some routes with the `route()` method. `routes` should be an object with paths as property names, and functions that will run later when `controls.navigate(path)` is called.

### router.reject(message)

Create a rejected promise with an error providing a message.

Concepts
--------

Names of directories in a path are properties in a hierarchy of objects in `absolute-router`. Don't worry to much about this. Just know that this makes routing fast even if you have a lot of routes.

### route path sections

`absolute-router` only understands directories, or what can be called **sections** of a path.

Each path section is looked at when matching on a route.

These are the possible **sections**.

* `:name` (A parameter section)
* `*name` (A consuming parameter)
* `{regex}name` (A regular expression parameter section)
* A string value

A string value is matched literally. For instance `/user` would match `/user`. `/user/:name` would match `/user/betty`, and `/user/jill`, but not `/us/betty`.

Examples
--------

The root/home route which will match `/`.

```javascript
const router = routing({
    ['/'](){

    }
});
```

This will always match `"/user"`.

```javascript
const router = routing({
    ['/user'](){

    }
});
```

The next example will match `"/user/{any value}"`, and the handler will have an object as it's first parameter that looks like `{collection: 'any value'}`.

```javascript
const router = routing({
    ['/user/:collection']({collection}){
        //collection = ...
    }
});
```

The next example will match `"user/one/two"`, or `"user/one/two/three"`, or whatever is after the section `user`. The sections after user are stored in an array.

```javascript
const router = routing({
    ['/user/*list']({list}){
        //list = [...]
    }
});
```

About
-----

`absolute-router` uses a **revealing constructor** pattern. This could in theory provide a more robust interface for shared development environments.

The API for `absolute-router` is kept simple on purpose. The idea is to think "this solves this, and only this" while keeping with the some of that useful unix philosophy we keep hearing about (It should do one thing, and do it well).

References
----------

* [better-url-routing-golang](https://www.ant0ine.com/post/better-url-routing-golang.html)
* [Radix_tree](https://en.wikipedia.org/wiki/Radix_tree)
* [Trie](https://en.wikipedia.org/wiki/Trie)
* Not used [regex routing](http://nikic.github.io/2014/02/18/Fast-request-routing-using-regular-expressions.html)
* [what-is-a-router](https://cdnjs.com/libraries/backbone.js/tutorials/what-is-a-router)
