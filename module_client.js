var CLIENT_MOVE_SPEED = 10;	// by sec

module.exports = function(entity_module_builder) {

entity_module_builder.registerModule(

	"client",
	"this module handles client interaction in the scene and sends environment update through the client socket",

	function(module) {

		// overriding respond function
		module.respondToMessage = function(message, data) {

			switch(message) {

				// send nearby geometry blocks to the client we're attached to
				case "send_geometry":

				var nearby_entities = this.API.getNearbyEntities(this.entity_id);
				var stream_data = { blocks: [] };
				var i;

				for(i=0; i<nearby_entities.length; i++) {

					// todo: do not send geometry blocks if they haven't changed

					nearby_entities[i].geometry_buffer.appendBlocksData(stream_data.blocks);

					// this.socket.emit('geometry_data', {
					// 	blocks: nearby_entities[i].geometry_buffer.appendBlocksData([])
					// });
				}

				//send these blocks to the client
				this.socket.emit('geometry_data', stream_data);
				
				//this.API.streamData(this.socket, stream_data);

				//console.log('i just sent '+blocks.length+' blocks (nearby = '+nearby_entities.length+')');

				break;


			}

		};

		module.socket = null;		// this must be set manually!

	},
	
	[]		// registered channels
);

};