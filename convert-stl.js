// Pomocný script pro převod STL souboru na JavaScript data
const fs = require('fs');

function convertSTLToJS(inputFile, outputFile) {
    try {
        const stlContent = fs.readFileSync(inputFile, 'utf8');
        
        // Parsování STL pomocí regex
        const vertexPattern = /vertex\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)/g;
        
        const vertices = [];
        let match;
        
        while ((match = vertexPattern.exec(stlContent)) !== null) {
            vertices.push([
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3])
            ]);
        }
        
        console.log(`Nalezeno ${vertices.length} vrcholů`);
        
        // Vytvoření JavaScript kódu
        const jsContent = `// Předgenerovaná geometrie hubice_B_001.stl
function createHubiceGeometry() {
    const vertices = new Float32Array([
${vertices.map(v => `        ${v[0]}, ${v[1]}, ${v[2]}`).join(',\n')}
    ]);
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    
    return geometry;
}`;
        
        fs.writeFileSync(outputFile, jsContent);
        console.log(`Geometrie uložena do ${outputFile}`);
        console.log(`Počet trojúhelníků: ${vertices.length / 3}`);
        
    } catch (error) {
        console.error('Chyba při převodu:', error);
    }
}

// Spuštění převodu
convertSTLToJS('hubice_B_001.stl', 'hubice-geometry.js');