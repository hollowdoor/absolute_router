"use strict";
//import babel from 'rollup-plugin-babel';
//const babel = require('rollup-plugin-babel');
const buble = require('rollup-plugin-buble');
const rollup = require('rollup');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const writeFile = require('fs').writeFile;
const UglifyJS = require('uglify-js');
const pack = require('./package.json');
const external = Object.keys(pack.dependencies || {});

function getBuble(){
    return buble();
    /*return buble({
        transforms: {
            destructuring: true,
            parameterDestructuring: true
        }
    });*/
}

rollup.rollup({
    entry: 'src/index.js',
    plugins: [
        nodeResolve({
            jsnext: true,
            main: true
        }),
        commonjs(),
        getBuble()
    ],
    external: external
}).then((bundle)=>{
    bundle.write({
        dest: 'dist/bundle.js',
        format: 'cjs',
        moduleName: 'AbsoluteRouter',
        sourceMap: true
    });

    bundle.write({
        dest: 'dist/bundle.es.js',
        format: 'es',
        sourceMap: true
    });
}).catch(onErrorCB('bundle'));



rollup.rollup({
    entry: 'src/index.js',
    plugins: [
        nodeResolve({
            jsnext: true,
            main: true
        }),
        commonjs(),
        getBuble()
    ],
}).then((bundle)=>{
    let b = bundle.write({
        dest: 'dist/absolute-router.js',
        format: 'iife',
        sourceMap: true,
        moduleName: 'freeLine'
    });

    b.then(what=>{

        try{
            var result = UglifyJS.minify('dist/absolute-router.js');
            //console.log('result ',result)
            writeFile('dist/absolute-router.min.js', result.code, onErrorCB('minify'));
        }catch(e){
            console.log('minify error ', e)
        }

    })
}).catch(onErrorCB('script sources'));

rollup.rollup({
    entry: 'test/src.js',
    plugins: [
        nodeResolve({
            main: true
        }),
        commonjs({
            ignore: ['url']
        }),
        getBuble()
    ]
}).then(bundle=>{
    //console.log('what')
    bundle.write({
        dest: 'test/code.js',
        format: 'iife',
        sourceMap: true,
        moduleName: 'AbsoluteRouter'
    });
}).catch(onErrorCB('test code'));

function onErrorCB(message){
    return function(e){
        if(e){
            if(message)
                console.log(message);
            console.log(e);
            console.log(e.stack);
        }
    };
}
