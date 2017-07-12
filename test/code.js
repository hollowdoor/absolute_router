(function () {
'use strict';

var getSearch = (function (){
    if(typeof window !== 'undefined' && typeof document !== 'undefined'){
        if(window['URLSearchParams']){
            return function getSearch1(url){
                var full = {};
                var search = new URLSearchParams(url.search);
                var entries = search.entries();
                while(true){
                    var item = entries.next();
                    if(item.done){break;}
                    var ref = item.value;
                    var key = ref[0];
                    var value = ref[1];
                    full[key] = value;
                }
                return full;
                /*console.log('entries.length ',entries.length)
                console.log('search.entries() ',search.entries());
                return search.entries().reduce((full, [key, value])=>{
                    full[key] = value;
                    return full;
                }, {});*/
            };
        }
    }

    return function getSearch0(url){
        if(!url.search.length){
            return {};
        }
        var str = url.search.slice(1);

        return str.split('&').reduce(function (full, param){
            var ref = param.split('=');
            var name = ref[0];
            var value = ref[1];
            full[name] = value;
            return full;
        }, {});
    };
})();

var getURL = (function (){
    if(typeof window !== 'undefined' && typeof document !== 'undefined'){
        if(window['URL']){
            return function getURL0(loc, base){
                if(/^http/.test(loc)){
                    return new URL(loc, base);
                }

                return new URL(
                    loc,
                    window.location.origin
                );
            };
        }
        return function getURL1(loc){
            var a = document.createElement('a');
            a.href = loc;
            return a;
        };
    }else{

        return function getURL2(loc, base){
            var u = require('url');
            var URL = u.URL;
            if(loc[0] === '/'){
                return new URL(loc, base || 'http://local');
            }
            return new URL(loc);
        };
    }
})();

var View = function View(store){
    this.store = store;
    if(isNaN(store.expire)){
        store.expire = Infinity;
    }
    this.start = Date.now();
};

var prototypeAccessors$1 = { expire: {},expired: {} };
prototypeAccessors$1.expire.get = function (){
    return this.store.expire;
};
prototypeAccessors$1.expired.get = function (){
    return this.expire === Infinity ? false : Date.now() >= (this.start + this.expire);
};
View.prototype.respond = function respond (){
    this.store.respond();
};

Object.defineProperties( View.prototype, prototypeAccessors$1 );

View.isView = function(val){
    return (typeof val === 'object' && 'respond' in val && typeof val['respond'] === 'function');
};

function createBranch(parent, phrase){

    if(parent[phrase]){
        return parent[phrase];
    }

    var info = {
        name: phrase,
        child: null,
        parent: parent,
        children: []
    };

    var branch = {__info: info};

    var setParam = function (type) {
        info.type = type;
        info.property = phrase.slice(1);
        if(parent.__info.child){
            throw new Error(("Parent branch " + (parent.name) + " already has a child."));
        }
        parent.__info.child = phrase;
    };

    var setPattern = function (type) {
        var ref = phrase.match(/^\{([\s\S]+?)\}([\s\S]+)$/);
        var m = ref[0];
        var pattern = ref[1];
        var name = ref[2];
        info.type = type;
        info.property = name;
        info.pattern = new RegExp(pattern);
        parent.__info.children.push(phrase);
    };

    if(phrase.length){
        info.property = phrase;
        if(phrase[0] === ':'){
            setParam('parameter');
        }else if(phrase[0] === '*'){
            setParam('splat');
        }else if(/^\{[\s\S]+?\}[\s\S]+$/.test(phrase)){
            setPattern('regex');
        }else if(/^[0-5]{3}/.test(phrase)){
            info.type = 'error';
        }else{
            info.type = 'normal';
        }
    }

    parent[phrase] = branch;
    return branch;
}

function createRouteTree(base, path, handler){

    var createLeaf = function (branch) {
        branch.__info.handler = handler;
        branch.__info.children = [];
        branch.__info.path = path;
        return base;
    };

    if(path === '/'){
        base.__info = {
            type: 'root'
        };

        return createLeaf(base);
    }

    var leaf = path.split('/').slice(1).reduce(createBranch, base);
    return createLeaf(leaf);
}

var RouteResolver = function RouteResolver(router, address, args, base){
    this.router = router;
    this.args = args;
    this.address = address;
    this.url = router.location = getURL(address, base);
    this.pathname = this.url.pathname;
    this.handler = null;
    this.found = false;
    this.params = {};
    router.location = this.url;
    this._route = null;
};

var prototypeAccessors = { route: {},views: {} };
prototypeAccessors.route.set = function (route){
    if(!route){ return; }
    this._route = route;
    this.handler = route.__info.handler;
    this.found = true;
    this.search = getSearch(this.url);
};
prototypeAccessors.route.get = function (){
    return this._route;
};
prototypeAccessors.views.get = function (){
    if(!this.route){
        return {};
    }
    return this.route.__info.views;
};
RouteResolver.prototype.matchRoute = function matchRoute (){
    //Do not change this method except for bugs, or clean up.
    //Leave the algorithm intact.

    var routes = this.router.routes;
    var path = this.pathname;

    if(path === '/' && routes.__info){
        this.route = routes;
        return this;
    }

    var parts = path.split('/').slice(1),
        current = routes,
        previous,
        len = parts.length,
        params = this.params,
        section,
        i = 0;

    var setParam = function (branch, value){
        params[branch.__info.property] = value;
    };

    var getChild = function (branch){
        if(branch.__info.child){
            return branch[branch.__info.child];
        }
    };

    var matchChildren = function (branch, section){
        var children = branch.__info.children, child;

        var matchChild = function (child){
            return section.match(child.__info.pattern);
        };

        for(var i=0; i<children.length; i++){
            var child$1 = branch[children[i]];
            var match = matchChild(child$1);

            if(match){
                setParam(child$1, match);
                return (current = branch[child$1.__info.name]);
            }
        }

        return branch;
    };

    var useSplat = function (branch){
        var value = [];
        for(; i<len; i++){
            if(branch[parts[i]]){
                break;
            }
            value.push(parts[i]);
        }
        setParam(branch, value);
    };

    for(i=0; i<len; i++){
        var info = (void 0);
        section = parts[i];

        previous = current;
        current = current[section];

        if(!current){

            if(previous.__info.children.length){
                matchChildren(previous, section);
            }

            current = getChild(previous);

            if(!current){ break; }
        }

        if(current.__info.type === 'parameter'){
            setParam(current, section);
        }else if(current.__info.type === 'splat'){
            useSplat(current);
        }
    }

    if(current){
        this.route = current;
    }

    return this;
};
RouteResolver.prototype._getArguments = function _getArguments (){
    return [this.params, this.search].concat(this.args);
};
RouteResolver.prototype.runRoute = function runRoute (){

    if(!this.found){
        var e = new Error('not found');
        e.status = 404;
        return Promise.reject(e);
    }

    return this.handler.apply(
        this.router, this._getArguments()
    );
};
RouteResolver.prototype.resolve = function resolve (){
        var this$1 = this;

    return Promise.resolve()
    .then(function (){ return this$1.matchRoute().runRoute(); });
};

Object.defineProperties( RouteResolver.prototype, prototypeAccessors );

function throwError(message, data){
    if ( data === void 0 ) { data={}; }

    var e = new Error(''+message);
    Object.keys(data).forEach(function (key){ return e[key]=data[key]; });
    return Promise.reject(e);
}

var Router = function Router(options){
    var self = this;
    var relay = options['relay'];
    var base = options['base'];
    this['@@router'] = true;
    this.routes = {};

    if(typeof relay !== 'function'){
        throw new Error('options.relay is not a function');
    }

    relay({
        navigate: function navigate(path, args){
            if ( args === void 0 ) { args=[]; }

            var resolver = new RouteResolver(self, path, args, base);
            return resolver.resolve();
        }
    });
};
Router.prototype.route = function route (routes){
        var this$1 = this;

    Object.keys(routes).forEach(function (pattern){
        createRouteTree(this$1.routes, pattern, routes[pattern]);
    });
    return this;
};
Router.prototype.reject = function reject (message, data){
    return throwError(message, data);
};

(function(self) {
  'use strict';

  if (self.fetch) {
    return
  }

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob: 'FileReader' in self && 'Blob' in self && (function() {
      try {
        new Blob();
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  };

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ];

    var isDataView = function(obj) {
      return obj && DataView.prototype.isPrototypeOf(obj)
    };

    var isArrayBufferView = ArrayBuffer.isView || function(obj) {
      return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
    };
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name);
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value);
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift();
        return {done: value === undefined, value: value}
      }
    };

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      };
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {};

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value);
      }, this);
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1]);
      }, this);
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name]);
      }, this);
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name);
    value = normalizeValue(value);
    var oldValue = this.map[name];
    this.map[name] = oldValue ? oldValue+','+value : value;
  };

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)];
  };

  Headers.prototype.get = function(name) {
    name = normalizeName(name);
    return this.has(name) ? this.map[name] : null
  };

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  };

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value);
  };

  Headers.prototype.forEach = function(callback, thisArg) {
    var this$1 = this;

    for (var name in this$1.map) {
      if (this$1.map.hasOwnProperty(name)) {
        callback.call(thisArg, this$1.map[name], name, this$1);
      }
    }
  };

  Headers.prototype.keys = function() {
    var items = [];
    this.forEach(function(value, name) { items.push(name); });
    return iteratorFor(items)
  };

  Headers.prototype.values = function() {
    var items = [];
    this.forEach(function(value) { items.push(value); });
    return iteratorFor(items)
  };

  Headers.prototype.entries = function() {
    var items = [];
    this.forEach(function(value, name) { items.push([name, value]); });
    return iteratorFor(items)
  };

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true;
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result);
      };
      reader.onerror = function() {
        reject(reader.error);
      };
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsArrayBuffer(blob);
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsText(blob);
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf);
    var chars = new Array(view.length);

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i]);
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength);
      view.set(new Uint8Array(buf));
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false;

    this._initBody = function(body) {
      this._bodyInit = body;
      if (!body) {
        this._bodyText = '';
      } else if (typeof body === 'string') {
        this._bodyText = body;
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body;
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body;
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString();
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer);
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer]);
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body);
      } else {
        throw new Error('unsupported BodyInit type')
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8');
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type);
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
        }
      }
    };

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this);
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      };

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      };
    }

    this.text = function() {
      var rejected = consumed(this);
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    };

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      };
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    };

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];

  function normalizeMethod(method) {
    var upcased = method.toUpperCase();
    return (methods.indexOf(upcased) > -1) ? upcased : method
  }

  function Request(input, options) {
    options = options || {};
    var body = options.body;

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url;
      this.credentials = input.credentials;
      if (!options.headers) {
        this.headers = new Headers(input.headers);
      }
      this.method = input.method;
      this.mode = input.mode;
      if (!body && input._bodyInit != null) {
        body = input._bodyInit;
        input.bodyUsed = true;
      }
    } else {
      this.url = String(input);
    }

    this.credentials = options.credentials || this.credentials || 'omit';
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers);
    }
    this.method = normalizeMethod(options.method || this.method || 'GET');
    this.mode = options.mode || this.mode || null;
    this.referrer = null;

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body);
  }

  Request.prototype.clone = function() {
    return new Request(this, { body: this._bodyInit })
  };

  function decode(body) {
    var form = new FormData();
    body.trim().split('&').forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split('=');
        var name = split.shift().replace(/\+/g, ' ');
        var value = split.join('=').replace(/\+/g, ' ');
        form.append(decodeURIComponent(name), decodeURIComponent(value));
      }
    });
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers();
    rawHeaders.split(/\r?\n/).forEach(function(line) {
      var parts = line.split(':');
      var key = parts.shift().trim();
      if (key) {
        var value = parts.join(':').trim();
        headers.append(key, value);
      }
    });
    return headers
  }

  Body.call(Request.prototype);

  function Response(bodyInit, options) {
    if (!options) {
      options = {};
    }

    this.type = 'default';
    this.status = 'status' in options ? options.status : 200;
    this.ok = this.status >= 200 && this.status < 300;
    this.statusText = 'statusText' in options ? options.statusText : 'OK';
    this.headers = new Headers(options.headers);
    this.url = options.url || '';
    this._initBody(bodyInit);
  }

  Body.call(Response.prototype);

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  };

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''});
    response.type = 'error';
    return response
  };

  var redirectStatuses = [301, 302, 303, 307, 308];

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  };

  self.Headers = Headers;
  self.Request = Request;
  self.Response = Response;

  self.fetch = function(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init);
      var xhr = new XMLHttpRequest();

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        };
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL');
        var body = 'response' in xhr ? xhr.response : xhr.responseText;
        resolve(new Response(body, options));
      };

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'));
      };

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'));
      };

      xhr.open(request.method, request.url, true);

      if (request.credentials === 'include') {
        xhr.withCredentials = true;
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob';
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value);
      });

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
    })
  };
  self.fetch.polyfill = true;
})(typeof self !== 'undefined' ? self : undefined);

var view = document.querySelector('#view');
view.style.transition = 'opacity 1s';

var router = new Router({
    relay: function relay(controls){
        //https://css-tricks.com/using-the-html5-history-api/
        //https://developer.mozilla.org/en-US/docs/Web/API/History_API
        var selector = '.links';
        var onError = function (err){ return console.log(err); };

        document.querySelector(selector)
        .addEventListener('click', function(e){
            if (e.target != e.currentTarget){// && e.target.nodeName === 'A') {
                e.preventDefault();
                // e.target is the image inside the link we just clicked.
                var data = e.target.getAttribute('data-route'),
                url = data;// + ".html";
                //console.log('url ', url)
                history.pushState(null, null, url);
                controls.navigate(url)
                .then(function (str){ return view.innerHTML=str; });
                //.catch(onError);
            }
            e.stopPropagation();
        });

        window.addEventListener("popstate", function(e){
            console.log('document.location ',document.location);
            controls.navigate(document.location)
            .then(function (str){ return view.innerHTML=str; });
        });
    }
});

router.route(( obj = {}, obj['/'] = function (){
        console.log('home route');
        return 'Home!';
    }, obj['/user'] = function (params, query){
        console.log('user route');

        return fetch('/views/user.html')
        .then(function (res){ return res.text(); });
    }, obj['/user/stuff'] = function (){
        console.log('user stuff route');
        return fetch('/views/user_stuff.html')
        .then(function (res){ return res.text(); });
        //viewEl.innerHTML = 'User stuff!';
    }, obj['/user/stuff/:prop'] = function (params, query){
        console.log('user stuff :prop route');
        console.log('params ',params);
        console.log('query ', query);
        return ("Found a " + (params.prop));
    }, obj['/page/*nums'] = function (params){
        console.log('/page/*nums route', params);
        return ("Numbers " + (params.nums.join(', ')));
    }, obj['/404'] = function (params, search, err){
        return err.message;
    }, obj['/page/{[abc]}reg/bla'] = function (){
        return 'Regular expression?';
    }, obj ));
var obj;


/*const spa = singlePage({
    navigate(page){
        page.pushState();
        router.navigate(page.path);
    },
    link(page){
        page.pushState();
        router.navigate(page.path);
    },
    popstate(page){
        router.navigate(page.path);
    }
});

spa.addClass('links');*/

}());
//# sourceMappingURL=code.js.map
