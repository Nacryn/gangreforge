// the appearance module defines the general shape of the entity object
// it relies on a 'source code' that defines what shapes get drawn

// sending geometry to the client is then done using Geometry Blocks
// these are of fixed size and can be serialized in JSON
// they hold arrays containing: positions, colors, uvs, normals and indices

// this module does not handle these blocks directly, instead it uses a
// GeometryBuffer object provided by the EntityModuleAPI
// this object then manages its own collection of blocks

// these blocks are sent to the client by the "client" modules
// so the "appearance" modules only handle filling the buffer

// note: all geometry is drawn in local space!


module.exports = function(entity_module_builder) {

entity_module_builder.registerModule(

	"appearance",
	"this module handles representing the entity with customizable 3D shapes",

	function(module) {

		// overriding respond function
		module.respondToMessage = function(message, data) {

			var entity = this.API.getEntityById(this.entity_id);

			switch(message) {

				case "update":
				break;

				// inspector panel request
				// we send back to the socket the contents of our block
				case "inspector_panel":
				data.socket.emit("inspector_panel_block", {
					elements: [
						this.API.outputPlainText("This is the code that defines what gets drawn."),
						this.API.outputEditableCode("appearance_code", this.input_code)
					],
					rank: this.rank
				});
				break;

				// we received a new value from the inspector
				case "inspector_panel_change":
				if(data.appearance_code) {
					this.input_code = data.appearance_code;
					this.parseInstructionList();
					this.API.setChanged(this.entity_id);
				}
				break;

			}

		};

		// override render function
		module.appendDrawingInstructions = function(instructions_list) {

			// temp
			/*
			this.API.drawBox(instructions_list,
				0, 0, 0,
				0, 0, 0,
				2, 3, 2,
				0.8, 0.6, 0.6);
			*/
			for(var i=0; i<this.instructions.length; i++) {
				instructions_list.push(this.instructions[i]);
			}
		};

		// this is the input code written by the client
		// it is then parsed into drawing instructions
		// the default code is randomized
		var size = Math.random()*0.6 + 0.7;
		var hue = Math.random();
		module.input_code =
			"color_hsl "+hue.toFixed(2)+" 0.8 0.7\n"+
			"disc 1.1\n"+
			"moveto 0 "+(size/2).toFixed(2)+" 0\n"+
			"box 1 "+size.toFixed(2)+" 1\n"+
			"move 0 "+(size/2+0.5).toFixed(2)+" 0\n"+
			"box 1 0.7 1";

		// generated drawing instructions list (refreshed on each edit)
		module.instructions = [];


		// this functions parses the input code
		// if no error, returns null
		// if there are errors, returns an object like so { line_number: error_string }
		module.parseInstructionList = function() {
			
			// a temp array of instructions
			// if there is an error in the parsing, this will not be used
			var instructions = [];
			var lines = this.input_code.split("\n");
			var result = {};
			var error = false;

			// instructions are composed of a verb and parameters
			var verb, line, params, param_count, param, instr, number, a, b, i, j;
			for(i=0; i<lines.length; i++) {

				// init
				params = [];
				param_count = 0;
				line = lines[i];

				// first clean up the line (remove extra spaces, lower case)
				line = line.replace(/\s+/g,' ').trim().toLowerCase();

				// find the verb
				a = line.indexOf(" ");
				verb = line.substring(0, a);
				switch(verb) {
					case "moveto": param_count = 3; break;
					case "move": param_count = 3; break;
					case "box": param_count = 3; break;
					case "disc": param_count = 1; break;
					case "sphere": param_count = 1; break;
					case "color": param_count = 3; break;
					case "color_hsl": param_count = 3; break;
					case "shiftcolor": param_count = 3; break;
					case "shiftcolor_hsl": param_count = 3; break;
					default: result[i] = "instruction invalid"; error = true;
				}
				params.push(verb);

				// parse the parameters
				for(j=0; j<param_count; j++) {

					// check for quotes...
					if(line.substring(a, 1) == "'") {
						b = line.indexOf("'", a+1);
						number = false;
					} else {
						b = line.indexOf(" ", a+1);
						if(b == -1) {
							// force end of line
							b = line.length;
							j = param_count;
						}
						number = true;
					}
					param = line.substring(a+1, b);

					if(number) { params.push(parseFloat(param)); }
					else { params.push(param); }
					a = b;
				}

				instructions.push(params);

			}

			if(error) { return result; }

			// generate drawing instructions
			this.instructions = [];
			var translation = {x:0, y:0, z:0};
			var rotation = {x:0, y:0, z:0};
			var color = {r:0, g:0, b:0};		// alpha not supported

			for(i=0; i<instructions.length; i++) {

				params = instructions[i];

				switch(params[0]) {

					case "moveto":
						translation.x = params[1];
						translation.y = params[2];
						translation.z = params[3];
					break;

					case "move":
						translation.x += params[1];
						translation.y += params[2];
						translation.z += params[3];
					break;

					case "box":
						this.API.drawBox(
							this.instructions,
							translation.x, translation.y, translation.z,
							0, 0, 0,
							params[1], params[2], params[3],
							color.r, color.g, color.b
						);
					break;

					case "disc":
						this.API.drawDisc(
							this.instructions,
							translation.x, translation.y, translation.z,
							0, 0, 0,
							params[1],
							color.r, color.g, color.b
						);
					break;

					case "sphere":
						this.API.drawSphere(
							this.instructions,
							translation.x, translation.y, translation.z,
							params[1],
							color.r, color.g, color.b
						);
					break;

					case "color":
						color.r = Math.max(Math.min(params[1], 1), 0);
						color.g = Math.max(Math.min(params[2], 1), 0);
						color.b = Math.max(Math.min(params[3], 1), 0);
					break;

					case "color_hsl":
						a = this.convertHSLtoRGB(
							Math.max(Math.min(params[1], 1), 0),
							Math.max(Math.min(params[2], 1), 0),
							Math.max(Math.min(params[3], 1), 0)
						);
						color.r = a.r;
						color.g = a.g;
						color.b = a.b;
					break;

					case "shiftcolor":
						color.r = Math.max(Math.min(color.r+params[1], 1), 0);
						color.g = Math.max(Math.min(color.g+params[2], 1), 0);
						color.b = Math.max(Math.min(color.b+params[3], 1), 0);
					break;

					case "shiftcolor_hsl":
						a = this.convertRGBtoHSL(color.r, color.g, color.b);
						a.h = Math.max(Math.min(a.h+params[1], 1), 0);
						a.s = Math.max(Math.min(a.s+params[2], 1), 0);
						a.l = Math.max(Math.min(a.l+params[3], 1), 0);
						a = this.convertHSLtoRGB(a.h, a.s, a.l);
						color.r = a.r;
						color.g = a.g;
						color.b = a.b;
					break;
				}
			}

			return null;
		};


		// utils

		module.convertHSLtoRGB = function(h, s, l) {
			result = {r: 0, g: 0, b: 0};
			var r, g, b, i, f, p, q, t;
			i = Math.floor(h * 6);
			f = h * 6 - i;
			p = l * (1 - s);
			q = l * (1 - f * s);
			t = l * (1 - (1 - f) * s);
			switch (i % 6) {
				case 0: result.r = l; result.g = t; result.b = p; break;
				case 1: result.r = q; result.g = l; result.b = p; break;
				case 2: result.r = p; result.g = l; result.b = t; break;
				case 3: result.r = p; result.g = q; result.b = l; break;
				case 4: result.r = t; result.g = p; result.b = l; break;
				case 5: result.r = l; result.g = p; result.b = q; break;
			}
			return result;
		};

		module.convertRGBtoHSL = function(r, g, b) {
			var result = {h: 0, s: 0, l: 0};
			var max = Math.max(r, g, b);
			var min = Math.min(r, g, b);
			result.l = (max + min) / 2;
			if(max == min) {
				result.h = result.s = 0; // achromatic
			} else {
				var d = max - min;
				result.s = result.l > 0.5 ? d / (2 - max - min) : d / (max + min);
				switch(max) {
					case r: result.h = (g - b) / d + (g < b ? 6 : 0); break;
					case g: result.h = (b - r) / d + 2; break;
					case b: result.h = (r - g) / d + 4; break;
				}
				result.h /= 6;
			}
			return result;
		};



		// first parse
		module.parseInstructionList();


	},
	
	[]		// registered channels
);


}; // end of exports