// this object handles dispatching geometry data received from the server into several meshes
// split geometry into as many meshes as necessary
// handles pickable/transparent meshes too


// this is the same as the server parameter
var GEOMETRYBLOCK_VERTEX_COUNT = 300;
var GEOMETRYBLOCK_TRIANGLE_COUNT = 100;


function GeometryHandler() {

	// temp: static mesh setup
	this.blocks_count = 100;
	this.block_vertex_count = GEOMETRYBLOCK_VERTEX_COUNT * this.blocks_count;
	this.block_triangle_count = GEOMETRYBLOCK_TRIANGLE_COUNT * this.blocks_count;

	// this is a collection of entities that we maintain
	// as geometry blocks are expressed in local space
	// key is entity id and value is {position, target_position, speed}
	// once the entity state is stable (ie not moving), we delete the entry
	this.entities_collection = {};

	// static mesh allocation table:
	// this array holds the id of blocks that have been injected into the static mesh
	// each item in the array is {block_id, entity_id, target_positions, target_colors}
	this.static_mesh_allocation = new Array(this.blocks_count);



	// todo: split this into several meshes (according to device?)
	this.static_mesh = new BABYLON.Mesh('static_mesh', scene);
	this.static_positions = new Float32Array(this.block_vertex_count * 3);
	this.static_normals = new Float32Array(this.block_vertex_count * 3);
	this.static_colors = new Float32Array(this.block_vertex_count * 4);
	this.static_indices = new Uint32Array(this.block_triangle_count * 3);

	// pickable & always visible!
	this.static_mesh.isPickable = false;
	this.static_mesh.alwaysSelectAsActiveMesh = true;

	// init the geometry buffers for further use
	this.static_mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, this.static_positions, true);
	this.static_mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, this.static_normals, true);
	this.static_mesh.setVerticesData(BABYLON.VertexBuffer.ColorKind, this.static_colors, true);
	this.static_mesh.setIndices(this.static_indices);

	// static material
	this.static_material = new BABYLON.StandardMaterial("global", scene);
	this.static_material.diffuseColor = new BABYLON.Color3(1, 1, 1);
	this.static_material.specularColor = new BABYLON.Color3(0, 0, 0);
	this.static_material.backFaceCulling = false;
	this.static_mesh.material = this.static_material;



	// pickable meshes must be separate!
	var pickable_meshes = [];

}

// this function must be called each frame
// it updates the global static mesh according to the geometry blocks injected
GeometryHandler.prototype.update = function() {

	this.updateGeometryBlocks();
	this.refreshStaticMesh();

};

// adds new entity data, to be used for rendering
GeometryHandler.prototype.addEntityState = function(entity_id, position, target_pos, speed) {
	this.entities_collection[entity_id] = {
		position: new BABYLON.Vector3(position[0], position[1], position[2]),
		target_position: new BABYLON.Vector3(target_pos[0], target_pos[1], target_pos[2]),
		speed: speed
	};
};

// geometry block is allocated in the static mesh
GeometryHandler.prototype.injectGeometryBlock = function(geometry_block) {

	var first_empty;
	var found_index;
	var j;
	var slot;

	//var found = 0;
	//var new_blocks = 0;

	// scan mesh allocation
	first_empty = -1;
	found_index = -1;
	for(j=0; j<this.static_mesh_allocation.length; j++) {
		if(first_empty == -1 && !this.static_mesh_allocation[j]) { first_empty = j; }
		if(!this.static_mesh_allocation[j]) { continue; }
		if(this.static_mesh_allocation[j].block_id == geometry_block.id) { found_index = j; break; }
	}

	// if already there: replace data
	if(found_index != -1) {
		//this.injectGeometryBlockAt(geometry_block, found_index);
		//found++;
		slot = found_index;
	}
	// if not, use first empty slot
	else if(first_empty != -1) {
		//this.injectGeometryBlockAt(geometry_block, first_empty);
		//new_blocks++;
		slot = first_empty;
	}
	// if no empty slot, well... fuck
	else {
		console.log('could not allocate geometry block... not enough space');
		return;
	}

	//console.log('injected '+new_blocks+' new blocks and '+found+' existing');
	//this.refreshStaticMesh();

	// let's register the mesh in the allocation table
	this.static_mesh_allocation[slot] = {
		block_id: geometry_block.id,
		entity_id: geometry_block.entity_id,
		target_positions: geometry_block.positions,
		target_colors: geometry_block.colors
	};

	var base_vertex = slot * GEOMETRYBLOCK_VERTEX_COUNT;
	var base_index = slot * GEOMETRYBLOCK_TRIANGLE_COUNT;
	var i;
	
	// add normals only (these will not change over time)
	for(i=0; i<GEOMETRYBLOCK_VERTEX_COUNT; i++) {

		// this.static_positions[base_vertex * 3 + i * 3] = geometry_block.positions[i * 3];
		// this.static_positions[base_vertex * 3 + i * 3 + 1] = geometry_block.positions[i * 3 + 1];
		// this.static_positions[base_vertex * 3 + i * 3 + 2] = geometry_block.positions[i * 3 + 2];
		
		this.static_normals[base_vertex * 3 + i * 3] = geometry_block.normals[i * 3];
		this.static_normals[base_vertex * 3 + i * 3 + 1] = geometry_block.normals[i * 3 + 1];
		this.static_normals[base_vertex * 3 + i * 3 + 2] = geometry_block.normals[i * 3 + 2];

		// this.static_colors[base_vertex * 4 + i * 4] = geometry_block.colors[i * 4];
		// this.static_colors[base_vertex * 4 + i * 4 + 1] = geometry_block.colors[i * 4 + 1];
		// this.static_colors[base_vertex * 4 + i * 4 + 2] = geometry_block.colors[i * 4 + 2];
		// this.static_colors[base_vertex * 4 + i * 4 + 3] = geometry_block.colors[i * 4 + 3];
		
	}

	// adding indices in the static mesh
	for(i=0; i<GEOMETRYBLOCK_TRIANGLE_COUNT; i++) {
		this.static_indices[base_index * 3 + i * 3] = base_vertex + geometry_block.indices[i * 3];
		this.static_indices[base_index * 3 + i * 3 + 1] = base_vertex + geometry_block.indices[i * 3 + 1];
		this.static_indices[base_index * 3 + i * 3 + 2] = base_vertex + geometry_block.indices[i * 3 + 2];
	}

};

// since geometry blocks are in local space, they need to be rewritten if there's a change
// in the entity state
GeometryHandler.prototype.updateGeometryBlocks = function() {

	var i, j;
	var base_vertex;
	var entity_state;
	var block;

	// update blocks
	for(i=0; i<this.static_mesh_allocation.length; i++) {

		block = this.static_mesh_allocation[i];

		// no block: skip
		if(!block) { continue; }

		// if there is no entity state for this block, skip
		if(!this.entities_collection[block.entity_id]) { continue; }

		// there's an entity state: draw the geometry in the buffer
		entity_state = this.entities_collection[block.entity_id];
		base_vertex = i * GEOMETRYBLOCK_VERTEX_COUNT;
		
		// add normals only (these will not change over time)
		for(j=0; j<GEOMETRYBLOCK_VERTEX_COUNT; j++) {

			this.static_positions[base_vertex * 3 + j * 3] =
				entity_state.position.x + block.target_positions[j * 3];
			this.static_positions[base_vertex * 3 + j * 3 + 1] =
				entity_state.position.y + block.target_positions[j * 3 + 1];
			this.static_positions[base_vertex * 3 + j * 3 + 2] =
				entity_state.position.z + block.target_positions[j * 3 + 2];

			this.static_colors[base_vertex * 4 + j * 4] = block.target_colors[j * 4];
			this.static_colors[base_vertex * 4 + j * 4 + 1] = block.target_colors[j * 4 + 1];
			this.static_colors[base_vertex * 4 + j * 4 + 2] = block.target_colors[j * 4 + 2];
			this.static_colors[base_vertex * 4 + j * 4 + 3] = block.target_colors[j * 4 + 3];
			
		}
	}

	// update entity states
	// TEMP: no interpolation
	for(var entity_id in this.entities_collection) {

		entity_state = this.entities_collection[entity_id];

		// update entity position
		//entity_state.position = entity_state.target_position;
		//delete this.entities_collection[entity_id];
	}

};

// refreshes the static mesh buffers
GeometryHandler.prototype.refreshStaticMesh = function() {
	this.static_mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, this.static_positions);
	this.static_mesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind, this.static_normals);
	this.static_mesh.updateVerticesData(BABYLON.VertexBuffer.ColorKind, this.static_colors);
	this.static_mesh.setIndices(this.static_indices);
};

