/**
 * Kompletní STL Parser - podporuje ASCII i binární STL soubory
 */

function SimpleSTLLoader() {
    this.manager = THREE.DefaultLoadingManager;
}

SimpleSTLLoader.prototype = {
    constructor: SimpleSTLLoader,

    parse: function(data) {
        // Pokud jsou data string, jde o ASCII STL
        if (typeof data === 'string') {
            return this.parseASCII(data);
        } else if (data instanceof ArrayBuffer) {
            // Zkontrolovat, jestli jde o ASCII nebo binární
            return this.isBinary(data) ? this.parseBinary(data) : this.parseASCII(new TextDecoder().decode(data));
        } else {
            throw new Error('Neplatný formát dat');
        }
    },

    // Kontrola, jestli je soubor binární
    isBinary: function(data) {
        const header = new Uint8Array(data, 0, 5);
        const headerStr = String.fromCharCode.apply(null, header);
        
        // Pokud nezačína "solid", je to binární
        if (headerStr !== 'solid') {
            return true;
        }
        
        // Pokud začína "solid", ale má správnou délku pro binární soubor, je to pravděpodobně binární
        const triangleCount = new DataView(data, 80, 4).getUint32(0, true);
        const expectedLength = 80 + 4 + triangleCount * 50;
        
        return data.byteLength === expectedLength;
    },

    // Parsování ASCII STL
    parseASCII: function(data) {
        const patternFloat = /[\s]+([+-]?(?:\d*)(?:\.\d*)?(?:[eE][+-]?\d+)?)/;
        const patternVertex = new RegExp('vertex' + patternFloat.source + patternFloat.source + patternFloat.source, 'g');
        const patternNormal = new RegExp('facet normal' + patternFloat.source + patternFloat.source + patternFloat.source, 'g');
        
        const vertices = [];
        const normals = [];
        
        // Najít všechny normály
        let match;
        const faceNormals = [];
        while ((match = patternNormal.exec(data)) !== null) {
            faceNormals.push([
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3])
            ]);
        }

        // Najít všechny vertex data
        patternVertex.lastIndex = 0;
        while ((match = patternVertex.exec(data)) !== null) {
            vertices.push(
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3])
            );
        }

        // Přiřadit normály k vrcholům (každá plocha má 3 vrcholy)
        for (let i = 0; i < faceNormals.length; i++) {
            const normal = faceNormals[i];
            // Každá plocha má 3 vrcholy, takže normálu přiřadíme 3x
            normals.push(normal[0], normal[1], normal[2]);
            normals.push(normal[0], normal[1], normal[2]);
            normals.push(normal[0], normal[1], normal[2]);
        }

        return this.createGeometry(vertices, normals);
    },

    // Parsování binárního STL
    parseBinary: function(data) {
        const headerLength = 80;
        const dataOffset = 84;
        const faceLength = 50;

        // Počet trojúhelníků
        const triangleCount = new DataView(data, headerLength, 4).getUint32(0, true);
        
        const vertices = [];
        const normals = [];

        for (let i = 0; i < triangleCount; i++) {
            const offset = dataOffset + i * faceLength;
            const view = new DataView(data, offset);

            // Normála plochy (12 bytů)
            const normal = [
                view.getFloat32(0, true),
                view.getFloat32(4, true),
                view.getFloat32(8, true)
            ];

            // Tři vrcholy (36 bytů)
            for (let j = 0; j < 3; j++) {
                const vertexOffset = 12 + j * 12;
                
                // Vrchol
                vertices.push(
                    view.getFloat32(vertexOffset, true),
                    view.getFloat32(vertexOffset + 4, true),
                    view.getFloat32(vertexOffset + 8, true)
                );

                // Normála pro vrchol
                normals.push(normal[0], normal[1], normal[2]);
            }
        }

        return this.createGeometry(vertices, normals);
    },

    // Vytvoření Three.js geometrie
    createGeometry: function(vertices, normals) {
        const geometry = new THREE.BufferGeometry();
        
        if (vertices.length === 0) {
            throw new Error('Žádná vertex data nebyla nalezena v STL souboru');
        }
        
        // Nastavit vertex pozice
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        // Nastavit normály pokud jsou k dispozici
        if (normals.length === vertices.length) {
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        } else {
            // Automaticky vypočítat normály
            geometry.computeVertexNormals();
        }
        
        return geometry;
    }
};

// Nastavit globálně
THREE.STLLoader = SimpleSTLLoader;