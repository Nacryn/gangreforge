"use strict";

importScripts('lib/socket.io.js');

var socket = io();

// this is a collection of geometry blocks received by the worker
// these blocks are received in bulks and must be streamed one by one to the main thread
// the blocks ids are stored in another array
var geometry_blocks_collection = new Array(100);
var geometry_blocks_ids = new Array(100);

// the server just sent us new geometry and entity states in an array
// the worker will break down this data into small arrays, and pass them to the main thread
socket.on('rendering_data', function(msg) {

	console.log("[WORKER] received data from "+msg.length+" entities");
	var index, block, i, j, k;
	var entity_states = [];
	var entity_state;

	// for each entity, concatenate entity states add/replace its blocks in the collection
	for(i=0; i<msg.length; i++) {

		// add this entity state
		if(msg[i].state) {
			entity_state = {
				entity_id: msg[i].entity_id,
				state: msg[i].state
			};
			entity_states.push(msg[i].state);
		}

		// no geometry blocks for this entity: skip!
		if(!msg[i].blocks) { continue; }

		for(j=0; j<msg[i].blocks.length; j++) {

			block = msg[i].blocks[j];

			// 1. look for the id in the existing collection
			index = geometry_blocks_ids.indexOf(block.id);

			// 2. id not found: look for the first empty slot
			if(index == -1) {
				for(k=0; k<geometry_blocks_ids.length; k++) {
					if(!geometry_blocks_ids[k]) {
						index = k;
						geometry_blocks_ids[index] = block.id;
						break;
					}
				}
			}

			// 3. empty slot not found: skip
			if(index == -1) {
				continue;
			}

			//console.log("stored 1 block");

			// store block in collection
			block.entity_id = msg[i].entity_id;
			geometry_blocks_collection[index] = block;

		}

	}
  
});

// this is the recurring job that transmits geometry to the main thread one block at a time
function streamGeometry() {

	// let's find a block to transmit
	var block, index, i;
	for(i=0; i<geometry_blocks_collection.length; i++) {
		if(geometry_blocks_collection[i]) {
			block = geometry_blocks_collection[i];
			index = i;
			break;
		}
	}

	if(block) {

		postMessage({
		  	type: "geometry_block",
		  	block: block
		});
		console.log("[WORKER] streamed 1 block");

		// remove block of collection
		geometry_blocks_ids[index] = null;
		geometry_blocks_collection[index] = null;
	}


	setTimeout(streamGeometry, 10);

}

// launch the streaming job
setTimeout(streamGeometry, 0);



// MESSAGE HANDLER
// mainly used to pass the man thread messages to the socket
onmessage = function(msg) {

	if(msg.data.type == 'dispatch_message') {

		//console.log('[WORKER] dispatching message');

		if(msg.data.entity_id) {
			socket.emit('dispatch_message', {
				name: msg.data.name,
				entity_id: msg.data.entity_id,
				data: msg.data.data
			});
		} else {
			socket.emit('dispatch_message', {
				name: msg.data.name,
				data: msg.data.data
			});
		}
	}

};