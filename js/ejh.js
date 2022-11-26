const ejh = {};

ejh.easy = src => {
	const splitSrc = src => {
		//src = src.replace(/(\n----*\s?\n)/ , '$1\n');
		src = '\n\n' + src.trim() + '\n\n';
		// Regex partie gauche, sans attribut, partie droite avec
		let srcs=src.split(/(\n[*#+|-]+\s|\n[*#+|-]+\{.*?\}\s)/);
		
		// Grouper les lignes des listes
		for (let i = 1; i < srcs.length; i=i+2){  // i++ ?
			if (/^\n\*(\{.*\})? /.test(srcs[i])){
				while(srcs[i+3] && srcs[i+2].startsWith('\n* ')) {
					let concat = srcs[i+2] + srcs[i+3];
					srcs[i+1] += concat;
					srcs.splice(i+2 , 2);
				}
			}
		}
		// Grouper les lignes des tables
		for (let i = 1; i < srcs.length; i=i+2){  // i++ ?
			if (srcs[i].startsWith('\n| ')){
				while(srcs[i+3] && srcs[i+2].startsWith('\n\| ')) {
					let concat = srcs[i+2] + srcs[i+3];
					srcs[i+1] += concat;
					srcs.splice(i+2 , 2);
				}
			}		
		}
		if (srcs[0].trim() != '') srcs.splice(0 , 0 , '');
		// srcs :  alternativement élément, séparateur, élément, séparateur, ....
		// Les éléments sans séparateur sont "collés" à la fin de l'élément précédent
		// Possible tout au début, après hr, après ul, après table
		// console.table(srcs);
		return srcs;
	}	
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
	
	function makeTable(table) {
		// console.log(table);
		let ar = table.split('\n').filter(txt => txt.trim() != '');
		let outb = '';
		let outh = '<thead>\n</thead>\n';
		let index ,p , ctr , aligns = [] , align;
		// Préprocessing
		for (index in ar) {
			if (! /\| *$/.test(ar[index])) ar[index] += '|';  // Compléter si | final manque
			// Déterminer les alignements
			if (/^[ |:-]*$/.test(ar[index])) {
				aligns = ar[index].split('|').slice(1,-1);
				for(let i in aligns) {
					align = aligns[i].trim();
					if (align.startsWith(':') && align.endsWith(':')) aligns[i] = ' align=center';
					else if (align.startsWith(':')) aligns[i] = ' align=left';
					else if (align.endsWith(':')) aligns[i] = ' align=right';
					else aligns[i] = '';
				}
				p = index;
				break;
			}
		}
		// Processing
		for (index in ar) {
			line = ar[index];
			if (!/^[ |:-]*$/.test(line)) {
				if (index < p) {
					line = line.split('|')
						.slice(1 , -1)
						.map(txt => inline(txt.trim()))
						.join('</th><th>');
					ctr = 1;
					line = line.replace(/<(th)>/g , () => {let x = `<th${aligns[ctr]}>`;ctr++;return x});
					outh += `<tr><th${aligns[0]}>${line}</th></tr>\n`;
				} else {
					line = line.split('|').slice(1 , -1);
					while(line.length > aligns.length) aligns.push('');  // Si trop peu de aligns, normalement jamais
					line = line.map(txt => inline(txt.trim())).join('</td><td>');
					ctr = 1;
					line = line.replace(/<(td)>/g , () => {let x = `<td${aligns[ctr]}>`;ctr++;return x});						
					outb += `<tr><td${aligns[0]}>${line}</td></tr>\n`;					
				}
			}
		};
		outb = `<tbody>\n${outb}</tbody>\n`;
		let out = `<table>\n${outh}${outb}</table>\n`;
		return out;
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
	const htmlDecode = function(h) {return(h.replace(/&quot;/g,'"').replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/&amp;/g,"&"));}


	// Pas de html
	src = src.replace(/[&<>"]/g,function(i){return rawmap[i]});
	
	// Echapper juste 1 caractère avec 1 ©, 
	// ou plusieurs caractères non lette/chiffre situés entre 2 © sur la même ligne,
	// ou échapper un © si 2 © successifs
	src = src.replace(/©(.+?)©.+/gm , function(m,s){s=s.split('').map(c => /[a-zA-Z0-9]/.test(c) ? c : '&#' + c.charCodeAt(0) + ';');return s.join('')})
		.replace(/©./gm , function(m){return '&#' + m.charCodeAt(1) + ';'});
	
	let srcs = splitSrc(src);
	
	// Les txt des attributs (entre {})
	let b4 = 'txt';
	for (let i = 1; i < srcs.length; i++){
		// Regex partie gauche, sans attribut, partie droite avec
		let typ = /^(\n[*#+|-]+\s|\n[*#+|-]+\{.*?\}\s)$/.test(srcs[i]) ? 'tag' : 'txt';
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
	
	function pusht(t) {
		let p = 1 + t.lastIndexOf('>');
		let t1 = t.substr(0 , p);
		let t2 = t.substr(p);
		if (t2.trim() != '') t2 = `\n<pre style="background-color:yellow">${t2}</pre>`;
		t =t1 + t2;
		arout.push(t);
	}
	
	let arout = [];	
	for(j = 0; j < tags.length; j++) {
		let text = texts[j];
		let tag = tags[j];
		let m = tag.match(/\{(.*)\}/);
		let atr = m ? ' ' + m.pop() : '';
		if (atr) {
			tag = tag.replace(/\{(.*)\}/ , '');	
			atr = htmlDecode(atr);   // Les entités numériques sont toutes remplacées à la fin
		}
		// console.log(tag, atr, text);	
		// Listes
		let t = tag + text;
		
		let listes = t.match(/(\n((  )*)\* (.*))+/g);
		if (listes) {
			listes = listes.sort((a,b) => b.length - a.length);  // Tri par longueurs décroissantes pour si certaines chaînes sont comprises dans d'autres
			listes.forEach(liste => {t = t.replace(liste , makeList(makeArray(liste)))});
			if (atr &&/\bol\b/.test(atr)) t=t.split('ul>').join('ol>');
			t = inline(t);
			pusht(t);
			continue;
		}
		
		let tables = t.match(/(\n\| (.*))+/g);
		if (tables) {
			tables.forEach(table => {t = t.replace(table , makeTable(table))});
			pusht(t);
			continue;
		}
		
		// Titres
		if (/^(#{1,6}) (.*)$/m.test(t)) {
			let L = tag.trim().length;
			t = inline(text).trimEnd();
			t = `<h${L}${atr}>${t}</h${L}>`;
			pusht(t);
			continue;			
		}
		
		// Séparations
		
		if(/^\-{4,}$/m.test(tag.trim())) {
			//t = '<hr>';
			t = inline(text).trimEnd();
			t = `<hr${atr}>${t}`;			
			pusht(t);
			continue;
		}
		
		// Paragraphes simples
		if(/^-$/.test(tag.trim())) {
			t = inline(text).trimEnd();
			t = `<p${atr}>${t}</p>`;
			pusht(t);
			continue;
		}
		
		// Paragraphes avec retour lignes
		if(/^--$/.test(tag.trim())) {
			t = inline(text).trimEnd().replace(/\n/g , '<br>\n');
			t = `<p${atr}>${brspan(t)}</p>`;
			pusht(t);
			continue;
		}
		
		// Paragraphes type notes
		if(/^---$/.test(tag.trim())) {
			t = text.trimEnd().replace(/&gt;/g , ' &gt;').replace(/(https?:\/\/[^\s'">]+)/g , '<a href="$1">$1</a>').replace(/ &gt;/g , '&gt;');
			if (atr == '') atr = ' class=notes';
			t = `<p${atr}>${t}</p>`;
			pusht(t);
			continue;			
		}
		
		// Texte formatté
		if(/^\+$/.test(tag.trim())) {
			t = inline(text).trimEnd();
			t = `<pre${atr}>${brcode(t)}</pre>`;
			pusht(t);
			continue;
		}			

		// Code formatté
		if(/^\+\+$/.test(tag.trim())) {
			t = `<pre${atr}>${brcode(text.trimEnd())}</pre>`;
			pusht(t);
			continue;
		}
		
		// Code formatté pen
		if(/^\+\+\+$/.test(tag.trim())) {
			t = `<form><pre${atr}>${brcode(text.trimEnd())}</pre><a href="WebEditor?t=${encodeURIComponent(text)}"><input type=button value=Run></a></form>`;
			pusht(t);
			continue;
		}
		
		
		// Bloc html pur
		if(/^\*\*$/.test(tag.trim())) {
			t = text.replace(/&quot;/g , '"').replace(/&gt;/g , '>').replace(/&lt;/g , '<').replace(/&amp;/g , '&').trimEnd();
			pusht(t);
			continue;
		}			

		// Si rien ne convient
		t = tag + text.trimEnd();
		pusht(t);
	} 
	let out =  arout.join('\n');
	// Retirer l'encodage des entités
	out = out.replace(/&#(\d+);/g, function(m,m1){return String.fromCharCode(m1)});
	out = out.replace(/˂(.+?)˃/gm , '<$1>');   // pas des vrais < et > , signes &#706; et &#707;

	return out.trim();
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
