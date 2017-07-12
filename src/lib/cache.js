
class Cache {
    constructor({
        expires = 600000,
        read = ()=>{},
        data = null
    } = {}){
        this['@@cache'] = true;
        //this._pending = Promise.resolve(data);
        this.expires = expires;
        this._end = Date.now() + expires;
        this._read = read;
        this.pending = false;
        if(data !== null){
            this.write(data);
        }
    }
    write(data){
        this._pending = Promise.resolve(data);
        this.pending = true;
        return this;
    }
    get expired(){
        /*if(this.expires === Infinity){
            return false;
        }*/
        return Date.now() > this._end;
    }
    send(){
        if(!this.pending){
            return Promise
            .resolve(this._read(this.data))
            .then(v=>this);
        }else{
            return this._pending.then(data=>{
                this.data = data;
                this.pending = false;
                return this._read(data);
            }).then(v=>this);
        }
    }
}

function cacheIt(data, options={}){
    return new Cache(data, options);
}

cacheIt.isCache = Cache.isCache = function(v){
    return typeof v === 'object' && v['@@cache'];
};

export { Cache, cacheIt };
