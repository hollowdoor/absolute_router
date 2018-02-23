import { getURL, getSearch } from './url_stuff.js';
import View from './return_view.js';
import { Tree, Branch } from './tree.js';
export { Tree };

export class RouteResolver {
    constructor(router, address, args, base){
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
    }
    set route(route){
        if(!route){ return; }
        this._route = route;
        this.handler = route.__info.handler;
        this.found = true;
        this.search = getSearch(this.url);
    }
    get route(){
        return this._route;
    }
    get views(){
        if(!this.route){
            return {};
        }
        return this.route.__info.views;
    }
    matchRoute(){
        //Do not change this method except for bugs, or clean up.
        //Leave the algorithm intact.

        let routes = this.router.routes;
        let path = this.pathname;

        if(path === '/' && routes.__info){
            this.route = routes;
            return this;
        }

        let parts = path.split('/').slice(1),
            current = routes,
            previous,
            len = parts.length,
            params = this.params,
            section,
            i = 0;

        const setParam = (branch, value)=>{
            params[branch.__info.property] = value;
        };

        const getChild = (branch)=>{
            if(branch.__info.child){
                return branch[branch.__info.child];
            }
        };

        const matchChildren = (branch, section)=>{
            let children = branch.__info.children, child;

            const matchChild = (child)=>{
                return section.match(child.__info.pattern);
            };

            for(let i=0; i<children.length; i++){
                let child = branch[children[i]];
                let match = matchChild(child);

                if(match){
                    setParam(child, match);
                    return (current = branch[child.__info.name]);
                }
            }

            return branch;
        };

        const useSplat = (branch)=>{
            let value = [];
            for(; i<len; i++){
                if(branch[parts[i]]){
                    break;
                }
                value.push(parts[i]);
            }
            setParam(branch, value);
        };

        for(i=0; i<len; i++){
            let info;
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
    }
    _getArguments(){
        return [this.params, this.search].concat(this.args);
    }
    runRoute(){

        if(!this.found){
            let e = new Error('not found');
            e.status = 404;
            return Promise.reject(e);
        }

        return this.handler.apply(
            this.router, this._getArguments()
        );
    }
    resolve(){
        return Promise.resolve()
        .then(()=>this.matchRoute().runRoute());
    }
}
