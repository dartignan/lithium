import FS from "fs";
import JSZip from "jszip";
import { JSDOM } from "jsdom";
const { DOMParser } = new JSDOM("").window;

class ThreeMFLoader {
  load(url: string, onLoad: (packageData: PackageData) => void) {
    FS.readFile(url, async (err, data) => {
      if (err) throw err;
      var arrayBufferData = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength
      );
      onLoad(await loadDocument(arrayBufferData as ArrayBuffer));
    });
  }
}

async function loadDocument(data: ArrayBuffer) {
  var zipArchive: JSZip;
  var file = null;
  var decoder = new TextDecoder("utf-8");

  var relsName = "";
  var modelRelsName = "";
  var modelPartNames: string[] = [];
  var printTicketPartNames: string[] = [];
  var texturesPartNames: string[] = [];
  var otherPartNames: string[] = [];

  var packageData = new PackageData();

  try {
    var zipLoader = new JSZip();
    zipArchive = await zipLoader.loadAsync(data);
  } catch (e) {
    if (e instanceof ReferenceError) {
      console.error("THREE.3MFLoader: jszip missing and file is compressed.");
      return undefined;
    }
  }

  if (!zipArchive) {
    return undefined;
  }

  for (file in zipArchive.files) {
    if (file.match(/\_rels\/.rels$/)) {
      relsName = file;
    } else if (file.match(/3D\/_rels\/.*\.model\.rels$/)) {
      modelRelsName = file;
    } else if (file.match(/^3D\/.*\.model$/)) {
      modelPartNames.push(file);
    } else if (file.match(/^3D\/Metadata\/.*\.xml$/)) {
      printTicketPartNames.push(file);
    } else if (file.match(/^3D\/Textures?\/.*/)) {
      texturesPartNames.push(file);
    } else if (file.match(/^3D\/Other\/.*/)) {
      otherPartNames.push(file);
    }
  }

  var relsView = new Uint8Array(
    await zipArchive.file(relsName).async("arraybuffer")
  );
  var relsFileText = decoder.decode(relsView);
  packageData.rels = parseRelsXml(relsFileText);

  if (modelRelsName) {
    var relsView = new Uint8Array(
      await zipArchive.file(modelRelsName).async("arraybuffer")
    );
    var relsFileText = decoder.decode(relsView);
    packageData.modelRels = parseRelsXml(relsFileText);
  }

  for (var i = 0; i < modelPartNames.length; i++) {
    var modelPart = modelPartNames[i];
    var view = new Uint8Array(
      await zipArchive.file(modelPart).async("arraybuffer")
    );

    var fileText = decoder.decode(view);
    var xmlData = new DOMParser().parseFromString(fileText, "text/xml");

    if (xmlData.documentElement.nodeName.toLowerCase() !== "model") {
      console.error(
        "THREE.3MFLoader: Error loading 3MF - no 3MF document found: ",
        modelPart
      );
    }

    var modelNode = xmlData.querySelector("model");

    if (modelNode !== null) {
      var modelData = parseModelNode(modelNode);
      modelData.xml = modelNode.innerHTML;

      packageData.modelParts.push(modelData);
    }
  }

  return packageData;
}

function parseRelsXml(relsFileText: string) {
  var relationships: Relationship[] = [];

  try {
    var relsXmlData = new DOMParser().parseFromString(relsFileText, "text/xml");

    var relsNodes = relsXmlData.querySelectorAll("Relationship");

    relsNodes.forEach((relsNode) => {
      var relationship = new Relationship();

      relationship.target = relsNode.getAttribute("Target") || "";
      relationship.id = relsNode.getAttribute("id") || "";
      relationship.type = relsNode.getAttribute("type") || "";

      relationships.push(relationship);
    });
  } catch (e) {
    if (e instanceof ReferenceError) {
      console.error("THREE.3MFLoader: jszip missing and file is compressed.");
      return undefined;
    }
  }

  return relationships;
}

function parseMetadataNodes(metadataNodes: NodeListOf<SVGMetadataElement>) {
  var metadataData: { [key: string]: string } = {};

  for (var i = 0; i < metadataNodes.length; i++) {
    var metadataNode = metadataNodes[i];
    var name = metadataNode.getAttribute("name");

    if (name) {
      var validNames = [
        "Title",
        "Designer",
        "Description",
        "Copyright",
        "LicenseTerms",
        "Rating",
        "CreationDate",
        "ModificationDate",
      ];

      if (0 <= validNames.indexOf(name) && metadataNode.textContent) {
        metadataData[name] = metadataNode.textContent;
      }
    }
  }

  return metadataData;
}

function parseMeshNode(meshNode: Element) {
  var meshData = new MeshData();

  var vertices = [];
  var vertexNodes = meshNode.querySelectorAll("vertices vertex");

  for (var i = 0; i < vertexNodes.length; i++) {
    var vertexNode = vertexNodes[i];
    var x = vertexNode.getAttribute("x");
    var y = vertexNode.getAttribute("y");
    var z = vertexNode.getAttribute("z");

    if (x && y && z) {
      vertices.push(parseFloat(x), parseFloat(y), parseFloat(z));
    }
  }

  var triangles = [];
  var triangleNodes = meshNode.querySelectorAll("triangles triangle");

  for (var i = 0; i < triangleNodes.length; i++) {
    var triangleNode = triangleNodes[i];
    var v1 = triangleNode.getAttribute("v1");
    var v2 = triangleNode.getAttribute("v2");
    var v3 = triangleNode.getAttribute("v3");

    if (v1 && v2 && v3) {
      triangles.push(parseInt(v1), parseInt(v2), parseInt(v3));
    }
  }

  meshData.vertexArray = new Float32Array(vertices);
  meshData.triangleArray = new Uint32Array(triangles);

  return meshData;
}

function parseComponentsNode(componentsNode: Element) {
  var components: ComponentData[] = [];

  var componentNodes = componentsNode.querySelectorAll("component");

  componentNodes.forEach((componentNode) => {
    var componentData = parseComponentNode(componentNode);
    components.push(componentData);
  });

  return components;
}

function parseComponentNode(componentNode: Element) {
  var componentData = new ComponentData();

  componentData.objectId = componentNode.getAttribute("objectid") || "0";
  componentData.transform =
    parseTransform(componentNode.getAttribute("transform")) || undefined;

  return componentData;
}

function parseTransform(transform: string) {
  var transformComponents: number[] = [];

  transform.split(" ").forEach((transformComponent) => {
    transformComponents.push(parseFloat(transformComponent));
  });

  return new Float32Array(transformComponents);
}

function parseObjectNode(objectNode: HTMLObjectElement) {
  var objectData = new ModelObject();

  objectData.type = objectNode.getAttribute("type") || "model";
  objectData.id = objectNode.getAttribute("id") || "";
  objectData.partnumber = objectNode.getAttribute("partnumber") || undefined;
  objectData.name = objectNode.getAttribute("name") || undefined;

  var meshNode = objectNode.querySelector("mesh");

  if (meshNode) {
    objectData.mesh = parseMeshNode(meshNode);
  }

  var componentsNode = objectNode.querySelector("components");

  if (componentsNode) {
    objectData.components = parseComponentsNode(componentsNode);
  }

  return objectData;
}

function parseResourcesNode(resourcesNode: Element) {
  var resourcesData = new ModelResources();

  var objectNodes = resourcesNode.querySelectorAll("object");

  objectNodes.forEach((objectNode) => {
    var modelObject = parseObjectNode(objectNode);
    resourcesData.objects[modelObject.id] = modelObject;
  });

  return resourcesData;
}

function parseBuildNode(buildNode: Element) {
  var buildData: BuildItem[] = [];
  var itemNodes = buildNode.querySelectorAll("item");

  itemNodes.forEach((itemNode) => {
    var objectid = itemNode.getAttribute("objectid");
    var transform = itemNode.getAttribute("transform");

    var buildItem = new BuildItem();

    if (objectid) {
      buildItem.objectId = objectid;
    }

    if (transform) {
      buildItem.transform = parseTransform(transform);
    }

    buildData.push(buildItem);
  });

  return buildData;
}

function parseModelNode(modelNode: Element) {
  var modelData = new ModelData();

  var unit = modelNode.getAttribute("unit");
  var metadataNodes = modelNode.querySelectorAll("metadata");
  var resourcesNode = modelNode.querySelector("resources");
  var buildNode = modelNode.querySelector("build");

  if (unit) {
    modelData.unit = unit;
  }

  if (metadataNodes) {
    modelData.metadata = parseMetadataNodes(metadataNodes);
  }

  if (resourcesNode) {
    modelData.resources = parseResourcesNode(resourcesNode);
  }

  if (buildNode) {
    modelData.build = parseBuildNode(buildNode);
  }

  return modelData;
}

class Relationship {
  target: string = "";
  id: string = "";
  type: string = "";
}

class PackageData {
  rels: Relationship[] = [];
  modelRels: Relationship[] = [];
  modelParts: ModelData[] = [];
}

class BuildItem {
  objectId: string = "";
  transform: Float32Array = new Float32Array();
}

class ModelData {
  unit: string = "millimeter";
  metadata: { [key: string]: string } = {};
  resources: ModelResources = new ModelResources();
  build: BuildItem[] = [];
  xml: string = "";
}

class ModelResources {
  objects: { [key: string]: ModelObject } = {};
}

class ModelObject {
  id: string = "";
  type: string = "model";
  partnumber?: string;
  name?: string;
  components: ComponentData[] = [];
  mesh: MeshData = new MeshData();
}

class MeshData {
  vertexArray: Float32Array = new Float32Array();
  triangleArray: Uint32Array = new Uint32Array();
}

class ComponentData {
  objectId: string = "0";
  transform: Float32Array = new Float32Array();
}

export {
  Relationship,
  PackageData,
  BuildItem,
  ModelData,
  ModelResources,
  ModelObject,
  MeshData,
  ComponentData,
};

export { ThreeMFLoader };
