/**
 * STLLoader - Standalone verze pro použití bez ES6 modulů
 * Založeno na three.js STLLoader - kompatibilní s Three.js r155
 */

THREE.STLLoader = function(manager) {
    // Inicilaization pro Loader
    this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;
    this.path = '';
    this.resourcePath = '';
    this.requestHeader = {};
    this.withCredentials = false;
};

THREE.STLLoader.prototype = {
    constructor: THREE.STLLoader,

    setPath: function(value) {
        this.path = value;
        return this;
    },

    setResourcePath: function(value) {
        this.resourcePath = value;
        return this;
    },

    setRequestHeader: function(value) {
        this.requestHeader = value;
        return this;
    },

    setWithCredentials: function(value) {
        this.withCredentials = value;
        return this;
    },

    load: function(url, onLoad, onProgress, onError) {
        const scope = this;
        const loader = new THREE.FileLoader(this.manager);
        loader.setPath(this.path);
        loader.setResponseType('arraybuffer');
        loader.setRequestHeader(this.requestHeader);
        loader.setWithCredentials(this.withCredentials);

        loader.load(url, function(text) {
            try {
                onLoad(scope.parse(text));
            } catch (e) {
                if (onError) {
                    onError(e);
                } else {
                    console.error(e);
                }
                scope.manager.itemError(url);
            }
        }, onProgress, onError);
    },

    parse: function(data) {
        function isBinary(data) {
            const reader = new DataView(data);
            const face_size = (32 / 8 * 3) + ((32 / 8 * 3) * 3) + (16 / 8);
            const n_faces = reader.getUint32(80, true);
            const expect = 80 + (32 / 8) + (n_faces * face_size);

            if (expect === reader.byteLength) {
                return true;
            }

            // An ASCII STL data must begin with 'solid ' as the first six bytes.
            // However, ASCII STLs lacking the SPACE after the 'd' are known to be
            // plentiful.  So, check the first 5 bytes for 'solid'.

            // Several encodings, such as UTF-8, precede the text with a BOM of variable
            // length. Search for the solid keyword to avoid BOM issues.
            const fileLength = reader.byteLength;
            for (let index = 0; index < fileLength - 5; index++) {
                // check for the first letter of the "solid" keyword
                if (reader.getUint8(index, false) == 0x73 && reader.getUint8(index + 1, false) == 0x6F && reader.getUint8(index + 2, false) == 0x6C && reader.getUint8(index + 3, false) == 0x69 && reader.getUint8(index + 4, false) == 0x64) {
                    return false;
                }
            }

            return true;
        }

        function parseBinary(data) {
            const reader = new DataView(data);
            const faces = reader.getUint32(80, true);

            let r, g, b, hasColors = false, colors;
            let defaultR, defaultG, defaultB, alpha;

            // process STL header
            // check for default color in header ("COLOR=rgba" sequence).

            for (let index = 0; index < 80 - 10; index++) {
                if ((reader.getUint32(index, false) == 0x434F4C4F /*COLO*/) &&
                    (reader.getUint8(index + 4) == 0x52 /*'R'*/) &&
                    (reader.getUint8(index + 5) == 0x3D /*'='*/)) {

                    hasColors = true;
                    colors = new Float32Array(faces * 3 * 3);

                    defaultR = reader.getUint8(index + 6) / 255;
                    defaultG = reader.getUint8(index + 7) / 255;
                    defaultB = reader.getUint8(index + 8) / 255;
                    alpha = reader.getUint8(index + 9) / 255;
                }
            }

            const dataOffset = 84;
            const faceLength = 12 * 4 + 2;

            const geometry = new THREE.BufferGeometry();

            const vertices = new Float32Array(faces * 3 * 3);
            const normals = new Float32Array(faces * 3 * 3);

            for (let face = 0; face < faces; face++) {
                const start = dataOffset + face * faceLength;
                const normalX = reader.getFloat32(start, true);
                const normalY = reader.getFloat32(start + 4, true);
                const normalZ = reader.getFloat32(start + 8, true);

                if (hasColors) {
                    const packedColor = reader.getUint16(start + 48, true);

                    if ((packedColor & 0x8000) === 0) {
                        // facet has its own unique color
                        r = (packedColor & 0x1F) / 31;
                        g = ((packedColor >> 5) & 0x1F) / 31;
                        b = ((packedColor >> 10) & 0x1F) / 31;
                    } else {
                        r = defaultR;
                        g = defaultG;
                        b = defaultB;
                    }
                }

                for (let i = 1; i <= 3; i++) {
                    const vertexstart = start + i * 12;
                    const componentIdx = (face * 3 * 3) + ((i - 1) * 3);

                    vertices[componentIdx] = reader.getFloat32(vertexstart, true);
                    vertices[componentIdx + 1] = reader.getFloat32(vertexstart + 4, true);
                    vertices[componentIdx + 2] = reader.getFloat32(vertexstart + 8, true);

                    normals[componentIdx] = normalX;
                    normals[componentIdx + 1] = normalY;
                    normals[componentIdx + 2] = normalZ;

                    if (hasColors) {
                        colors[componentIdx] = r;
                        colors[componentIdx + 1] = g;
                        colors[componentIdx + 2] = b;
                    }
                }
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

            if (hasColors) {
                geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                geometry.hasColors = true;
                geometry.alpha = alpha;
            }

            return geometry;
        }

        function parseASCII(data) {
            const geometry = new THREE.BufferGeometry();
            const patternSolid = /solid([\s\S]*?)endsolid/g;
            const patternFace = /facet([\s\S]*?)endfacet/g;
            const patternName = /solid\s(.+)/;
            const patternFloat = /[\s]+([+-]?(?:\d*)(?:\.\d*)?(?:[eE][+-]?\d+)?)/.source;
            const patternVertex = new RegExp('vertex' + patternFloat + patternFloat + patternFloat, 'g');
            const patternNormal = new RegExp('normal' + patternFloat + patternFloat + patternFloat, 'g');

            const vertices = [];
            const normals = [];

            const normal = new THREE.Vector3();

            let result;

            let groupVertexCount = 0;
            let groupCount = 0;
            let startVertex = 0;
            let endVertex = 0;

            while ((result = patternSolid.exec(data)) !== null) {
                startVertex = endVertex;

                const solid = result[0];

                while ((result = patternFace.exec(solid)) !== null) {
                    let vertexCountPerFace = 0;
                    let normalCountPerFace = 0;

                    const face = result[0];

                    while ((result = patternNormal.exec(face)) !== null) {
                        normal.x = parseFloat(result[1]);
                        normal.y = parseFloat(result[2]);
                        normal.z = parseFloat(result[3]);
                        normalCountPerFace++;
                    }

                    while ((result = patternVertex.exec(face)) !== null) {
                        vertices.push(parseFloat(result[1]), parseFloat(result[2]), parseFloat(result[3]));
                        normals.push(normal.x, normal.y, normal.z);
                        vertexCountPerFace++;
                        groupVertexCount++;
                    }

                    // every face have to own ONE valid normal

                    if (normalCountPerFace !== 1) {
                        console.error('THREE.STLLoader: ' + face);
                    }
                }

                endVertex = startVertex + groupVertexCount;

                geometry.addGroup(startVertex, groupVertexCount, groupCount);
                groupCount++;
                groupVertexCount = 0;
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

            return geometry;
        }

        function ensureString(buffer) {
            if (typeof buffer !== 'string') {
                return THREE.LoaderUtils.decodeText(new Uint8Array(buffer));
            }

            return buffer;
        }

        function ensureBinary(buffer) {
            if (typeof buffer === 'string') {
                const array_buffer = new Uint8Array(buffer.length);
                for (let i = 0; i < buffer.length; i++) {
                    array_buffer[i] = buffer.charCodeAt(i) & 0xff; // implicitly assumes little-endian
                }
                return array_buffer.buffer || array_buffer;
            } else {
                return buffer;
            }
        }

        // start
        const binData = ensureBinary(data);

        return isBinary(binData) ? parseBinary(binData) : parseASCII(ensureString(data));
    }
};

// Fallback pro LoaderUtils pokud neexistuje
if (!THREE.LoaderUtils) {
    THREE.LoaderUtils = {
        decodeText: function(array) {
            if (typeof TextDecoder !== 'undefined') {
                return new TextDecoder().decode(array);
            }

            // Avoid the String.fromCharCode.apply(null, array) shortcut, which
            // throws a "maximum call stack size exceeded" error for large arrays.

            let s = '';

            for (let i = 0, il = array.length; i < il; i++) {
                // Implicitly assumes little-endian.
                s += String.fromCharCode(array[i]);
            }

            try {
                // merges multi-byte utf-8 characters.
                return decodeURIComponent(escape(s));
            } catch (e) { // see #16358
                return s;
            }
        }
    };
}

// Fallback pro LoaderUtils pokud neexistuje
if (!THREE.LoaderUtils) {
    THREE.LoaderUtils = {
        decodeText: function(array) {
            if (typeof TextDecoder !== 'undefined') {
                return new TextDecoder().decode(array);
            }

            // Avoid the String.fromCharCode.apply(null, array) shortcut, which
            // throws a "maximum call stack size exceeded" error for large arrays.

            let s = '';

            for (let i = 0, il = array.length; i < il; i++) {
                // Implicitly assumes little-endian.
                s += String.fromCharCode(array[i]);
            }

            try {
                // merges multi-byte utf-8 characters.
                return decodeURIComponent(escape(s));
            } catch (e) { // see #16358
                return s;
            }
        }
    };
}