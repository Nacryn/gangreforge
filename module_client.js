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
				var stream_data = [];
				var i;
				var nearby_entity, states, stream_object;

				for(i=0; i<nearby_entities.length; i++) {
					nearby_entity = nearby_entities[i];
					states = this.tracked_entities_collection[nearby_entity.id];

					// skip if no state changed
					if(states &&
						states.entity_state == nearby_entity.state_counter &&
						states.geometry_state == nearby_entity.geometry_buffer.state_counter) {
						continue;
					}

					// if no state saved for this entity: create a record
					if(!states) {
						states = {
							entity_state: -1,
							geometry_state: -1
						};
						this.tracked_entities_collection[nearby_entity.id] = states;
					}

					stream_object = { entity_id: nearby_entity.id };

					// send entity state
					if(!states || states.entity_state != nearby_entity.state_counter) {
						stream_object.state = {
							position: nearby_entity.position,
							target_position: nearby_entity.target_position,
							speed: nearby_entity.speed
						};
						states.entity_state = nearby_entity.state_counter;
					}

					// send geometry state
					if(!states || states.geometry_state != nearby_entity.geometry_buffer.state_counter) {
						stream_object.blocks = nearby_entity.geometry_buffer.appendBlocksData([]);
						states.geometry_state = nearby_entity.geometry_buffer.state_counter;
					}

					stream_data.push(stream_object);
					//nearby_entities[i].geometry_buffer.appendBlocksData(stream_data.blocks);

					// this.socket.emit('geometry_data', {
					// 	blocks: nearby_entities[i].geometry_buffer.appendBlocksData([])
					// });
				}

				//send these blocks and entity states to the client
				if(stream_data.length > 0) {
					this.socket.emit('rendering_data', stream_data);
				}
				
				//this.API.streamData(this.socket, stream_data);

				//console.log('i just sent '+blocks.length+' blocks (nearby = '+nearby_entities.length+')');

				break;


				// the user clicked on the ground: go there
				case "click_world":

				this.API.moveEntity(this.entity_id, data.click_position, 1);

				break;

			}

		};

		module.socket = null;		// this must be set manually!

		// for each entity that we sent to the client, save its state counter and geometry state counter
		// this way, we know if the entity data must be resent or not!
		// key: entity_id, value: { state_counter: X, geometry_state_counter: Y }
		module.tracked_entities_collection = {};

	},
	
	[]		// registered channels
);

};