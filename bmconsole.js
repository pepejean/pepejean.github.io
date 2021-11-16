(function(){
	let ovl = document.createElement('div');
	ovl.innerHTML             = 'Test';
	ovl.id                    = 'ovl';	
	ovl.style.position        = 'fixed';
	ovl.style.top             = '0px';
	ovl.style.left            = '0px';
	ovl.style.width           = '100%';
	ovl.style.height          = '100%';
	ovl.style.backgroundColor = 'white';
	ovl.style.color           = 'black';
	ovl.style.opacity         = '1';
	ovl.style.zIndex          = '10000000';	
	document.body.appendChild(ovl);
	let swp = document.createElement('div');
	swp.innerHTML             = '&nbsp;&#9881;&nbsp;';
	swp.id                    = 'swp';
	swp.style.fontFamily      = 'arial, verdana, sans-serif';
	swp.style.fontSize        = '3vw';
	swp.style.fontWeight      = 'bold';
	swp.style.cursor          = 'pointer';
	swp.style.position        = 'fixed';
	swp.style.bottom          = '5vh';
	swp.style.right           = '5vw';
	swp.style.backgroundColor = 'blue';
	swp.style.color           = 'yellow';
	swp.style.opacity         = '1';
	swp.style.zIndex          = '10000001';	
	document.body.appendChild(swp);
	let logger = document.createElement('p');
	logger.id = "logger";
	document.getElementById("ovl").appendChild(logger);
	
	swp.onclick = function(){ovl.style.display = ovl.style.display == 'none' ? '' : 'none'}
	;(function (logger) {
		console.old = console.log;
		console.log = function () {
			var output = "", arg, i;

			for (i = 0; i < arguments.length; i++) {
				arg = arguments[i];
				output += `<span class="log-${typeof arg}">`;

				if (
					typeof arg === "object" &&
					typeof JSON === "object" &&
					typeof JSON.stringify === "function"
				) {
					output += JSON.stringify(arg);   
				} else {
					output += arg;   
				}

				output += "</span>&nbsp;";
			}

			logger.innerHTML += output + "<br>";
			console.old.apply(undefined, arguments);
		};
	})(document.getElementById("logger"));
	/*
	console.log("Hi!", {a:3, b:6}, 42, true);
	console.log("Multiple", "arguments", "here");
	console.log(null, undefined);
	console.old("Eyy, that's the old and boring one.");	
	*/
	
})();
