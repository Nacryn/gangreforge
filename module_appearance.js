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



module.exports = function(entity_module_builder) {

entity_module_builder.registerModule(

	"appearance",
	"this module handles displaying shapes in the 3D scene and providing a pickable mesh for the entity",

	function(module) {

		// overriding respond function
		module.respondToMessage = function(message, data) {

			switch(message) {

				case "update":

				break;

				// refresh geometry based on instructions list (if it has changed)
				case "refresh_geometry":

				if(!this.dirty) { break; }

				var buffer = this.API.requestGeometryBuffer(this.entity_id);
				var entity = this.API.getEntityById(this.entity_id);

				// TEMP!!
				buffer.drawBox(
					entity.position.x,
					entity.position.y,
					entity.position.z,
					0.6, 0.4, 0.4,
					1, 2, 1
				);

				//console.dir(entity.position);

				this.dirty = false;

				break;


			}

		};

		// this is the input code written by the client
		// it is then parsed into drawing instructions
		// temp: mockup code
		module.input_code =
			"moveto 0 0.5 0\n"+
			"box 1 1 1\n"+
			"move 0 1 0\n"+
			"box 1 0.7 1";

		// drawing instructions list (refreshed on each edit)
		module.instructions = [];

		// this is the current drawing state (translation, color, rotation, scale...)
		module.translation = {x:0, y:0, z:0};
		module.draw_color = {r:0, g:0, b:0};		// alpha not supported

		module.dirty = true;
	},
	
	[]		// registered channels
);

};

