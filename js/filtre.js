;(function(w,fname){
	w[fname] = {};
	let o = w[fname];
	/* L'Object o se réfère à l'Object w[fname] car passé par référence.    *
	 * Ce que l'on fait à :'Object o se fera donc aussi à l'Object w[fname] */
	let strict = false;
	o.R = function(find , source){ // Même que wildcardMatch
		find = find.replace(/[\-\[\]\/\{\}\(\)\+\.\\\^\$\|]/g, "\\$&");
		find = find.replace(/\*/g, ".*");
		find = find.replace(/\?/g, ".");
		find = find.replace(/^\\\^/m , '^').replace(/\\\^$/m , '$');  //Si mmatch debut/fin
		var regEx = new RegExp(find, "im");
		return regEx.test(source);		
	}
	o.lowernoaccent = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
	o.matchnull = s => true;
	o.matchwild = s => o.R(o.p , o.lowernoaccent(s));
	o.matchstr = s => o.lowernoaccent(s).indexOf(o.p) >= 0;
	o.p0 = '';
	o.match = o.matchnull;	
	o.init = p => {
		if (p == o.p0) return;
		o.p0 = p;
		if (p == '') {
			o.match = o.matchnull;
		} else {
			o.p = o.lowernoaccent(p);
			if (p.includes('?') || p.includes('*')  || p.startsWith('^')  || p.endsWith('^')) o.match = o.matchwild; 
			else o.match = o.matchstr;
		}
	}
})(window , 'lefiltre');
