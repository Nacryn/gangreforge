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
	"this module handles displaying shapes in the 3D scene and providing a pickable mesh for the entity",

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

			}

		};

		// override render function
		module.appendDrawingInstructions = function(instructions_list) {

			// temp
			this.API.drawBox(instructions_list,
				0, 0, 0,
				0, 0, 0,
				2, 3, 2,
				0.8, 0.6, 0.6);

		};

		// this is the input code written by the client
		// it is then parsed into drawing instructions
		// temp: mockup code
		module.input_code =
			"moveto 0 0.5 0\n"+
			"box 1 1 1\n"+
			"move 0 1 0\n"+
			"box 1 0.7 1";

		// generated drawing instructions list (refreshed on each edit)
		module.instructions = [];

		// this is the current drawing state (translation, color, rotation, scale...)
		module.translation = {x:0, y:0, z:0};
		module.rotation = {x:0, y:0, z:0};
		module.draw_color = {r:0, g:0, b:0};		// alpha not supported

	},
	
	[]		// registered channels
);

};

