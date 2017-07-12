const eventTypes = ['click', 'touchstart'];

function getAttrPath(ctx){
    return (
        ctx.target.hasAttribute('data-path')
        ? ctx.target.getAttribute('data-path')
        : ctx.oldPath
    );
}

function getPath(ctx){
    return (
        eventTypes.indexOf(ctx.event.type) !== -1
        //DOM event
        ? (isLink(ctx.target) ? ctx.target.pathname : getAttrPath(ctx))
        //Is a popstate event
        : ctx.oldPath
    );
}

class PageContext {
    constructor(event){
        this.event = event;
        this.target = event.target;
        this.location = document.location;
        this.oldPath = document.location.pathname;
        this.path = getPath(this);
    }
    pushState(state = {}, title = ''){
        history.pushState(state, title, this.path);
    }
}

function leftClick(event){
     return (event.button == 0);
}

function isLink(tag){
    //Is <a href=...>
    return (tag.tagName == 'A' && tag.href);
}

function sameOrigin(tag){
    //same-origin navigation
    return (tag.origin == document.location.origin);
}

function setFN(t, fn){
    return (typeof fn === 'function' ? fn : ()=>{}).bind(t);
}

export class SinglePage {
    constructor(options){
        const self = this;

        const navigate_cb = setFN(this, options.navigate);
        const popstate_cb = setFN(this, options.popstate);
        const link_cb = setFN(this, options.link);

        function hasClass(tag){
            return tag.classList.contains(self.classes[i]);
        }

        function onClick(event){
            let tag = event.target;
            if(leftClick(event)) {
                if(isLink(tag) && sameOrigin(tag)) {
                    for(let i=0; i<self.classes.length; i++){
                        if(hasClass(tag)){
                            event.preventDefault();
                            link_cb(new PageContext(self, event));
                        }
                    }
                }else{
                    for(let i=0; i<self.classes.length; i++){
                        if(hasClass(tag)){
                            event.preventDefault();
                            navigate_cb(new PageContext(self, event));
                        }
                    }
                }
            }
        }

        function onPop(event){
            popstate_cb(new PageContext(self, event));
        }

        document.body.addEventListener('click', onClick);
        window.addEventListener("popstate", onPop);

        this.destroy = function(){
            document.body.removeEventListener('click', onClick);
            window.removeEventListener("popstate", onPop);
        };

    }
    addClass(cl){
        this.classes = this.classes.concat(
            [].slice.call(el);
        );
    }
}

/*document.body.addEventListener('click', function(event) {
  var tag = event.target;
  if (tag.tagName == 'A' && tag.href && event.button == 0) {
    // It's a left click on an <a href=...>.
    if (tag.origin == document.location.origin) {
      // It's a same-origin navigation: a link within the site.

      // Now check that the the app is capable of doing a
      // within-page update.  (You might also take .query into
      // account.)
      var oldPath = document.location.pathname;
      var newPath = tag.pathname;
      if (app.capableOfRendering(newPath)) {
        // Prevent the browser from doing the navigation.
        e.preventDefault();
        // Let the app handle it.
        app.render(newPath);
        history.pushState(null, '', path);
      }
    }
  }
});

// Also transition when the user navigates back.
window.onpopstate = function(event) {
  app.render(document.location.pathname);
  event.preventDefault();
};*/
