/**
 * @author aleeper / http://adamleeper.com/
 * @author mrdoob / http://mrdoob.com/
 * @author gero3 / https://github.com/gero3
 * @author Mugen87 / https://github.com/Mugen87
 * @author neverhood311 / https://github.com/neverhood311
 *
 * Description: A THREE loader for STL ASCII files, as created by Solidworks and other CAD programs.
 *
 * Supports both binary and ASCII encoded files, with automatic detection of type.
 *
 * The loader returns a non-indexed buffer geometry.
 *
 * Limitations:
 *  Binary decoding supports "Magics" color format (http://en.wikipedia.org/wiki/STL_(file_format)#Color_in_binary_STL).
 *  There is perhaps some question as to how valid it is to always assume little-endian-ness.
 *  ASCII decoding assumes file is UTF-8.
 *
 * Usage:
 *  var loader = new STLLoader();
 *  loader.load( './models/stl/slotted_disk.stl', function ( geometry ) {
 *    scene.add( new THREE.Mesh( geometry ) );
 *  });
 *
 * For binary STLs geometry might contain colors for vertices. To use it:
 *  // use the same code to load STL as above
 *  if (geometry.hasColors) {
 *    material = new THREE.MeshPhongMaterial({ opacity: geometry.alpha, vertexColors: true });
 *  } else { .... }
 *  var mesh = new THREE.Mesh( geometry, material );
 *
 * For ASCII STLs containing multiple solids, each solid is assigned to a different group.
 * Groups can be used to assign a different color by defining an array of materials with the same length of
 * geometry.groups and passing it to the Mesh constructor:
 *
 * var mesh = new THREE.Mesh( geometry, material );
 *
 * For example:
 *
 *  var materials = [];
 *  var nGeometryGroups = geometry.groups.length;
 *
 *  var colorMap = ...; // Some logic to index colors.
 *
 *  for (var i = 0; i < nGeometryGroups; i++) {
 *
 *		var material = new THREE.MeshPhongMaterial({
 *			color: colorMap[i],
 *			wireframe: false
 *		});
 *
 *  }
 *
 *  materials.push(material);
 *  var mesh = new THREE.Mesh(geometry, materials);
 */

import {
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  LoaderUtils,
  Vector3,
} from "three";

const fs = require("fs");

class STLLoader {
  constructor() {}

  load(url: string, onLoad: (response: {vertexArray: Float32Array, normalArray: Float32Array}) => void) {
    fs.readFile(url, (err, data) => {
      if (err) throw err;
      var arrayBufferData = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength
      );
      onLoad(parse(arrayBufferData));
    });
  }
}

function parse(data: ArrayBuffer) {
  return isBinary(data) ? parseBinary(data) : parseASCII(ensureString(data));
}

function isBinary(data: ArrayBuffer) {
  var expect, face_size, n_faces, reader;
  reader = new DataView(data);
  face_size = (32 / 8) * 3 + (32 / 8) * 3 * 3 + 16 / 8;
  n_faces = reader.getUint32(80, true);
  expect = 80 + 32 / 8 + n_faces * face_size;

  if (expect === reader.byteLength) {
    return true;
  }

  // An ASCII STL data must begin with 'solid ' as the first six bytes.
  // However, ASCII STLs lacking the SPACE after the 'd' are known to be
  // plentiful.  So, check the first 5 bytes for 'solid'.

  // Several encodings, such as UTF-8, precede the text with up to 5 bytes:
  // https://en.wikipedia.org/wiki/Byte_order_mark#Byte_order_marks_by_encoding
  // Search for "solid" to start anywhere after those prefixes.

  // US-ASCII ordinal values for 's', 'o', 'l', 'i', 'd'

  var solid = [115, 111, 108, 105, 100];

  for (var off = 0; off < 5; off++) {
    // If "solid" text is matched to the current offset, declare it to be an ASCII STL.

    if (matchDataViewAt(solid, reader, off)) return false;
  }

  // Couldn't find "solid" text at the beginning; it is binary STL.

  return true;
}

function matchDataViewAt(query: number[], reader: DataView, offset: number) {
  // Check if each byte in query matches the corresponding byte from the current offset

  for (var i = 0, il = query.length; i < il; i++) {
    if (query[i] !== reader.getUint8(offset + i)) return false;
  }

  return true;
}

function parseBinary(data: ArrayBuffer) {
  var reader = new DataView(data);
  var faces = reader.getUint32(80, true);

  var hasColors = false;

  var r = 0,
    g = 0,
    b = 0;

  var defaultR = 0,
    defaultG = 0,
    defaultB = 0,
    alpha = 0;

  var dataOffset = 84;
  var faceLength = 12 * 4 + 2;

  var geometry = new BufferGeometry();

  var vertexArray = new Float32Array(faces * 3 * 3);
  var normalArray = new Float32Array(faces * 3 * 3);
  var colors = new Float32Array(faces * 3 * 3);

  // process STL header
  // check for default color in header ("COLOR=rgba" sequence).

  for (var index = 0; index < 80 - 10; index++) {
    if (
      reader.getUint32(index, false) == 0x434f4c4f /*COLO*/ &&
      reader.getUint8(index + 4) == 0x52 /*'R'*/ &&
      reader.getUint8(index + 5) == 0x3d /*'='*/
    ) {
      hasColors = true;

      defaultR = reader.getUint8(index + 6) / 255;
      defaultG = reader.getUint8(index + 7) / 255;
      defaultB = reader.getUint8(index + 8) / 255;
      alpha = reader.getUint8(index + 9) / 255;
    }
  }

  for (var face = 0; face < faces; face++) {
    var start = dataOffset + face * faceLength;
    var normalX = reader.getFloat32(start, true);
    var normalY = reader.getFloat32(start + 4, true);
    var normalZ = reader.getFloat32(start + 8, true);

    if (hasColors) {
      var packedColor = reader.getUint16(start + 48, true);

      if ((packedColor & 0x8000) === 0) {
        // facet has its own unique color

        r = (packedColor & 0x1f) / 31;
        g = ((packedColor >> 5) & 0x1f) / 31;
        b = ((packedColor >> 10) & 0x1f) / 31;
      } else {
        r = defaultR;
        g = defaultG;
        b = defaultB;
      }
    }

    for (var i = 1; i <= 3; i++) {
      var vertexstart = start + i * 12;
      var componentIdx = face * 3 * 3 + (i - 1) * 3;

      vertexArray[componentIdx] = reader.getFloat32(vertexstart, true);
      vertexArray[componentIdx + 1] = reader.getFloat32(vertexstart + 4, true);
      vertexArray[componentIdx + 2] = reader.getFloat32(vertexstart + 8, true);

      normalArray[componentIdx] = normalX;
      normalArray[componentIdx + 1] = normalY;
      normalArray[componentIdx + 2] = normalZ;

      if (hasColors) {
        colors = new Float32Array(faces * 3 * 3);

        colors[componentIdx] = r;
        colors[componentIdx + 1] = g;
        colors[componentIdx + 2] = b;
      }
    }
  }

  geometry.setAttribute("position", new BufferAttribute(vertexArray, 3));
  geometry.setAttribute("normal", new BufferAttribute(normalArray, 3));

  if (hasColors) {
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    // geometry.hasColors = true;
    // geometry.alpha = alpha;
  }

  return {vertexArray, normalArray};
}

function parseASCII(data: string) {
  var geometry = new BufferGeometry();
  var patternSolid = /solid([\s\S]*?)endsolid/g;
  var patternFace = /facet([\s\S]*?)endfacet/g;
  var faceCounter = 0;

  var patternFloat = /[\s]+([+-]?(?:\d*)(?:\.\d*)?(?:[eE][+-]?\d+)?)/.source;
  var patternVertex = new RegExp(
    "vertex" + patternFloat + patternFloat + patternFloat,
    "g"
  );
  var patternNormal = new RegExp(
    "normal" + patternFloat + patternFloat + patternFloat,
    "g"
  );

  var vertices : number[];
  var normals : number[];

  var normal = new Vector3();

  var result;

  var groupCount = 0;
  var startVertex = 0;
  var endVertex = 0;

  while ((result = patternSolid.exec(data)) !== null) {
    startVertex = endVertex;

    var solid = result[0];

    while ((result = patternFace.exec(solid)) !== null) {
      var vertexCountPerFace = 0;
      var normalCountPerFace = 0;

      var text = result[0];

      while ((result = patternNormal.exec(text)) !== null) {
        normal.x = parseFloat(result[1]);
        normal.y = parseFloat(result[2]);
        normal.z = parseFloat(result[3]);
        normalCountPerFace++;
      }

      while ((result = patternVertex.exec(text)) !== null) {
        vertices.push(
          parseFloat(result[1]),
          parseFloat(result[2]),
          parseFloat(result[3])
        );
        normals.push(normal.x, normal.y, normal.z);
        vertexCountPerFace++;
        endVertex++;
      }

      // every face have to own ONE valid normal

      if (normalCountPerFace !== 1) {
        console.error(
          "THREE.STLLoader: Something isn't right with the normal of face number " +
            faceCounter
        );
      }

      // each face have to own THREE valid vertices

      if (vertexCountPerFace !== 3) {
        console.error(
          "THREE.STLLoader: Something isn't right with the vertices of face number " +
            faceCounter
        );
      }

      faceCounter++;
    }

    var start = startVertex;
    var count = endVertex - startVertex;

    geometry.addGroup(start, count, groupCount);
    groupCount++;
  }

  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));

  var vertexArray = new Float32Array(vertices);
  var normalArray = new Float32Array(normals);

  return {vertexArray, normalArray};
}

function ensureString(buffer: ArrayBuffer) {
  if (typeof buffer !== "string") {
    return LoaderUtils.decodeText(new Uint8Array(buffer));
  }

  return buffer;
}

export { STLLoader };
