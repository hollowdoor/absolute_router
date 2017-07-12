class View {
    constructor(store){
        this.store = store;
        if(isNaN(store.expire)){
            store.expire = Infinity;
        }
        this.start = Date.now();
    }
    get expire(){
        return this.store.expire;
    }
    get expired(){
        return this.expire === Infinity ? false : Date.now() >= (this.start + this.expire);
    }
    respond(){
        this.store.respond();
    }
}

View.isView = function(val){
    return (typeof val === 'object' && 'respond' in val && typeof val['respond'] === 'function');
};

export default View;
