//
// MIT License
// Copyright (c) 2020 Kazuki UMEMOTO
// see https://github.com/UmemotoCtrl/MarkdownParser for details
//

// 
// Usage
// 
// let mdp = makeMDP();
// let html_text = mdp.render( markdown_test );
// 

"use strict";

let makeMDP = function (argConfig) {
	let makeBlockSyntax = function (argObj) {
		const delimiter = argObj.config.delimiter;
		const spacesForNest = argObj.config.spacesForNest;
		let cAr = new Array();

		// The order is important.
		cAr.push ( {	// Code block with code name
			tag: "CB",
			matchRegex: new RegExp("^`{3}.*?\\n[\\s\\S]*?\\n`{3}$", 'gm'),
			converter: function ( argBlock ) {
				const temp = argBlock.replace(/</g,'&lt;').replace(/>/g,'&gt;');
				if (/^`{3}.+$/m.test(argBlock))
					return temp.replace(	
						new RegExp("^`{3}(.+?)\\n([\\s\\S]*)\\n`{3}$"),
						'<pre class="'+'$1">$2</pre>'
					);
				else
					return temp.replace(
						new RegExp("^`{3}\\n([\\s\\S]*)\\n`{3}$"),
						"<pre>$1</pre>"
					);
			},
			matchedString: new Array()
		});
		cAr.push ( {	// HTML comment block
			tag: "CM",
			matchRegex: new RegExp("^<!--[\\s\\S]*?-->\s*$", 'gm'),
			converter: function ( argBlock ) {
				let temp = argBlock.replace( new RegExp("^(<!--[\\s\\S]*?-->)\s*$"), "$1" );
				if (temp.indexOf("\n") == -1) return temp;
				else return "";
			},
			matchedString: new Array()
		});
		cAr.push ( {	// HTML block
			tag: "HT",
			matchRegex: new RegExp("^<\\S[\\s\\S]*?\\S>$", 'gm'),
			converter: function ( argBlock ) {
				return argBlock.replace( new RegExp("^(<\\S[\\s\\S]*?\\S>)$"), "$1" );
			},
			matchedString: new Array()
		});		
		cAr.push ( {
			tag: "HD",
			provisionalText: "\n"+delimiter+"HD"+delimiter+"\n",	// to divide list, \n is added.
			matchRegex: new RegExp("^#{1,6} +.+$", 'gm'),
			converter: function ( argBlock ) {
				const num = argBlock.match(/^#{1,6}(?= )/)[0].length;
				let hid = argBlock.match(/ \{#\S+\}$/);
				let temp;
				// Implémentation de l"ID pour les h (pour les liens internes)
				if (hid) temp = argBlock.replace(/\{#\S+\}$/ , '').replace( new RegExp('^\\n*#{1,6} +(.+?)[\\s#]*$'), '<h'+num+' id="'+hid[0].slice(3,-1)+'">$1</h'+num+'>' );
				else temp = argBlock.replace( new RegExp('^\\n*#{1,6} +(.+?)[\\s#]*$'), '<h'+num+'>$1</h'+num+'>' );
				return Obj.mdInlineParser(temp, null);
			},
			matchedString: new Array()
		});
		cAr.push ( {	// Horizontal Rule
			tag: "HR",
			provisionalText: "\n"+delimiter+"HR"+delimiter+"\n",	// to divide list, \n is added.
			matchRegex: new RegExp("^ *[-+*=] *[-+*=] *[-+*=][-+*= ]*$", 'gm'),
			converter: function ( argBlock ) {
				return "<hr>";
			},
			matchedString: new Array()
		});
		cAr.push ( {	// Blockquote
			tag: "BQ",
			matchRegex: new RegExp("^ *> *[\\s\\S]*?(?=\\n\\n)", 'gm'),
			converter: function ( argBlock ) {
				const temp = argBlock
					.replace( new RegExp("^\\n*([\\s\\S]*)\\n*$"), "$1" );
				return Obj.mdInlineParser( Obj.mdBlockquoteParser(temp), null );
			},
			matchedString: new Array()
		});
		cAr.push ( {	// Table
			tag: "TB",
			matchRegex: new RegExp("^\\|.+?\\| *\\n\\|[-:| ]*\\| *\\n\\|.+?\\|[\\s\\S]*?(?=\\n\\n)", 'gm'),
			converter: function ( argBlock ) {
				argBlock = Obj.mdInlineParserFormer(argBlock);
					const temp = argBlock
					.replace( new RegExp("^\\n*([\\s\\S]*)\\n*$"), "$1" );
				return Obj.mdInlineParserLatter(Obj.mdTBParser(temp));
			},
			matchedString: new Array()
		});
		cAr.push ( {	// List
			tag: "LT",
			matchRegex: new RegExp('^ *\\d+?\\. [\\s\\S]*?$(?!\\n\\s*^ *\\d+?\\. |\\n\\s*^ {2,}.+$)(?=\\n\\n)'+'|'
					+'^ *[-+*] [\\s\\S]*?$(?!\\n\\s*^ *[-+*] |\\n\\s*^ {2,}.+$)(?=\\n\\n)', 'gm'),
			converter: function ( argBlock ) {
				const temp = argBlock
					.replace( new RegExp("^\\n*([\\s\\S]*)\\n*$"), "$1" );
				return Obj.mdInlineParser( Obj.mdListParser(temp, spacesForNest), null );
			},
			matchedString: new Array()
		});
		cAr.push ( {	// Paragraph
			tag: "PP",
			matchRegex: new RegExp('^.(?!'+delimiter[0]+'.{2}'+delimiter+')[\\s\\S]*?\\n$', 'gm'),
			converter: function ( argBlock ) {
				if (makeMDP.lnk) argBlock = argBlock.replace(/(^|\s)(https?:\/\/[^\s<>\[\]\(\)'"`*]+)($|\s)/gm , '$1[$2]($2)$3');   // perso autolink
				if (makeMDP.br) argBlock = argBlock.replace(/  \n/g , '<br>\n');  // perso br dans paragraphes
				const temp = '<p>'+argBlock.replace( /^\n*|\n*$/g, "" )+'</p>';
				return Obj.mdInlineParser(temp, null);
			},
			matchedString: new Array()
		});
		return cAr;
	}
	let makeInlineSyntax = function (argObj) {
		const subsDollar = argObj.config.subsDollar;
		let cAr = new Array();
		cAr.push ({ // perso custom code
			tag: "CT",
			matchRegex: new RegExp("~\\w+:.+?~", 'g'),
			converter: function ( argBlock ) {
				let parts = argBlock.match(/~(\w+):(.*?)~/);
				let functionName = parts[1];
				let functionArg = parts[2];
				if (typeof makeMDP[functionName] === 'function') {
					makeMDP[functionName].x = functionArg;
					const bindFunction = makeMDP[functionName].bind(makeMDP[functionName]);
					const t = bindFunction(); // le texte est dans this.x de bindFunction
					if (typeof t === "string") return t;
					else {
						console.log("custom function ignorée car ne retourne pas un string");
						return argBlock;
					}
				}
				else return argBlock;
			},
			matchedString: new Array()
		});					
		cAr.push ({	// inline code
			tag: "IC",
			matchRegex: new RegExp("`.+?`", 'g'),
			converter: function ( argBlock ) {
				return "<code>"+ argBlock.replace(/`(.+?)`/g,"$1").replace(/</g,'&lt;').replace(/>/g,'&gt;') +"</code>";
			},
			matchedString: new Array()
		});
		cAr.push ({	// img
			tag: "IG",
			provisionalText: '<img src="$2" alt="$1">',
			matchRegex: new RegExp("!\\[(.*?)\\]\\((.+?)\\)", 'g'),
			converter: function ( argBlock ) {return null;},
			matchedString: new Array()
		});
		cAr.push ({	// Anchor Link
			tag: "AC",	// Just for use array management.
			provisionalText: '<a href="$2">$1</a>',					// the string is used for replace.
			matchRegex: new RegExp("\\[(.+?)\\]\\((.+?)\\)", 'g'),	// the RexExp is used for replace.
			converter: function ( argBlock ) {return null;},
			matchedString: new Array()
		});
		cAr.push ({		// Strong
			tag: "SO",	// Just for use array management.
			provisionalText: '<strong>$1</strong>',
			matchRegex: new RegExp("\\*\\*(.+?)\\*\\*", 'g'),
			converter: function ( argBlock ) {return null;},
			matchedString: new Array()
		});
		cAr.push ({	// Emphasize
			tag: "EM",	// Just for use array management.
			provisionalText: '<em>$1</em>',
			matchRegex: new RegExp("\\*(.+?)\\*", 'g'),
			converter: function ( argBlock ) {return null;},
			matchedString: new Array()
		});
		cAr.push ({	// Strike
			tag: "SI",	// Just for use array management.
			provisionalText: '<strike>$1</strike>',
			matchRegex: new RegExp("~~(.+?)~~", 'g'),
			converter: function ( argBlock ) {return null;},
			matchedString: new Array()
		});
		return cAr;
	}

	let Obj = {
		config: {
			delimiter: "&&",		// delimiter for structure expression
			subsDollar: "&MDPDL&",
			spacesForNest: 2,		// number of spaces for nested lists.
			tabTo: "\t",			// si "  " alors \t -> two spaces
		},
		blockSyntax: new Array(),
		inlineSyntax: new Array(),
		mdInlineParserFormer: function ( argText ) {
			let cAr = this.inlineSyntax;
			for (let ii = 0; ii < (cAr||[]).length; ii++) {
				cAr[ii].matchedString = argText.match(  cAr[ii].matchRegex );
				for (let jj = 0; jj < (cAr[ii].matchedString||[]).length; jj++) {
					cAr[ii].matchedString[jj] = cAr[ii].converter(cAr[ii].matchedString[jj]);
				}
				if (typeof cAr[ii].provisionalText == 'undefined')
					cAr[ii].provisionalText = this.config.delimiter+this.config.delimiter
						+cAr[ii].tag+this.config.delimiter+this.config.delimiter;
				argText = argText.replace( cAr[ii].matchRegex, cAr[ii].provisionalText );
			}
			return argText;
		},
		mdInlineParserLatter: function ( argText ) {
			const delimiter = this.config.delimiter;
			let cAr = this.inlineSyntax;
			for (let ii = 0; ii < (cAr||[]).length; ii++) {
				for (let jj = 0; jj < (cAr[ii].matchedString||[]).length; jj++) {
					argText = argText.replace( delimiter+delimiter+cAr[ii].tag+delimiter+delimiter, cAr[ii].matchedString[jj] );
				}
			}
			return argText;
		},
		mdInlineParser: function ( argText ) {
			argText = this.mdInlineParserFormer(argText);
			return this.mdInlineParserLatter(argText);
		},
		mdTBParser: function ( argText ) {
			let retText = "";
			let lineText = argText.split(/\n/);
			// For 2nd line
			let items = lineText[1].replace(/^\|\s*/, "").replace(/\s*\|$/, "").split(/\s*\|\s*/g);
			let alignText = new Array();
			for (let jj = 0; jj < items.length; jj++)
				if ( /^:[\s-]+:$/.test(items[jj]) )
					alignText.push(" style='text-align:center'");	// center align
				else if( /^:[\s-]+$/.test(items[jj]) )
					alignText.push(" style='text-align:left'");		// left align
				else if( /^[\s-]+:$/.test(items[jj]) )
					alignText.push(" style='text-align:right'");	// right align
				else
					alignText.push("");
			// For 1st line
			retText = "<table>\n";
			retText +=  "<thead><tr>\n";
			items = lineText[0].replace(/^\|\s*/, "").replace(/\s*\|$/, "").split(/\s*\|\s*/g);
			for (let jj = 0; jj < alignText.length; jj++)
				retText +=  "<th"+alignText[jj]+">" + items[jj] + "</th>\n";
			// For 3rd and more
			retText +=  "</tr></thead>\n";
			retText +=  "<tbody>\n";
			for (let kk = 2; kk < lineText.length; kk++) {
				lineText[kk] = lineText[kk].replace(/^\|\s*/, "");
				items = lineText[kk].split(/\s*\|+\s*/g);
				let colDivText = lineText[kk].replace(/\s/g, "").match(/\|+/g);
				retText +=  "<tr>\n";
				let num = 0;
				for (let jj = 0; jj < (colDivText||[]).length; jj++) {
					if (colDivText[jj] == "|") {
						retText +=  "<td"+alignText[num]+">" + items[jj] + "</td>\n";
						num += 1;
					} else {
						retText +=  "<td"+alignText[num]+" colspan='"+colDivText[jj].length+"'>" + items[jj] + "</td>\n";
						num += colDivText[jj].length;
					}
				}
				retText +=  "</tr>\n";
			}
			retText +=  "</tbody></table>";
			return retText;
		},
		mdListParser: function ( argText, spacesForNest ) {
			let checkListDepth = function ( argLine ) {
				let listType = checkListType ( argLine );
				let spaceRegex;
				if (listType == "OL")
					spaceRegex = new RegExp("^\\s*?(?=\\d+\\.\\s+.*?$)");
				else
					spaceRegex = new RegExp("^\\s*?(?=[-+*]\\s+.*?$)");
				let depth;
				let spaceText = argLine.match(spaceRegex);
				if (spaceText == null)
					depth = 0;
				else
					depth = spaceText[0].length;
				return depth;
			}
			let checkListType = function ( argLine ) {
				argLine = argLine.replace(/\n/g, "");
				let olRegex = new RegExp("^\\s*?\\d+\\.\\s+.*?$");
				let ulRegex = new RegExp("^\\s*?[-+*]\\s+.*?$");
				if ( olRegex.test(argLine) )
					return "OL";
				else if ( ulRegex.test(argLine) )
					return "UL";
				else
					return "RW";
			}
			let loose;
			if ( /^ *$/m.test(argText) ) loose = true;
			else loose = false;
			let lines = argText.split(/\n/g);
			let depth = checkListDepth(lines[0]);
			let listType = checkListType(lines[0]);
			let retText = "";
			let listRegex;
			if (listType == "OL")
				listRegex = new RegExp("^\\s*?\\d+\\.\\s+(.*?)$");
			else
				listRegex = new RegExp("^\\s*?[-+*]\\s+(.*?)$");
			retText += "<"+listType.toLowerCase()+"><li>";
			let lineDepth, lineType;
			let tempText = "";
			for (let jj = 0; jj < (lines||[]).length; jj++) {
				if (makeMDP.lnk) lines[jj] = lines[jj].replace(/(^|\s)(https?:\/\/[^\s<>\[\]\(\)'"`*]+)($|\s)/gm , '$1[$2]($2)$3');   // perso autolink
				lineDepth = checkListDepth(lines[jj]);
				lineType = checkListType(lines[jj]);
				if ( lineDepth == depth && lineType == listType) {	// add new item
					if (tempText != "") {
						retText += this.mdListParser( tempText.replace(/\n*$/, ""), spacesForNest ).replace(/\n*$/, "");
						tempText = "";
					}
					if (loose) retText += "</li>\n<li><p>"+lines[jj].replace(listRegex, "$1") + "</p>\n";
					else retText += "</li>\n<li>"+lines[jj].replace(listRegex, "$1") + "\n";
				} else if ( lineDepth >= depth+this.config.spacesForNest) {	// create nested list
					tempText += lines[jj]+"\n";
				} else {	// simple paragraph
					if (tempText != "") {
						tempText += lines[jj]+"\n";
					} else {
						if (loose) retText += '<p>'+lines[jj]+'</p>\n';
						else retText += lines[jj]+"\n";
					}
				}
			}
			if (tempText != "") {
				retText += this.mdListParser( tempText.replace(/\n*$/, ""), spacesForNest ).replace(/\n*$/, "");
			}
	
			retText += "</li></"+listType.toLowerCase()+">";
			return retText.replace(/<li>\n*<\/li>/g, "");
		},
		mdBlockquoteParser: function ( argText ) {
			let retText = '<blockquote>\n';
			argText = argText.replace( /\n\s*(?=[^>])/g, " ");
			argText = argText.replace( /^\s*>\s*/, "").replace( /\n\s*>\s*/g, "\n");
			let lineText = argText.split(/\n/);
			let tempText = "";
			for (let kk = 0; kk < (lineText||[]).length; kk++) {
				if ( /^\s*>\s*/.test(lineText[kk]) ) {
					tempText += lineText[kk] + "\n";
				} else {
					if ( tempText != "" ) {
						retText += this.mdBlockquoteParser(tempText) + "\n";
						tempText = "";
					}
					retText += lineText[kk] + "\n";
				}
			}
			if (tempText != "")
				retText += this.mdBlockquoteParser(tempText);
			return retText + '\n</blockquote>';
		},

		analyzeStructure: function( argText ) {
			const cAr = this.blockSyntax;
			// pre-formatting
			argText = argText.replace(/\r\n?/g, "\n");	// Commonize line break codes between Win and mac.
			argText = argText.replace(/\t/g, this.config.tabTo);
			argText = argText.replace(/\$/g, this.config.subsDollar);
			argText = "\n"+ argText + "\n\n";
			
			// Convert to Structure Notation
			for (let ii = 0; ii < (cAr||[]).length; ii++) {
				cAr[ii].matchedString =  argText.match(cAr[ii].matchRegex);
				if (typeof cAr[ii].provisionalText == 'undefined')
					cAr[ii].provisionalText = this.config.delimiter+cAr[ii].tag+this.config.delimiter;
				argText = argText.replace( cAr[ii].matchRegex, cAr[ii].provisionalText );
			}
			argText = argText.replace(/\n{2,}/g, "\n");
			// console.log(argText);	// to see structure
			return argText;
		},
		render: function( argText ) {
			// perso, function pour custom syntax
			let comments = argText.match(/<!--[\s\S]+?-->/g);
			if (comments) {
				for (let comment of comments) {
					let fn = comment.match(/~\w+:.+?~\n/gs);
					if (fn) {
						for (var f of fn) {
							let parts = f.match(/~(\w+):(.+?)~\n/s);
							let functionName = parts[1];
							let functionCode = parts[2];
							makeMDP[functionName] = new Function(functionCode);
						}
					}			
				}
			}
			if (typeof makeMDP['noPlus'] === 'function') {
				let ar_no = makeMDP.noPlus();
				ar_no.forEach(no => {
					if (['lnk' , 'br' , 'pre' , 'det'].includes(no)) makeMDP[no] = false;
					else alert('noPlus bad param: ' + no);
				});
			}
			if (typeof makeMDP['toEsc'] === 'function') {
				makeMDP.esc = makeMDP.toEsc();
			}	
			if (makeMDP.esc != '') {
				const escape = makeMDP.esc
				const regex = new RegExp(`\\\\([${escape.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}])`, 'g');
				argText = argText.replace(regex, (match, captured) => `&#${captured.charCodeAt(0)};`);
			}
			if (typeof makeMDP['funnyMD'] === 'function') {
				makeMDP['funnyMD'].x = argText;
				const bindFunction = makeMDP['funnyMD'].bind(makeMDP['funnyMD']);
				const t = bindFunction(); // le texte est dans this.x de bindFunction
				if (typeof t === "string") argText = t;
				else console.log("funnyMD function ignorée car ne retourne pas un string");
			}
			if (makeMDP.pre) argText = argText.replace(/^```(.+)```$/gm , '```\n$1\n```');  // perso, pre monoline
			if (makeMDP.det) {
				// perso, détails summary
				argText = argText.replace(/^::::$/gm , '</details>');
				argText = argText.replace(/^:::: (.*?)$/gm , function(m , m1) {
					if (m1.trim() == "") return "::::";
					let did = m1.match(/ \{#\S+\}$/);
					if (did) return `<details id="${did[0].slice(3,-1)}">\n<summary>${m1.slice(0 , -did[0].length)}</summary>`;
					else return `<details>\n<summary>${m1}</summary>`;
				});
			}
			argText = argText.replace(/^(`{3}(.*?)\n([\s\S]*)\n`{3})$/gm , '\n$1\n')  // Corriger pre inclus dans p quand pas de ligne vide de séparation
			const cAr = this.blockSyntax;
			const delimiter = this.config.delimiter;

			argText = this.analyzeStructure(argText);

			// Restore to html
			for (let ii = (cAr||[]).length-1; ii >= 0; ii--) {
				for (let jj = 0; jj < (cAr[ii].matchedString||[]).length; jj++) {
					argText = argText.replace( delimiter+cAr[ii].tag+delimiter, cAr[ii].converter(cAr[ii].matchedString[jj]) );
				}
			}
			argText = argText.replace(new RegExp(this.config.subsDollar, 'g'), '$');

			argText = argText.split('\n</p>').join('</p>');

			if (typeof makeMDP['funnyHTML'] === 'function') {
				makeMDP['funnyHTML'].x = argText;
				const bindFunction = makeMDP['funnyHTML'].bind(makeMDP['funnyHTML']);
				const t = bindFunction(); // le texte est dans this.x de bindFunction
				if (typeof t === "string") argText = t;
				else console.log("funnyHTML function ignorée car ne retourne pas un string");
			}
			argText = argText.replace(/<\/details><\/p>/g , '</details>'); // Un </p> stupide est parfois présent
			
			return argText;
		}
	}

	if (typeof argConfig != 'undefined') {
		let keys = Object.keys(argConfig);
		for (let ii = 0; ii < (keys||[]).length; ii++)
			Obj.config[keys[ii]] = argConfig[keys[ii]];
	}
	Obj.blockSyntax = makeBlockSyntax(Obj);
	Obj.inlineSyntax = makeInlineSyntax(Obj);
	return Obj;
}

function mdpnote(t){
	let mdp = makeMDP();
	makeMDP.lnk = true;
	makeMDP.br = true;
	makeMDP.pre = true;
	makeMDP.det = true;
	makeMDP.esc = '';	
	mdp.config.tabTo = '\t';
	let html = mdp.render(t);
	return html;
}

