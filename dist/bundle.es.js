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
    if ( data === void 0 ) data={};

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
            if ( args === void 0 ) args=[];

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

/*export class AbsoluteRouter {
    constructor(routes){
        this['@@router'] = true;
        this.routes = {};

        Object.keys(routes).forEach(pattern=>{
            this.addRoute(pattern, routes[pattern]);
        });
    }
    reject(message, data){
        return throwError(message, data);
    }
    addRoute(pattern, handler){
        createRouteTree(this.routes, pattern, handler);
        return this;
    }
    navigate(path, args=[]){
        if(typeof path === 'object'){
            path = path.url;
        }
        let resolver = new RouteResolver(this, path, args);
        return resolver.resolve();
    }
}

export function routing(routes, options={}){
    return new AbsoluteRouter(routes, options);
}*/

export { Router };
//# sourceMappingURL=bundle.es.js.map
