// this object handles dispatching geometry data received from the server into several meshes
// split geometry into as many meshes as necessary
// handles pickable meshes too


// this is the same as the server parameter
var GEOMETRYBLOCK_VERTEX_COUNT = 300;
var GEOMETRYBLOCK_TRIANGLE_COUNT = 100;


function GeometryHandler() {

	// temp: static mesh setup
	this.blocks_count = 100;
	this.block_vertex_count = GEOMETRYBLOCK_VERTEX_COUNT * this.blocks_count;
	this.block_triangle_count = GEOMETRYBLOCK_TRIANGLE_COUNT * this.blocks_count;

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

	// static mesh allocation table: this array holds the id of blocks that have been injected
	// into the static mesh
	this.static_mesh_allocation = new Array(this.blocks_count);


	// pickable meshes must be separate!
	var pickable_meshes = [];

}

GeometryHandler.prototype.injectGeometryBlocks = function(blocks_array) {

	var block;
	var first_empty;
	var found_index;
	var j;

	var found = 0;
	var new_blocks = 0;

	for(var i=0; i<blocks_array.length; i++) {

		block = blocks_array[i];

		// scan mesh allocation
		first_empty = -1;
		found_index = -1;
		for(j=0; j<this.static_mesh_allocation.length; j++) {
			if(first_empty == -1 && !this.static_mesh_allocation[j]) { first_empty = j; }
			if(this.static_mesh_allocation[j] == block.id) { found_index = j; break; }
		}

		// if already there: replace data
		if(found_index != -1) {
			this.injectGeometryBlockAt(block, found_index);
			found++;
		}
		// if not, use first empty slot
		else if(first_empty != -1) {
			this.injectGeometryBlockAt(block, first_empty);
			new_blocks++;
		}
		// if no empty slot, well... fuck
		else {
			console.log('could not allocate geometry block... not enough space');
		}
	}

	//console.log('injected '+new_blocks+' new blocks and '+found+' existing');
	this.refreshStaticMesh();

};

// slot is an index in the static mesh allocation
GeometryHandler.prototype.injectGeometryBlockAt = function(geometry_block, slot) {
	var base_vertex = slot * GEOMETRYBLOCK_VERTEX_COUNT;
	var base_index = slot * GEOMETRYBLOCK_TRIANGLE_COUNT;
	var i;
	
	for(i=0; i<GEOMETRYBLOCK_VERTEX_COUNT; i++) {

		this.static_positions[base_vertex * 3 + i * 3] = geometry_block.positions[i * 3];
		this.static_positions[base_vertex * 3 + i * 3 + 1] = geometry_block.positions[i * 3 + 1];
		this.static_positions[base_vertex * 3 + i * 3 + 2] = geometry_block.positions[i * 3 + 2];
		
		this.static_normals[base_vertex * 3 + i * 3] = geometry_block.normals[i * 3];
		this.static_normals[base_vertex * 3 + i * 3 + 1] = geometry_block.normals[i * 3 + 1];
		this.static_normals[base_vertex * 3 + i * 3 + 2] = geometry_block.normals[i * 3 + 2];

		this.static_colors[base_vertex * 4 + i * 4] = geometry_block.colors[i * 4];
		this.static_colors[base_vertex * 4 + i * 4 + 1] = geometry_block.colors[i * 4 + 1];
		this.static_colors[base_vertex * 4 + i * 4 + 2] = geometry_block.colors[i * 4 + 2];
		this.static_colors[base_vertex * 4 + i * 4 + 3] = geometry_block.colors[i * 4 + 3];
		
	}

	for(i=0; i<GEOMETRYBLOCK_TRIANGLE_COUNT; i++) {
		this.static_indices[base_index * 3 + i * 3] = base_vertex + geometry_block.indices[i * 3];
		this.static_indices[base_index * 3 + i * 3 + 1] = base_vertex + geometry_block.indices[i * 3 + 1];
		this.static_indices[base_index * 3 + i * 3 + 2] = base_vertex + geometry_block.indices[i * 3 + 2];
	}

	this.static_mesh_allocation[slot] = geometry_block.id;
};

// refreshes the static mesh
GeometryHandler.prototype.refreshStaticMesh = function() {
	this.static_mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, this.static_positions);
	this.static_mesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind, this.static_normals);
	this.static_mesh.updateVerticesData(BABYLON.VertexBuffer.ColorKind, this.static_colors);
	this.static_mesh.setIndices(this.static_indices);
};

