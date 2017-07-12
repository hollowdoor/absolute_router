const getSearch = (()=>{
    if(typeof window !== 'undefined' && typeof document !== 'undefined'){
        if(window['URLSearchParams']){
            return function getSearch1(url){
                let full = {};
                let search = new URLSearchParams(url.search);
                let entries = search.entries();
                while(true){
                    let item = entries.next();
                    if(item.done){break;}
                    let [key, value] = item.value;
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
        let str = url.search.slice(1);

        return str.split('&').reduce((full, param)=>{
            const [name, value] = param.split('=');
            full[name] = value;
            return full;
        }, {});
    };
})();

const getURL = (()=>{
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
            let a = document.createElement('a');
            a.href = loc;
            return a;
        };
    }else{

        return function getURL2(loc, base){
            let u = require('url');
            let URL = u.URL;
            if(loc[0] === '/'){
                return new URL(loc, base || 'http://local');
            }
            return new URL(loc);
        };
    }
})();

export { getURL, getSearch };
