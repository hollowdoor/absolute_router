const Router = require('../').Router;
const t = require('tap');

const router = new Router({
    relay(controls){
        runTests(controls);
    }
});

router.route({
    ['/'](){
        return '/';
    },
    ['/user'](params, query){
        return '/user';
    },
    ['/user/stuff'](){
        return '/user/stuff';
    },
    ['/user/stuff/:prop'](params, query){
        return params;
    },
    ['/page/*nums'](params){
        return params;
    },
    ['/page/{[abc]}reg/bla'](params){
        return params;
    },
    ['/err'](){
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


/*[
    '/',
    '/user',
    '/user/stuff'
].reduce((p, val)=>{
    return p.then(a=>{
        return router.navigate(val).then(res=>t.equal(res, val));
    });
}, Promise.resolve(null))
.then(v=>{
    return router.navigate('/user/stuff/thing?hello=world')
    .then(res=>t.equal(res.prop, 'thing', 'A param.'));
})
.then(v=>{
    return router.navigate('/page/3/2/1')
    .then(res=>t.same(res.nums, [3,2,1], 'A splat.'));
})
.then(v=>{
    return router.navigate('/page/a/bla')
    .then(res=>t.same(res.reg[0], 'a', 'A regular expression.'));
})
.then(v=>{
    return router.navigate('/bla')
    .catch(e=>t.equal(e.status, 404));
})
.then(v=>{
    return router.navigate('/err')
    .catch(e=>{
        t.equal(e.message, 'err');
        t.end();
    });
})
.catch(t.threw);*/
