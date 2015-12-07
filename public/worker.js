"use strict";

importScripts('lib/socket.io.js');

var socket = io();

// this is a collection of geometry blocks received by the worker
// these blocks are received in bulks and must be passed on by one to the main thread
// the blocks ids are stored in another array
var geometry_blocks_collection = new Array(100);
var geometry_blocks_ids = new Array(100);

// the server just sent us new geometry
// the worker will break down this data into small arrays, and pass them to the main thread
socket.on('geometry_data', function(msg) {

	console.log("[WORKER] received "+msg.blocks.length+" block");
	var index, block, i;

	// for each block, add/replace it in the collection
	for(i=0; i<msg.blocks.length; i++) {
		block = msg.blocks[i];

		// 1. look for the id in the existing collection
		index = geometry_blocks_ids.indexOf(block.id);

		// 2. id not found: look for the first empty slot
		if(index == -1) {
			var j;
			for(j=0; j<geometry_blocks_ids.length; j++) {
				if(!geometry_blocks_ids[j]) {
					index = j;
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
		geometry_blocks_collection[index] = block;

	}
  
});

// this is the recurring job that transmits geometry to the main thread one block at a time
function streamGeometry() {

	// let's find a block to transmit
	var block, index, i;
	for(i=0; i<geometry_blocks_collection.length; i++) {
		if(geometry_blocks_collection[i] != null) {
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

setTimeout(streamGeometry, 0);