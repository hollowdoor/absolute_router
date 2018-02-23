import { getURL, getSearch } from './url_stuff.js';
import { RouteResolver, Tree } from './route_tree.js';
import { throwError } from './throw_error.js';

export class Router {
    constructor(options){
        const self = this;
        const relay = options['relay'];
        const base = options['base'];
        this['@@router'] = true;
        //this.routes = {};
        this.routes = new Tree();

        if(typeof relay !== 'function'){
            throw new Error('options.relay is not a function');
        }

        relay({
            navigate(path, args=[]){
                let resolver = new RouteResolver(self, path, args, base);
                return resolver.resolve();
            }
        });
    }
    route(routes){
        Object.keys(routes).forEach(pattern=>{
            Tree.branch(this.routes, {
                path: pattern,
                handler: routes[pattern]
            });
            //createRouteTree(this.routes, pattern, routes[pattern]);
        });
        return this;
    }
    reject(message, data){
        return throwError(message, data);
    }
}

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
