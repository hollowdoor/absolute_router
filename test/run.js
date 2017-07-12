const routing = require('../').routing;
const t = require('tap');

let value;

const router = routing({
    ['/'](){
        return (value = '/');
    },
    ['/user'](params, query){
        return (value = '/user');
    },
    ['/user/stuff'](){
        return (value = '/user/stuff');
    },
    ['/user/stuff/:prop'](params, query){
        console.log('user stuff :prop route')
        return (value = '/user/stuff/thing?hello=world');
    },
    ['/page/*nums'](params){
        console.log('/page/*nums route', params);
        return (value = params.nums);
    },
    ['/404'](params, search, err){
        console.log(err.message)
    },
    ['/page/{[abc]}reg/bla'](){
        console.log('Regular expression?');
    }
});

const onError = err => {
    //console.log('Error! ',err);
    router.navigate('/404', err);
};

function run(path, val, message){
    return t.test(path, t => {
        return router.navigate(path).then(res=>{
            //console.log('a ',a)
            if(message){
                t.same(value, value, message);
            }else{
                t.same(value, value);
            }
            t.end();
        });
    });
}

[
    '/',
    '/user',
    '/user/stuff',
    '/user/stuff/thing?hello=world',
].reduce((p, val)=>{
    return p.then(a=>{
        return t.test(val, t => {
            return router.navigate(val).then(res=>{
                //console.log('a ',a)
                t.equal(value, val);
                t.end();
            });
        });
    });
}, Promise.resolve(null))
.then(v=>{
    return run('/page/3/2/1', [3,2,1], 'An array?');
})
.then(v=>{
    return router.navigate('/bla')
    .catch(e=>{
        t.equal(e.status, 404);
        t.end();
    });
})
.catch(t.threw);
