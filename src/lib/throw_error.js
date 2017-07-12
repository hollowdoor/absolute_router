export function throwError(message, data={}){
    const e = new Error(''+message);
    Object.keys(data).forEach(key=>e[key]=data[key]);
    return Promise.reject(e);
}
