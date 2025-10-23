/**
 * Jednoduchý STL Parser - minimální implementace pro základní ASCII STL soubory
 */

function SimpleSTLLoader() {
    this.manager = THREE.DefaultLoadingManager;
}

SimpleSTLLoader.prototype = {
    constructor: SimpleSTLLoader,

    parse: function(data) {
        // Převést ArrayBuffer na string pokud je potřeba
        let text;
        if (data instanceof ArrayBuffer) {
            text = new TextDecoder().decode(data);
        } else {
            text = data;
        }

        // Základní regex pro parsování ASCII STL
        const patternFloat = /[\s]+([+-]?(?:\d*)(?:\.\d*)?(?:[eE][+-]?\d+)?)/;
        const patternVertex = new RegExp('vertex' + patternFloat.source + patternFloat.source + patternFloat.source, 'g');
        
        const vertices = [];
        const normals = [];
        
        // Najít všechny vertex data
        let match;
        while ((match = patternVertex.exec(text)) !== null) {
            vertices.push(
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3])
            );
        }

        // Vytvořit geometrii
        const geometry = new THREE.BufferGeometry();
        
        if (vertices.length === 0) {
            throw new Error('Žádná vertex data nebyla nalezena v STL souboru');
        }
        
        // Nastavit vertex pozice
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        // Automaticky vypočítat normály
        geometry.computeVertexNormals();
        
        return geometry;
    }
};

// Nastavit globálně
THREE.STLLoader = SimpleSTLLoader;