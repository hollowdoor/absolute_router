import { Router } from '../';
import 'whatwg-fetch';
const view = document.querySelector('#view');
view.style.transition = 'opacity 1s';

const router = new Router({
    relay(controls){
        //https://css-tricks.com/using-the-html5-history-api/
        //https://developer.mozilla.org/en-US/docs/Web/API/History_API
        const selector = '.links';
        const onError = (err)=>console.log(err);

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
                .then(str=>view.innerHTML=str)
                //.catch(onError);
            }
            e.stopPropagation();
        });

        window.addEventListener("popstate", function(e){
            console.log('document.location ',document.location)
            controls.navigate(document.location)
            .then(str=>view.innerHTML=str);
        });
    }
});

router.route({
    ['/'](){
        console.log('home route');
        return 'Home!';
    },
    ['/user'](params, query){
        console.log('user route');

        return fetch('/views/user.html')
        .then(res=>res.text());
    },
    ['/user/stuff'](){
        console.log('user stuff route');
        return fetch('/views/user_stuff.html')
        .then(res=>res.text());
        //viewEl.innerHTML = 'User stuff!';
    },
    ['/user/stuff/:prop'](params, query){
        console.log('user stuff :prop route')
        console.log('params ',params);
        console.log('query ', query);
        return `Found a ${params.prop}`;
    },
    ['/page/*nums'](params){
        console.log('/page/*nums route', params);
        return `Numbers ${params.nums.join(', ')}`;
    },
    ['/404'](params, search, err){
        return err.message;
    },
    ['/page/{[abc]}reg/bla'](){
        return 'Regular expression?';
    }
});


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
