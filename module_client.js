var CLIENT_MOVE_SPEED = 10;		// units / sec
var FULLREFRESH_INTERVAL = 5;	// sec, time between full refresh of nearby entities

module.exports = function(entity_module_builder) {

entity_module_builder.registerModule(

	"client",
	"this module handles client interaction and data exchange with the scene",

	function(module) {

		// overriding respond function
		module.respondToMessage = function(message, data) {

			switch(message) {

				// regularly send new data on update event
				case "update":

				var full_refresh = false;
				var now = Date.now();
				if(now - this.last_refresh_time >= FULLREFRESH_INTERVAL * 1000) {
					this.last_refresh_time = now;
					full_refresh = true;
				}

				var nearby_entities = this.API.getNearbyEntities(this.entity_id);
				var my_entity = this.API.getEntityById(this.entity_id);
				var stream_data = [];
				var drawing_instructions, modules;
				var i, j;
				var nearby_entity, recorded_entity, entity_data;

				for(i=0; i<nearby_entities.length; i++) {
					nearby_entity = nearby_entities[i];
					recorded_entity = this.tracked_entities_collection[nearby_entity.id];

					// skip if no state changed
					if(recorded_entity && recorded_entity.entity_state == nearby_entity.state_counter && !full_refresh) {
						continue;
					}

					// if no state saved for this entity: create a record
					if(!recorded_entity) {
						recorded_entity = {
							entity_state: -1
						};
						this.tracked_entities_collection[nearby_entity.id] = recorded_entity;
					}

					entity_data = {};

					// gather entity state
					entity_data.position = nearby_entity.position;
					entity_data.target_position = nearby_entity.target_position;
					entity_data.speed = nearby_entity.speed;

					if(nearby_entity == my_entity) {
						entity_data.focus = true;
					}

					// save entity state on module
					recorded_entity.entity_state = nearby_entity.state_counter;

					// send drawing instructions
					entity_data.drawing_instructions = [];
					modules = this.API.getModulesByEntityId(nearby_entity.id);
					for(j=0; j<modules.length; j++) {
						modules[j].appendDrawingInstructions(entity_data.drawing_instructions);
					}

					// add to stream
					stream_data.push({ entity_id: nearby_entity.id, entity_data: entity_data });

				}

				//send collected entities data to the client
				if(stream_data.length > 0) {
					this.socket.emit('entity_data', stream_data);
				}

				break;


				// the user clicked on the ground: go there
				case "click_world":

				this.API.moveEntity(this.entity_id, data.click_position, CLIENT_MOVE_SPEED);

				break;

				// inspector panel request
				// we send back to the socket the contents of our block
				case "inspector_panel":
				data.socket.emit("inspector_panel_block", {
					elements: [
						this.API.outputPlainText("Socket id: "+this.socket.id),
						this.API.outputTextField("Display name: ", "client_display_name", this.display_name)
					],
					rank: this.rank
				});
				break;

				case "inspector_panel_change":
				if(data.client_display_name) {
					this.API.setChanged(this.entity_id);
					this.display_name = data.client_display_name;
				}
				break;

				// handle incoming commands
				// temp: simply display a speech bubble
				case "command_line_entered":
				this.speech_stack.push(data.command);
				this.API.setChanged(this.entity_id);
				break;
			}

		};

		// override render function
		module.appendDrawingInstructions = function(instructions_list) {

			// display name over entity
			this.API.drawTextBubble(instructions_list, 0, 3, 0, 0, 0, 0, 0.5, this.display_name);

			// output speech bubbles and clear stack
			for(var i=0; i<this.speech_stack.length; i++) {
				this.API.fireSpeechBubble(instructions_list, this.speech_stack[i]);
			}
			this.speech_stack = [];

		};

		module.socket = null;		// this must be set manually!

		// for each entity that we sent to the client, save its state counter and geometry state counter
		// this way, we know if the entity data must be resent or not!
		// key: entity_id, value: { state_counter: X }
		module.tracked_entities_collection = {};

		module.last_refresh_time = 0;

		module.display_name = "bob";

		// this is a stack of speech lines that we need to output
		module.speech_stack = [];

	},
	
	[]		// registered channels
);

};