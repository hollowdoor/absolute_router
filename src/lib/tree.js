export class Branch {
    constructor({
        parent = {},
        phrase = ''
    } = {}){

        const info = this.__info = {
            name: phrase,
            type: 'normal',
            parent,
            property: phrase,
            child: null,
            children: []
        };

        parent[phrase] = this;

        if(phrase[0] === ':'){
            info.type = 'parameter';
            info.property = phrase.slice(1);
            parent.__info.child = phrase;
        }else if(phrase[0] === '*'){
            info.type = 'splat';
            info.property = phrase.slice(1);
            parent.__info.child = phrase;
        }else if(/^\{[\s\S]+?\}[\s\S]+$/.test(phrase)){
            let [m, pattern, name] = phrase.match(/^\{([\s\S]+?)\}([\s\S]+)$/);
            info.type = 'regex';
            info.property = name;
            info.pattern = new RegExp(pattern);
            parent.__info.children.push(phrase);
        }else if(/^[0-5]{3}/.test(phrase)){
            info.type = 'error';
        }
    }
    static leafFrom(branch, {
        path = '',
        handler = null,
        type = null
    } = {}){
        branch.__info.type = type
        ? type
        : branch.__info.type;
        branch.__info.handler = handler;
        branch.__info.children = [];
        branch.__info.path = path;
        return branch;
    }
    static create({parent, phrase}){
        if(parent[phrase]){
            return parent[phrase];
        }
        return new Branch({parent, phrase});
    }
}

export class Tree {
    constuctor(){
        this.__info = {};
    }
    static branch(base, {path, handler}){
        if(path === '/'){
            base.__info = {
                type: 'root'
            };

            return Branch.leafFrom(base, {
                path,
                handler,
                type: 'root'
            });
        }

        let leaf = path.split('/').slice(1)
        .reduce((parent, phrase)=>{
            return Branch.create({parent, phrase})
        }, base);

        return Branch.leafFrom(leaf, {path, handler});
    }
}
