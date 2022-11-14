const ejh = {};

ejh.easy = src => {
	function tabs(n){return "\n" + "\t".repeat(n);}
	function makeList(ar , level) {
		//Recursive Step: make a list with child lists
		level = level || 0;
		let out = '';
		ar.forEach(subArray => {
			if (typeof subArray != 'string') out += makeList(subArray , level + 1);
			else {
				if (out == '') out = tabs(level) + "<ul>"; else out += "</li>";
				out += tabs(level + 1) + "<li>" + subArray;
			}
		});
		out += '</li>' + tabs(level) + '</ul>';
		return out;
	}
	function makeArray(t){
		let ar0 = ("\n" + t).split("\n* ");
		ar0.shift();
		let ar = [];
		ar0.forEach(val => {
			if (val.indexOf("\n") < 0) ar.push(val);
			else {
				let ar1 = val.split("\n");
				ar.push(ar1[0]);
				ar1.shift();
				ar1 = ar1.map(a => a.substr(2));
				ar.push(makeArray(ar1.join("\n").trim()));
			}
		});
		return ar;
	}
	
	const makeLink = e => {
		var t = e.href;
		if (/^data:.*?;base64,[0-9a-zA-Z+\/]*=*$/.test(t)){
			var blob = dataURItoBlob(t);
			var url = window.URL.createObjectURL(blob);
			e.href = url;
		} else if (/^<!DOCTYPE *HTML.*>/i.test(t)) e.href = window.URL.createObjectURL(new Blob([t], {encoding:"UTF-8",type:"text/html;charset=UTF-8"}));
		else e.href = window.URL.createObjectURL(new Blob([t], {encoding:"UTF-8",type:"text/plain;charset=UTF-8"}));
	}


	const brcode = html => html.replace(/\r/g , '').trim().split(/\n/).map(line => `<code>${line}</code>`).join('\n');
	const brspan = html => html.replace(/\r/g , '').trim().split(/\n/).map(line => `<span>${line}</span>`).join('\n');

	function inline(t) {
		// Inlines code, img, a, b , i	
		// remplacer les '+' par des '©' dans les liens et dans les images (nécessaire pour ce qui est en base64)
		t = t.replace(/\[.*?\]\(.*?\)/g, function(m){return m.replace(/\+/g,'©')})
		// code
			.replace(/(\+{1,2})(.+?)\1/g, function(m,m1,m2){
				if (m1=='+') return '<code>' + m2 + '</code>';
				if (m1=='++') return '<code>' + protectMark(m2) + '</code>';
			})
		// remettre les '+' dans les liens et dans les images
			.replace(/\[.*?\]\(.*?\)/g, function(m){return m.replace(/©/g,'+')})		
		// b, i
		.replace(/(\*{1,3})(.+?)\1/g, function(m,m1,m2){
			if (m1=='*') return '<i>' + m2 + '</i>';
			if (m1=='**') return '<b>' + m2 + '</b>';
			return '<b><i>' + m2 + '</i></b>';  // ***
		})	
		// Liens, images
			.replace(/!\[(.*?)\]\((.*?)\)/g, '<img loading="lazy" alt="$1" src="$2">')
			.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
			.replace(/&lt;(https?:\/\/\S+?)&gt;/g , function(m,m1){
				return '<a href="' + m1 + '">' + m1 + '</a>';
			});
		return t;
	}

	const rawmap = {'&' : '&amp;' , '<' : '&lt;' , '>' : '&gt;' , '"' : '&quot;'};
	const rawmark = {'*' : '&#42;' , '+' : '&#43;' , '-' : '&#45;'};
	function protectMark(s){return s.replace(/[*+-]/g,function(i){return rawmark[i]})};	

	// Pas de html
	src = src.replace(/[&<>"]/g,function(i){return rawmap[i]});
	
	// Echapper juste 1 caractère avec 1 ©, 
	// ou plusieurs caractères non lette/chiffre situés entre 2 © sur la même ligne,
	// ou échapper un © si 2 © successifs
	src = src.replace(/©(.+?)©.+/gm , function(m,s){s=s.split('').map(c => /[a-zA-Z0-9]/.test(c) ? c : '&#' + c.charCodeAt(0) + ';');return s.join('')})
		.replace(/©./gm , function(m){return '&#' + m.charCodeAt(1) + ';'});
	
	let srcs = ejh.splitSrc(src);
	
	let b4 = 'txt';
	for (let i = 1; i < srcs.length; i++){
		// Regex partie gauche, sans attribut, partie droite avec
		let typ = /^(\n[*#+-]+\s|\n[*#+-]+\{.*?\}\s)$/.test(srcs[i]) ? 'tag' : 'txt';
		if (typ == b4) srcs.splice(i,0,'');
		b4 = b4 == 'txt' ? 'tag' : 'txt';
	}
	
	let tags = [];
	let texts = [];
	let j = 0;
	for (let i = 1; i < srcs.length; i++){
		tags.push(srcs[i]);
		i++;
		texts.push(srcs[i]);
	}
	
	let arout = [];	
	for(j = 0; j < tags.length; j++) {
		let text = texts[j];
		let tag = tags[j];
		let m = tag.match(/\{(.*)\}/);
		let atr = m ? ' ' + m.pop() : '';
		if (atr) {
			tag = tag.replace(/\{(.*)\}/ , '');	
			let xt = document.createElement("textarea");
			xt.innerHTML = atr;
			atr = xt.value;
		}
		// console.log(tag, atr, text);	
		// Listes
		let t = tag + text;
		let listes = t.match(/(\n((  )*)\* (.*))+/g);
		if (listes) {
			listes = listes.sort((a,b) => b.length - a.length);  // Tri par longueurs décroissantes pour si certaines chaînes sont comprises dans d'autres
			listes.forEach(liste => {t = t.replace(liste , makeList(makeArray(liste)))});
			t = inline(t);
			arout.push(t);
			continue;
		}
		
		// Titres
		if (/^(#{1,6}) (.*)$/m.test(t)) {
			let L = tag.trim().length;
			t = inline(text).trimEnd();
			t = `<h${L}${atr}>${t}</h${L}>`;
			arout.push(t);
			continue;			
		}
		
		// Séparations
		
		if(/^\-{4,}$/m.test(tag.trim())) {
			//t = '<hr>';
			t = inline(text).trimEnd();
			t = `<hr${atr}>${t}`;			
			arout.push(t);
			continue;
		}
		
		// Paragraphes simples
		if(/^-$/.test(tag.trim())) {
			t = inline(text).trimEnd();
			t = `<p${atr}>${t}</p>`;
			arout.push(t);
			continue;
		}
		
		// Paragraphes avec retour lignes
		if(/^--$/.test(tag.trim())) {
			t = inline(text).trimEnd().replace(/\n/g , '<br>\n');
			t = `<p${atr}>${brspan(t)}</p>`;
			arout.push(t);
			continue;
		}
		
		// Paragraphes type notes
		if(/^---$/.test(tag.trim())) {
			t = text.trimEnd().replace(/&gt;/g , ' &gt;').replace(/(https?:\/\/[^\s'">]+)/g , '<a href="$1" rel="noopener noreferrer" target="_blank">$1</a>').replace(/ &gt;/g , '&gt;');
			if (atr == '') atr = ' class=notes';
			t = `<p${atr}>${t}</p>`;
			arout.push(t);
			continue;			
		}
		
		// Texte formatté
		if(/^\+$/.test(tag.trim())) {
			t = inline(text).trimEnd();
			t = `<pre${atr}>${brcode(t)}</pre>`;
			arout.push(t);
			continue;
		}			

		// Code formatté
		if(/^\+\+$/.test(tag.trim())) {
			t = `<pre${atr}>${brcode(text.trimEnd())}</pre>`;
			arout.push(t);
			continue;
		}
		
		// Code formatté pen
		if(/^\+\+\+$/.test(tag.trim())) {
			t = `<form><pre${atr}>${brcode(text.trimEnd())}</pre><a href="WebEditor?t=${encodeURIComponent(text)}" target="_blank"><input type=button value=Run></a></form>`;
			arout.push(t);
			continue;
		}
		
		
		// Bloc html pur
		if(/^\*\*$/.test(tag.trim())) {
			text = text.replace(/&quot;/g , '"').replace(/&gt;/g , '>').replace(/&lt;/g , '<').replace(/&amp;/g , '&');
			arout.push(text.trimEnd());
			continue;
		}			

		// Si rien ne convient, retourner un node text
		t = tag + text.trim();
		arout.push(t);
	} 
	let out =  arout.join('\n');
	// Retirer l'encodage des entités
	out = out.replace(/&#(\d+);/g, function(m,m1){return String.fromCharCode(m1)});
	out = out.replace(/◄(.+?)►/gm , '<$1>');
	
	const div = document.createElement("div");
	div.innerHTML = out;
	
	let nodes = div.childNodes;
	for (var i = 0, m = nodes.length; i < m; i++) {
		var n = nodes[i];
		if (n.nodeType == n.TEXT_NODE) {
			if (n.textContent.trim() != '') {
				let replacementNode = document.createElement('pre');
				replacementNode.style.backgroundColor = 'gold';
				replacementNode.innerHTML = n.textContent;
				n.parentNode.insertBefore(replacementNode, n);
				n.parentNode.removeChild(n);			
			}
		}
	}
	div.querySelectorAll('a').forEach(a => {
		if (a.href.startsWith('http')) {
			a.rel="noopener noreferrer";
			a.target="_blank";
		}
		if (a.href.startsWith('data:')) a.onclick=makeLink(a);
	});
	
	if (div.lastElementChild) div.lastElementChild.innerHTML = div.lastElementChild.innerHTML.trimEnd();

	out = div.innerHTML.trim();
	// console.log(out);
	return out;
}

ejh.splitSrc = src => {
	//src = src.replace(/(\n----*\s?\n)/ , '$1\n');
	src = '\n\n' + src.trim() + '\n\n';
	// Regex partie gauche, sans attribut, partie droite avec
	let srcs=src.split(/(\n[*#+-]+\s|\n[*#+-]+\{.*?\}\s)/);
	for (let i = 1; i < srcs.length; i++){
		if (srcs[i].startsWith('\n* ')){
			while(srcs[i+3] && srcs[i+2].startsWith('\n* ')) {
				let concat = srcs[i+2] + srcs[i+3];
				let arconcat = concat.split('\n');
				arconcat = arconcat.filter(val => !val.trim().startsWith('*')).filter(val => val.length > 0);
				if (arconcat.length != 0) break;
				srcs[i+1] += concat;
				srcs.splice(i+2 , 2);
			}
		} 
	}
	if (srcs[0].trim() != '') srcs.splice(0 , 0 , '');
	ejh.zz = '';
	return srcs;
}

ejh.checkbal = html => {
	const ahtml = html.split('<');
	let pile = ['ok'];
	let ctrplus = 0;
	let ctrmoins = 0;
	for(let i = 1, L = ahtml.length; i < L;  i++){  // Commencer à 1 pour sauter l'élément qui précède le 1er <
		let element = ahtml[i].replace(/[\s>].*/g , '');
		if (element != '' && ['br' , 'col' , 'hr' , 'img' , 'input'].indexOf(element) < 0){
			if (element.substr(0,1) == '/'){
				const popval = pile.pop();
				const elval = element.substr(1);
				if (popval != elval) {
					err = elval + ' au lieu de ' + popval;
					return elval + ' au lieu de ' + popval;
				}
				ctrmoins++;
			} else {
				pile.push(element);
				ctrplus++;
			}
		}
	}
	if (pile.length == 1) return true;
	pile.shift();
	return ('balises initiales non fermées: ' + pile.join(' '));
}
