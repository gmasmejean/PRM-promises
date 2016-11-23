
function prm( value ){    
    if( value !== undefined ){
        this._state = prm.fullfilled;
        this._value = value;
    }else{
        this._state = prm.pending;
        this._onok = [];
        this._onfail = [];
    }
}

prm.rejected = -1;
prm.pending = 0;
prm.fullfilled = 1;

prm.prototype._process = function( value, callback, promise ){
    var result;
    try{
        result = callback( value );
    }catch( e ){
        promise.reject(e);
        return;
    }

    if( result instanceof prm ){
        result.then(
            function(v){ promise.resolve(v); },
            function(r){ promise.reject(r); }
        );
    }else{
        promise.resolve(result);
    }
};

prm.prototype.then = function( success, fail, progress ){
    if( !success && !fail && !progress ){
        return this;    
    }
    
    var p = new prm();
        
    if( this._state === prm.pending ){        
        this._onok.push([success,p]);
        this._onfail.push([fail,p]);
        
        if( typeof progress === 'function' ){
            if( !this._progressed ){
                this._progressed = [];
            }
            this._progressed.push(progress);
        }        
    }else if( this._state === prm.fullfilled ){
        if( typeof success === 'function' ){
            this._process( this._value, success, p );            
        }else{
            p.resolve(this._value);
        }
    }else if( this._state === prm.rejected ){
        if( typeof fail === 'function' ){
            this._process( this._reason, fail, p );
        }else{
            p.reject(this._reason);
        }
    }    
    return p;
};

prm.prototype.finally = function( next ){
    if( !next ){
        return this;    
    }
    
    var p = new prm();
    
    if( this._state === prm.pending ){
        if( !this._nexts ){
            this._nexts = [];
        }
        this._nexts.push([next,p]);
    }else if( typeof next === 'function' ){
        this._process( this._value || this._reason, next, p );
    }else if( this._state === prm.fullfilled ){
        p.resolve(this._value);
    }else{
        p.reject(this._reason);
    }
    return p;
};

prm.prototype._resolve = function( callback, p ){
    if( typeof callback === 'function' ){
        this._process( this._value, callback, p);
    }else{
        p.resolve(this._value);
    }
};

prm.prototype._reject = function( callback, p ){
    if( typeof callback === 'function' ){
        this._process( this._reason, callback, p);
    }else{
        p.reject(this._reason);
    }
};

prm.prototype.resolve = function( value ){
    if( this._state === prm.pending ){
        
        if( value instanceof prm ){
            var self = this;
            value.then(
                function(v){ self.resolve(v); },
                function(e){ self.reject(e); }
            );
            return;
        }
        
        this._value = value;
        this._state = prm.fullfilled;

        var i = 0;
        if( this._onok ){
            for(;i<this._onok.length;i++){
                this._resolve( this._onok[i][0], this._onok[i][1] );
            }
        }

        if( this._nexts ){
            i = 0;
            for(;i<this._nexts.length;i++){
                this._resolve( this._nexts[i][0], this._nexts[i][1] );
            }
        }
        
        delete( this._onok );
        delete( this._nexts );
        delete( this._onfail );
        delete( this._progressed );
    }
};

prm.prototype.reject = function( reason ){
    if( this._state === prm.pending ){
        
        if( reason && reason instanceof prm ){
            var self = this;
            reason.then(
                function(v){ self.resolve(v); },
                function(e){ self.reject(e); }
            );
            return;
        }
        
        this._reason = reason;
        this._state = prm.rejected;

        var i = 0;
        if( this._onfail ){
            for(;i<this._onfail.length;i++){
                this._reject( this._onfail[i][0], this._onfail[i][1] );
            }
        }

        if( this._nexts ){
            i = 0;
            for(;i<this._nexts.length;i++){
                this._reject( this._nexts[i][0], this._nexts[i][1] );
            }
        }
        
        delete( this._onok );
        delete( this._nexts );
        delete( this._onfail );
        delete( this._progressed );
    }
};

prm.prototype.notify = function( update ){
    if( this._progressed && this._state === prm.pending ){
        var i=0;
        for(;i<this._progressed.length; i++){
            this._progressed[i](update);
        }
    }
};
