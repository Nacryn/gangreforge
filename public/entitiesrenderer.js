
function EntitiesRenderer() {

	// this is a collection of entities that we render
	// each entity has a transform and a set of drawing instructions
	// also each entity has a mesh associated to it
	this.entities_collection = {};

	// this is the default rendering material
	this.default_material = new BABYLON.StandardMaterial("default", scene);
	this.default_material.diffuseColor = new BABYLON.Color3(1, 1, 1);
	this.default_material.specularColor = new BABYLON.Color3(0, 0, 0);
	this.default_material.backFaceCulling = false;

	// material used for hovered stuff
	this.hovered_material = new BABYLON.StandardMaterial("hovered", scene);
	this.hovered_material.diffuseColor = new BABYLON.Color3(1, 1, 1);
	this.hovered_material.specularColor = new BABYLON.Color3(0, 0, 0);
	this.hovered_material.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
	this.hovered_material.backFaceCulling = false;
	this.hovered_material.useEmissiveAsIllumination = true;
}

// this function must be called each frame
EntitiesRenderer.prototype.update = function() {

	this.updateEntitiesMeshes();
	TextBubble.UpdateAll();

};

// adds/refresh entity data, to be used for rendering
EntitiesRenderer.prototype.injectEntityData = function(entity_id, entity_data) {
	if(!this.entities_collection[entity_id]) {
		this.entities_collection[entity_id] = {
			mesh: new BABYLON.Mesh('entity_'+entity_id, scene),
			positions: new Float32Array(900),
			normals: new Float32Array(900),
			colors: new Float32Array(900),
			indices: new Uint8Array(300),
			position: new BABYLON.Vector3(entity_data.position[0], entity_data.position[1], entity_data.position[2]),
			velocity: new BABYLON.Vector3(0, 0, 0)
		};
	}
	//position: new BABYLON.Vector3(entity_data.position[0], entity_data.position[1], entity_data.position[2]),
	this.entities_collection[entity_id].target_position = new BABYLON.Vector3(entity_data.target_position[0], entity_data.target_position[1], entity_data.target_position[2]);
	this.entities_collection[entity_id].speed = entity_data.speed;
	this.entities_collection[entity_id].drawing_instructions = entity_data.drawing_instructions;
	this.entities_collection[entity_id].must_redraw = true;
	if(entity_data.focus) { camera.target = this.entities_collection[entity_id].mesh; }

	this.entities_collection[entity_id].mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, this.entities_collection[entity_id].positions, true);
	this.entities_collection[entity_id].mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, this.entities_collection[entity_id].normals, true);
	this.entities_collection[entity_id].mesh.setVerticesData(BABYLON.VertexBuffer.ColorKind, this.entities_collection[entity_id].colors, true);
	this.entities_collection[entity_id].mesh.setIndices(this.entities_collection[entity_id].indices);
	this.entities_collection[entity_id].mesh.material = this.default_material;
	this.entities_collection[entity_id].mesh.entity_id = entity_id;
};

// update each entities mesh according to its drawing instructions, and set position
EntitiesRenderer.prototype.updateEntitiesMeshes = function() {

	var entity;
	var i;
	var diff = new BABYLON.Vector3(), diff_len, step_dist;
	var vertex_offset, index_offset, result;

	for(var entity_id in this.entities_collection) {

		entity = this.entities_collection[entity_id];

		// update velocity vector based on speed & target pos
		entity.target_position.subtractToRef(entity.position, diff);
		diff_len = diff.length();
		step_dist = delta_time * entity.speed;
		if(diff_len > step_dist) {
			diff.normalize().scaleInPlace(step_dist);
		}

		entity.velocity = BABYLON.Vector3.Lerp(entity.velocity, diff, 0.6);
		entity.position.addInPlace(entity.velocity);
		//entity.velocity.scaleInPlace(0.9);
		entity.mesh.position = entity.position;

		// skip if...
		if(!entity.drawing_instructions) { continue; }
		if(!scene.isActiveMesh(entity.mesh)) { continue; }
		if(!entity.must_redraw) { continue; }

		// update buffers
		vertex_offset = 0;
		index_offset = 0;
		for(i=0; i<entity.drawing_instructions.length; i++) {
			result = this.applyDrawInstruction(
				entity.drawing_instructions[i],
				entity.mesh,
				entity.positions, entity.normals, entity.colors, entity.indices,
				vertex_offset, index_offset
			);
			vertex_offset += result.vertex_count;
			index_offset += result.triangle_count;
		}

		// update mesh with buffers
		entity.mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, entity.positions, true);
		entity.mesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind, entity.normals, true);
		entity.mesh.updateVerticesData(BABYLON.VertexBuffer.ColorKind, entity.colors, true);
		entity.mesh.setIndices(entity.indices);

		entity.must_redraw = false;
	}

};



// *****
// DRAWING INSTRUCTIONS
// *****


// these are drawing instructions which can be received from the server
// note: some parameters can be numeric or string, in which case we need to evaluate them!! (TODO)
var DRAW_NONE 			= 0;	// not used
var DRAW_BOX 			= 1;	// posX | posY | posZ | rotX | rotY | rotZ | sizeX | sizeY | sizeZ | colR | colG | colB
var DRAW_DISC 			= 2;	// posX | posY | posZ | rotX | rotY | rotZ | radius | colR | colG | colB
var DRAW_SPHERE 		= 3;	// posX | posY | posZ | radius | colR | colG | colB
var DRAW_SPEECHBUBBLE 	= 4;	// posX | posY | posZ | content(string) - this is fire&forget, ie must only be sent once
var DRAW_CLICKBUBBLE 	= 5;	// posX | posY | posZ | colR | colG | colB | message(string) | content(string) - will sent back the message when clicked
var DRAW_TEXTBUBBLE 	= 6;	// posX | posY | posZ | colR | colG | colB | content(string) - not clickable


// this function injects geometry data into an existing array, extending it if necessary
// pos, nor, col and ind are the geometry buffers of the current mesh
// v_off is the vertex offset and t_off is the triangle offset (index buffer)
// returns an object holding vertex_count and triangle_count
// some drawing instructions require additional meshes (text bubbles etc.):
// these are made with TextBubble objects, parented to the supplied mesh

EntitiesRenderer.prototype.applyDrawInstruction = function(params, mesh, pos, nor, col, ind, v_off, t_off) {

	var v = 0;		// current vertex
	var t = 0;		// current triangle
	var i, j;
	var x, y, z, r, g, b, rx, ry, rz, sx, sy, sz, rad;
	var result = { vertex_count: 0, triangle_count: 0 };

	switch(params[0]) {

		case DRAW_NONE: break;

		case DRAW_BOX:

		// 24 vertices
		v = v_off*3;
		x = params[1]; y = params[2]; z = params[3];
		rx = params[4]; ry = params[5]; rz = params[6];
		sx = params[7]; sy = params[8]; sz = params[9];
		pos[v+0]=-sx/2+x; nor[v+0]= 0; pos[v+1]= sy/2+y; nor[v+1]= 1; pos[v+2]= sz/2+z; nor[v+2]= 0; v+=3;
		pos[v+0]=-sx/2+x; nor[v+0]= 0; pos[v+1]= sy/2+y; nor[v+1]= 1; pos[v+2]=-sz/2+z; nor[v+2]= 0; v+=3;
		pos[v+0]= sx/2+x; nor[v+0]= 0; pos[v+1]= sy/2+y; nor[v+1]= 1; pos[v+2]=-sz/2+z; nor[v+2]= 0; v+=3;
		pos[v+0]= sx/2+x; nor[v+0]= 0; pos[v+1]= sy/2+y; nor[v+1]= 1; pos[v+2]= sz/2+z; nor[v+2]= 0; v+=3;
		pos[v+0]= sx/2+x; nor[v+0]= 0; pos[v+1]=-sy/2+y; nor[v+1]=-1; pos[v+2]= sz/2+z; nor[v+2]= 0; v+=3;
		pos[v+0]= sx/2+x; nor[v+0]= 0; pos[v+1]=-sy/2+y; nor[v+1]=-1; pos[v+2]=-sz/2+z; nor[v+2]= 0; v+=3;
		pos[v+0]=-sx/2+x; nor[v+0]= 0; pos[v+1]=-sy/2+y; nor[v+1]=-1; pos[v+2]=-sz/2+z; nor[v+2]= 0; v+=3;
		pos[v+0]=-sx/2+x; nor[v+0]= 0; pos[v+1]=-sy/2+y; nor[v+1]=-1; pos[v+2]= sz/2+z; nor[v+2]= 0; v+=3;
		pos[v+0]= sx/2+x; nor[v+0]= 1; pos[v+1]= sy/2+y; nor[v+1]= 0; pos[v+2]= sz/2+z; nor[v+2]= 0; v+=3;
		pos[v+0]= sx/2+x; nor[v+0]= 1; pos[v+1]= sy/2+y; nor[v+1]= 0; pos[v+2]=-sz/2+z; nor[v+2]= 0; v+=3;
		pos[v+0]= sx/2+x; nor[v+0]= 1; pos[v+1]=-sy/2+y; nor[v+1]= 0; pos[v+2]=-sz/2+z; nor[v+2]= 0; v+=3;
		pos[v+0]= sx/2+x; nor[v+0]= 1; pos[v+1]=-sy/2+y; nor[v+1]= 0; pos[v+2]= sz/2+z; nor[v+2]= 0; v+=3;
		pos[v+0]=-sx/2+x; nor[v+0]=-1; pos[v+1]=-sy/2+y; nor[v+1]= 0; pos[v+2]= sz/2+z; nor[v+2]= 0; v+=3;
		pos[v+0]=-sx/2+x; nor[v+0]=-1; pos[v+1]=-sy/2+y; nor[v+1]= 0; pos[v+2]=-sz/2+z; nor[v+2]= 0; v+=3;
		pos[v+0]=-sx/2+x; nor[v+0]=-1; pos[v+1]= sy/2+y; nor[v+1]= 0; pos[v+2]=-sz/2+z; nor[v+2]= 0; v+=3;
		pos[v+0]=-sx/2+x; nor[v+0]=-1; pos[v+1]= sy/2+y; nor[v+1]= 0; pos[v+2]= sz/2+z; nor[v+2]= 0; v+=3;
		pos[v+0]= sx/2+x; nor[v+0]= 0; pos[v+1]= sy/2+y; nor[v+1]= 0; pos[v+2]= sz/2+z; nor[v+2]= 1; v+=3;
		pos[v+0]= sx/2+x; nor[v+0]= 0; pos[v+1]=-sy/2+y; nor[v+1]= 0; pos[v+2]= sz/2+z; nor[v+2]= 1; v+=3;
		pos[v+0]=-sx/2+x; nor[v+0]= 0; pos[v+1]=-sy/2+y; nor[v+1]= 0; pos[v+2]= sz/2+z; nor[v+2]= 1; v+=3;
		pos[v+0]=-sx/2+x; nor[v+0]= 0; pos[v+1]= sy/2+y; nor[v+1]= 0; pos[v+2]= sz/2+z; nor[v+2]= 1; v+=3;
		pos[v+0]=-sx/2+x; nor[v+0]= 0; pos[v+1]= sy/2+y; nor[v+1]= 0; pos[v+2]=-sz/2+z; nor[v+2]=-1; v+=3;
		pos[v+0]=-sx/2+x; nor[v+0]= 0; pos[v+1]=-sy/2+y; nor[v+1]= 0; pos[v+2]=-sz/2+z; nor[v+2]=-1; v+=3;
		pos[v+0]= sx/2+x; nor[v+0]= 0; pos[v+1]=-sy/2+y; nor[v+1]= 0; pos[v+2]=-sz/2+z; nor[v+2]=-1; v+=3;
		pos[v+0]= sx/2+x; nor[v+0]= 0; pos[v+1]= sy/2+y; nor[v+1]= 0; pos[v+2]=-sz/2+z; nor[v+2]=-1;

		for(i=0; i<24; i++) {
			col[v_off*4 + i*4 + 0] = params[10];
			col[v_off*4 + i*4 + 1] = params[11];
			col[v_off*4 + i*4 + 2] = params[12];
			col[v_off*4 + i*4 + 3] = 1;
		}

		// 12 triangles
		t = t_off*3;
		ind[t+0]=v_off+ 0;	ind[t+1]=v_off+ 1;	ind[t+2]=v_off+ 2;	t+=3;
		ind[t+0]=v_off+ 2;	ind[t+1]=v_off+ 3;	ind[t+2]=v_off+ 0;	t+=3;
		ind[t+0]=v_off+ 4;	ind[t+1]=v_off+ 5;	ind[t+2]=v_off+ 6;	t+=3;
		ind[t+0]=v_off+ 6;	ind[t+1]=v_off+ 7;	ind[t+2]=v_off+ 4;	t+=3;
		ind[t+0]=v_off+ 8;	ind[t+1]=v_off+ 9;	ind[t+2]=v_off+10;	t+=3;
		ind[t+0]=v_off+10;	ind[t+1]=v_off+11;	ind[t+2]=v_off+ 8;	t+=3;
		ind[t+0]=v_off+12;	ind[t+1]=v_off+13;	ind[t+2]=v_off+14;	t+=3;
		ind[t+0]=v_off+14;	ind[t+1]=v_off+15;	ind[t+2]=v_off+12;	t+=3;
		ind[t+0]=v_off+16;	ind[t+1]=v_off+17;	ind[t+2]=v_off+18;	t+=3;
		ind[t+0]=v_off+18;	ind[t+1]=v_off+19;	ind[t+2]=v_off+16;	t+=3;
		ind[t+0]=v_off+20;	ind[t+1]=v_off+21;	ind[t+2]=v_off+22;	t+=3;
		ind[t+0]=v_off+22;	ind[t+1]=v_off+23;	ind[t+2]=v_off+20;

		result.vertex_count = 24; result.triangle_count = 12;

		break;

		case DRAW_DISC:

		break;

		case DRAW_SPHERE:

		break;

		case DRAW_SPEECHBUBBLE:

		break;

		case DRAW_CLICKBUBBLE:

		break;

		case DRAW_TEXTBUBBLE:
		TextBubble.CreateBubble(mesh,
			new BABYLON.Vector3(params[1], params[2], params[3]),
			new BABYLON.Color4(params[4], params[5], params[6], params[7]),
			params[8],
			0,
			false,
			false,
			false
		);
		break;

	}

	return result;

};



// TEXT BUBBLES
// used for speech, display names over client, click bubbles...
// each one is made of a separate mesh with a dynamic texture
// text bubbles have their own update function, their own pool and static array
// NOTE: to create a bubble, use TextBubble.CreateBubble()

function TextBubble() {

}

// returns true if parameters have changed and a refresh is needed
TextBubble.prototype.hasChanged = function() {
	if(this.content != this.prev_content) { return true; }
	if(this.color != this.prev_color) { return true; }
	if(this.floating != this.prev_floating) { return true; }
	if(this.tail != this.prev_tail) { return true; }
	if(this.pickable != this.prev_pickable) { return true; }
	return false;
};

// rebuilds mesh vertices
TextBubble.prototype.buildMesh = function() {

	if(!this.mesh) {
		//this.mesh = new BABYLON.Mesh('text_bubble', scene);
		this.mesh = BABYLON.Mesh.CreatePlane('text_bubble', 4, scene);
		this.mesh.parent = this.parent_mesh;
		this.mesh.position = this.position;
		this.mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;

		this.mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, []);
		this.mesh.setVerticesData(BABYLON.VertexBuffer.UVKind, []);
		this.mesh.setIndices([]);
	}

	this.mesh.isPickable = this.pickable;
	this.mesh.position = this.position;
	this.mesh.isVisible = true;

	if(!this.hasChanged() && !this.floating) { return; }

	// actual mesh building
	var width = 3.5;
	var line_height = 1;
	var texture_size = 4;
	var positions = [];
	var uvs = [];
	var indices = [];
	function addVertex(x, y) {
		positions.push(x, y, 0);
		uvs.push(0.5 + x/texture_size, 0.5 + y/texture_size);
	}

	if(!this.floating) {
		/*
		positions = [
			-width/2, line_height/2, 0,
			-width/2, -line_height/2, 0,
			width/2, -line_height/2, 0,
			width/2, line_height/2, 0,
		];
		uvs = [
			0, 0,
			0, 1,
			1, 1,
			1, 0
		];
		*/
		addVertex(-width/2, line_height/2, 0);
		addVertex(-width/2, -line_height/2, 0);
		addVertex(width/2, -line_height/2, 0);
		addVertex(width/2, line_height/2, 0);
		indices = [
			0, 1, 2,
			2, 3, 0
		];
	} else {
	}

	this.mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions, true);
	this.mesh.setVerticesData(BABYLON.VertexBuffer.UVKind, uvs, true);
	this.mesh.setIndices(indices);
	//console.log('refreshed text bubble');
};

// redraws dynamic texture
TextBubble.prototype.drawCanvas = function() {

	var texture_size = 256;

	if(!this.canvas) {
		this.canvas = new BABYLON.DynamicTexture("text_bubble_tex", texture_size, scene);
		//this.canvas.hasAlpha = true;
		var mat = new BABYLON.StandardMaterial("text_bubble_mat", scene);
		mat.diffuseTexture = this.canvas;
		mat.opacityTexture = this.canvas;
		mat.emissiveColor = new BABYLON.Color3(1,1,1);
		this.mesh.material = mat;
	}

	if(!this.hasChanged() && !this.floating) { return; }

	var context = this.canvas.getContext();
	context.strokeStyle = color4ToCSS(this.color);
	context.fillStyle = color4ToCSS(this.color);

	// params
	var text_size = 24;

	// clear
	context.clearRect(0, 0, texture_size, texture_size);

	// background
	context.fillRect(0, 0, texture_size, texture_size);

	// text written in center of the bubble
	context.fillStyle = "white";
	context.font = "normal "+text_size+"px Arial";
	context.textAlign = 'center';
	context.fillText(this.content, texture_size/2, texture_size/2+text_size*0.35);

	this.canvas.update();
};

TextBubble.prototype.update = function() {

	// if bubble inactive: leave
	if(!this.active) {
		//this.mesh.isVisible = false;
		return;
	}

	// rebuild mesh
	this.buildMesh();
	this.drawCanvas();

	// update lifetime
	if(this.remaining_time > 0) {
		this.remaining_time -= delta_time;
	} else {
		this.active = false;
	}

	// save parameters
	this.prev_content = this.content;
	this.prev_color = this.color;
	this.prev_floating = this.floating;
	this.prev_tail = this.tail;
	this.prev_pickable = this.pickable;
};

// static stuff

// NOTE: use this instead of new TextBubble()
// position is a Vector3, color is a Color4, content is a string
// lifetime is in sec (-1 for infinite)
// if floating is true, the bubble will have a floating effect
// if tail is true, the bubble will have a tail pointing at the parent mesh origin
TextBubble.CreateBubble = function(parent_mesh, position, color, content, lifetime, floating, tail, pickable) {

	var bubble = null;

	// look for a bubble that has no lifetime
	for(var i=0; i<TextBubble.bubbles_list.length; i++) {
		if(TextBubble.bubbles_list[i].remaining_time <= 0) {
			bubble = TextBubble.bubbles_list[i];
			break;
		}
	}

	// no existing bubble found: create a new one
	if(!bubble) {
		bubble = new TextBubble();
		TextBubble.bubbles_list.push(bubble);
	}

	// init bubble
	bubble.active = true;
	bubble.parent_mesh = parent_mesh;
	bubble.remaining_time = lifetime;
	bubble.floating = floating;
	bubble.position = position;
	bubble.color = color;
	bubble.content = content;
	bubble.tail = tail;
	bubble.pickable = pickable;
};

TextBubble.bubbles_list = [];
TextBubble.mesh_pool = [];

TextBubble.UpdateAll = function() {
	for(var i=0; i<TextBubble.bubbles_list.length; i++) {
		TextBubble.bubbles_list[i].update();
	}
};