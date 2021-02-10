function getShader(gl, id) {
	var shaderElement = document.getElementById(id);
	if (shaderElement === null || shaderElement === undefined) {
		return null;
	}

	var str = "";
	var k = shaderElement.firstChild;
	while (k) {
		if (k.nodeType == 3) {
			str += k.textContent;
		}
		k = k.nextSibling;
	}

	var shader = null;
	if (shaderElement.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderElement.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}

	gl.shaderSource(shader, str);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.error('Could not compile shader ' + id);
		console.error(gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}

function getProgramFromShaders(gl, vs, fs) {
	var program = gl.createProgram();
	
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error('Could not link shader program:');
		console.error(gl.getProgramInfoLog(program));
		return null;
	}
	
	program.posLocation = gl.getAttribLocation(program, "Pos");
	gl.enableVertexAttribArray(program.posLocation);
	
	program.uvsLocation = gl.getAttribLocation(program, "UVs");
	gl.enableVertexAttribArray(program.uvsLocation);
	
	program.samplerUniform = gl.getUniformLocation(program, 'uSampler');

	return program;
}

function getVertBufferForData(gl, verts, itemSize)
{
	quadVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexPositionBuffer);

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
	quadVertexPositionBuffer.itemSize = itemSize;
	quadVertexPositionBuffer.numItems = verts.length / itemSize;
	
	return quadVertexPositionBuffer;
}

function makeTexture(gl, format) {
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	const pixelData = new Uint8Array([100, 100, 100, 0, 100, 100, 100, 100, 100, 10, 100, 100, 100, 100, 100, 100]);
	gl.compressedTexImage2D(gl.TEXTURE_2D, 0, format, 4, 4, 0, pixelData);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	return texture;
}

function updateTexture(gl, texture, format, pixelData) {
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.compressedTexImage2D(gl.TEXTURE_2D, 0, format, 4, 4, 0, pixelData);
}

function doGLSetup(gl) {
	var vs = getShader(gl, "main-vs");
	var fs = getShader(gl, "main-fs");
	var prog = getProgramFromShaders(gl, vs, fs);
	
	var verticesPos = [
		-1.0, -1.0,  0.0,
		 1.0, -1.0,  0.0,
		-1.0,  1.0,  0.0,
		 1.0,  1.0,  0.0
	];
	
	var verticesUVs = [
		 0.0, 0.0,
		 1.0, 0.0,
		 0.0, 1.0,
		 1.0, 1.0,
	];
	
	var vertPosBuff = getVertBufferForData(gl, verticesPos, 3);
	var vertUVsBuff = getVertBufferForData(gl, verticesUVs, 2);
	
	var ext = gl.getExtension('WEBGL_compressed_texture_s3tc');
	var texture = makeTexture(gl, ext.COMPRESSED_RGBA_S3TC_DXT3_EXT);
	
	var drawScene = function(gl) {
		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		gl.useProgram(prog);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuff);
		gl.vertexAttribPointer(prog.posLocation, vertPosBuff.itemSize, gl.FLOAT, false, 0, 0);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, vertUVsBuff);
		gl.vertexAttribPointer(prog.uvsLocation, vertUVsBuff.itemSize, gl.FLOAT, false, 0, 0);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.uniform1i(prog.samplerUniform, 0);

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertUVsBuff.numItems);
	};
	
	var updateTex = function(gl, data) {
		updateTexture(gl, texture, ext.COMPRESSED_RGBA_S3TC_DXT3_EXT, data);
	};
	
	return {'draw': drawScene, 'update_tex': updateTex};
}

function initGL(canvas) {
	try {
		gl = canvas.getContext("webgl");
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
		return gl;
	} catch (e) {
		console.error(e);
	}
	if (!gl) {
		console.error("WebGL is not avaiable on your browser!");
	}
	
	return null;
}

window.onload = function(){
	var canv = document.getElementById('main_canvas');
	var gl = initGL(canv);
	if (gl === null) {
		return;
	}
	
	var ext = gl.getExtension('WEBGL_compressed_texture_s3tc');
	if (!ext) {
		console.error('Your browser does not support the WEBGL_compressed_texture_s3tc extension needed for compressed textures');
		return;
	}
	
	var funcObjs = doGLSetup(gl);
	
	var drawSceneFunc = funcObjs['draw'];
	var updateTexFunc = funcObjs['update_tex'];
	
	const pixelData = new Uint8Array([100, 100, 100, 0, 100, 100, 100, 100, 100, 10, 100, 100, 100, 100, 100, 100]);
	
	var allInputValues = [];
	for (var i = 0; i < 16; i++) {
		allInputValues.push(document.getElementById('valueInput' + i));
	}

	var IsInputBeingSetByUser = false;

	var mutationCheckbox = document.getElementById('performMutation');
	
	var UpdateTextureFromPixelData = function() {
		updateTexFunc(gl, pixelData);
		drawSceneFunc(gl);
	};
	
	var UpdateInputValuesFromPixelData = function() {
		var OldIsInputBeingSetByUser = IsInputBeingSetByUser;
		IsInputBeingSetByUser = false;

		for (var i = 0; i < 16; i++) {
			allInputValues[i].value = pixelData[i];
		}

		IsInputBeingSetByUser = OldIsInputBeingSetByUser;
	};
	
	var UpdateAllVisualsFromPixelData = function(){
		UpdateTextureFromPixelData();
		if (!IsInputBeingSetByUser) {
			UpdateInputValuesFromPixelData();
		}
	};
	
	var InputChanged = function() {
		var OldIsInputBeingSetByUser = IsInputBeingSetByUser;
		IsInputBeingSetByUser = true;
		
		for (var i = 0; i < 16; i++) {
			allInputValues[i].value = Math.min(255, Math.max(0, allInputValues[i].value));
			pixelData[i] = allInputValues[i].value;
		}
		
		UpdateTextureFromPixelData();
		
		IsInputBeingSetByUser = OldIsInputBeingSetByUser;
	};
	
	UpdateAllVisualsFromPixelData();
	
	for (var i = 0; i < 16; i++) {
		allInputValues[i].onchange = InputChanged;
	}

	setInterval(function() {
		if (mutationCheckbox.checked)
		{
			pixelData[Math.floor(Math.random() * 16)] = Math.floor(Math.random() * 255);
			UpdateAllVisualsFromPixelData();
		}
	}, 100);
};



