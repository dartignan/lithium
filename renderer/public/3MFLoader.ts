/**
 * @author technohippy / https://github.com/technohippy
 * @author Mugen87 / https://github.com/Mugen87
 *
 * 3D Manufacturing Format (3MF) specification: https://3mf.io/specification/
 *
 * The following features from the core specification are supported:
 *
 * - 3D Models
 * - Object Resources (Meshes and Components)
 * - Material Resources (Base Materials)
 *
 * 3MF Materials and Properties Extension are only partially supported.
 *
 * - Texture 2D
 * - Texture 2D Groups
 * - Color Groups (Vertex Colors)
 * - Metallic Display Properties (PBR)
 */
import {
  BufferAttribute,
  BufferGeometry,
  ClampToEdgeWrapping,
  Color,
  FileLoader,
  Float32BufferAttribute,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  Loader,
  LoaderUtils,
  Matrix4,
  Mesh,
  MeshPhongMaterial,
  MeshStandardMaterial,
  MirroredRepeatWrapping,
  NearestFilter,
  RepeatWrapping,
  TextureLoader,
  sRGBEncoding
} from "three";

import JSZip from "jszip";

import * as ThreeMF from "./3MFTypes";

class ThreeMFLoader {
  availableExtensions: string[] = [];

  constructor() {}

  load(
    url: string,
    onLoad: (response: Group) => void,
    onProgress?: (request: ProgressEvent) => void,
    onError?: (event: ErrorEvent) => void
  ) {
    var loader = new FileLoader();
    loader.setResponseType("arraybuffer");
    loader.load(
      url,
      buffer => {
        onLoad(await parse(buffer as ArrayBuffer));
      },
      onProgress,
      onError
    );
  }

  addExtension(extension: string) {
    this.availableExtensions.push(extension);
  }
}

async function parse(data: ArrayBuffer) {
  let textureLoader = new TextureLoader();

  async function loadDocument(data: ArrayBuffer) {
    let zip: JSZip | null = null;
    let file = null;

    var relsName = "";
    var modelRelsName = "";
    var modelPartNames: string[] = [];
    var printTicketPartNames: string[] = [];
    var texturesPartNames: string[] = [];
		var otherPartNames: string[] = [];
		
		var packageData = new ThreeMF.PackageData();

    try {
      zip = new JSZip(data);
    } catch (e) {
      if (e instanceof ReferenceError) {
        console.error("THREE.3MFLoader: jszip missing and file is compressed.");
        return null;
      }
    }

    if (!zip) {
      return undefined;
    }

    for (file in zip.files) {
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
      await zip.file(relsName).async("arraybuffer")
    );
    var relsFileText = LoaderUtils.decodeText(relsView);
    packageData.rels = parseRelsXml(relsFileText);

    if (modelRelsName) {
      var relsView = new Uint8Array(
        await zip.file(modelRelsName).async("arraybuffer")
      );
      var relsFileText = LoaderUtils.decodeText(relsView);
      packageData.modelRels = parseRelsXml(relsFileText);
    }

    for (var i = 0; i < modelPartNames.length; i++) {
      var modelPart = modelPartNames[i];
      var view = new Uint8Array(await zip.file(modelPart).async("arraybuffer"));

      var fileText = LoaderUtils.decodeText(view);
      var xmlData = new DOMParser().parseFromString(
        fileText,
        "application/xml"
      );

      if (xmlData.documentElement.nodeName.toLowerCase() !== "model") {
        console.error(
          "THREE.3MFLoader: Error loading 3MF - no 3MF document found: ",
          modelPart
        );
      }

      var modelNode = xmlData.querySelector("model");
      var extensions: { [key: string]: string } = {};

      if (modelNode !== null) {
        for (var i = 0; i < modelNode.attributes.length; i++) {
          var attr = modelNode.attributes[i];
          if (attr.name.match(/^xmlns:(.+)$/)) {
            extensions[attr.value] = RegExp.$1;
          }
        }

        var modelData = parseModelNode(modelNode);
        modelData.xml = modelNode.innerHTML;

        modelData.extensions = extensions;

        packageData.modelParts.push(modelData);
      }
		}
		
		texturesPartNames.forEach(texturesPartName=>{
var texturesPart = new ThreeMF.TexturesPart();
texturesPart.name=texturesPartName;
texturesPart.content = await zip
			.file(texturesPartName)
			.async("arraybuffer") as ArrayBuffer ||new ArrayBuffer(0);
		});

    return packageData;
  }

  function parseRelsXml(relsFileText: string) {
    var relationships:ThreeMF.Relationship[] = [];

    var relsXmlData = new DOMParser().parseFromString(
      relsFileText,
      "application/xml"
    );

    var relsNodes = relsXmlData.querySelectorAll("Relationship");

		relsNodes.forEach(relsNode=>{
			var relationship = new ThreeMF.Relationship();

        relationship.target= relsNode.getAttribute("Target")||"";
        relationship.id= relsNode.getAttribute("id")||"";
				relationship.type= relsNode.getAttribute("type")||"";

      relationships.push(relationship);
		})
    
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
          "ModificationDate"
        ];

        if (0 <= validNames.indexOf(name) && metadataNode.textContent) {
          metadataData[name] = metadataNode.textContent;
        }
      }
    }

    return metadataData;
  }

  function parseBasematerialsNode(basematerialsNode: Element) {
		var baseMaterialsData=new ThreeMF.BaseMaterialsData();
		baseMaterialsData.id=basematerialsNode.getAttribute("id")||"";

		var basematerialNodes = basematerialsNode.querySelectorAll("base");
		
		basematerialNodes.forEach(basematerialNode=>{
			var basematerialData = parseBasematerialNode(basematerialNode);
      baseMaterialsData.materials.push(basematerialData);
		})

    return baseMaterialsData;
	}
	
  function parseTexture2DNode(texture2DNode:Element) {
		var texture2dData = new ThreeMF.Texture2dData();
		
		texture2dData.id= texture2DNode.getAttribute("id")||"";
		texture2dData.path= texture2DNode.getAttribute("path")||"";
		texture2dData.contenttype= texture2DNode.getAttribute("contenttype")||"";
		texture2dData.tilestyleu= texture2DNode.getAttribute("tilestyleu")||"";
      texture2dData.tilestylev= texture2DNode.getAttribute("tilestylev")||"";
      texture2dData.filter= texture2DNode.getAttribute("filter")||"";

    return texture2dData;
  }

  function parseTextures2DGroupNode(texture2DGroupNode:Element) {
var texture2DGroupData = new ThreeMF.Texture2dGroupData();
texture2DGroupData.id=texture2DGroupNode.getAttribute("id")||"";
texture2DGroupData.texid=texture2DGroupNode.getAttribute("texid")||"";
texture2DGroupData.displaypropertiesid=texture2DGroupNode.getAttribute("displaypropertiesid")||undefined;

    var tex2coordNodes = texture2DGroupNode.querySelectorAll("tex2coord");

		var uvs:number[] = [];
		
		tex2coordNodes.forEach(tex2coordNode=>{
			var u = tex2coordNode.getAttribute("u");
      var v = tex2coordNode.getAttribute("v");

			if(u&&v){
				uvs.push(parseFloat(u), parseFloat(v));
			}
		})

    texture2DGroupData.uvs = new Float32Array(uvs);

    return texture2DGroupData;
  }

  function parseColorGroupNode(colorGroupNode: Element) {
    var colorGroupData = new ThreeMF.ColorGroupData();

      colorGroupData.id = colorGroupNode.getAttribute("id")||"";
      colorGroupData.displaypropertiesid = colorGroupNode.getAttribute(
				"displaypropertiesid"
			)||"";

    var colorNodes = colorGroupNode.querySelectorAll("color");

    var colorComponents: number[] = [];
    var colorObject = new Color();

    for (var i = 0; i < colorNodes.length; i++) {
      var colorNode = colorNodes[i];
      var color = colorNode.getAttribute("color");

      if (color) {
        colorObject.setStyle(color.substring(0, 7));
        colorObject.convertSRGBToLinear(); // color is in sRGB

        colorComponents.push(colorObject.r, colorObject.g, colorObject.b);
      }
    }

    colorGroupData.colors = new Float32Array(colorComponents);

    return colorGroupData;
  }

  function parseMetallicDisplaypropertiesNode(
    metallicDisplaypropetiesNode: Element
  ) {
			var metallicDisplaypropertiesData = new ThreeMF.MetallicDisplayPropertiesData();

			metallicDisplaypropertiesData.id=metallicDisplaypropetiesNode.getAttribute("id")||"";

    var metallicNodes = metallicDisplaypropetiesNode.querySelectorAll(
      "pbmetallic"
    );

		var metallicData:ThreeMF.MetallicData[] = [];

		metallicNodes.forEach(metallicNode => {
			var metallicDatum = new ThreeMF.MetallicData();

        metallicDatum.name= metallicNode.getAttribute("name")||"";
        metallicDatum.metallicness= parseFloat(metallicNode.getAttribute("metallicness")||"0");
        metallicDatum.roughness= parseFloat(metallicNode.getAttribute("roughness")||"0");

				metallicData.push(metallicDatum);
		});

    metallicDisplaypropertiesData.data = metallicData;

    return metallicDisplaypropertiesData;
  }

  function parseBasematerialNode(basematerialNode: HTMLBaseElement) {
    var basematerialData = new ThreeMF.BaseMaterialData();

      basematerialData.name = basematerialNode.getAttribute("name")||"";
      basematerialData.displaycolor = basematerialNode.getAttribute("displaycolor")||"";
      basematerialData.displaypropertiesid = basematerialNode.getAttribute(
				"displaypropertiesid"
			)||"";

    return basematerialData;
  }

  function parseMeshNode(meshNode:Element) {
    var meshData = new ThreeMF.MeshData();

    var vertices = [];
    var vertexNodes = meshNode.querySelectorAll("vertices vertex");

    for (var i = 0; i < vertexNodes.length; i++) {
      var vertexNode = vertexNodes[i];
      var x = vertexNode.getAttribute("x");
      var y = vertexNode.getAttribute("y");
      var z = vertexNode.getAttribute("z");

			if(x && y && z){      vertices.push(parseFloat(x), parseFloat(y), parseFloat(z));}
    }

    var triangleProperties = [];
    var triangles = [];
    var triangleNodes = meshNode.querySelectorAll("triangles triangle");

    for (var i = 0; i < triangleNodes.length; i++) {
      var triangleNode = triangleNodes[i];
      var v1 = triangleNode.getAttribute("v1");
      var v2 = triangleNode.getAttribute("v2");
      var v3 = triangleNode.getAttribute("v3");
      var p1 = triangleNode.getAttribute("p1");
      var p2 = triangleNode.getAttribute("p2");
      var p3 = triangleNode.getAttribute("p3");
      var pid = triangleNode.getAttribute("pid");

      var triangleProperty = new ThreeMF.TriangleProperties();

			if(v1 && v2 && v3){
      triangleProperty.v1 = parseInt(v1);
      triangleProperty.v2 = parseInt(v2);
      triangleProperty.v3 = parseInt(v3);

      triangles.push(
        triangleProperty.v1,
        triangleProperty.v2,
        triangleProperty.v3
			);
			};

      // optional

      if (p1 && p2 && p3) {
        triangleProperty.p1 = parseInt(p1);
        triangleProperty.p2 = parseInt(p2);
        triangleProperty.p3 = parseInt(p3);
      }

      if (pid) {
        triangleProperty.pid = pid;
      }

      if (0 < Object.keys(triangleProperty).length) {
        triangleProperties.push(triangleProperty);
      }
    }

    meshData.triangleProperties = triangleProperties;
    meshData.triangles = new Uint32Array(triangles);

    return meshData;
  }

  function parseComponentsNode(componentsNode:Element) {
    var components:ThreeMF.ComponentData[] = [];

    var componentNodes = componentsNode.querySelectorAll("component");

		componentNodes.forEach(componentNode =>{
			var componentData = parseComponentNode(componentNode);
      components.push(componentData);
		})

    return components;
  }

  function parseComponentNode(componentNode: Element) {
		var componentData = new ThreeMF.ComponentData();

    componentData.objectId = componentNode.getAttribute("objectid") || "0";
    componentData.transform = componentNode.getAttribute("transform") || undefined;

    return componentData;
  }

  function parseTransform(transform: string) {
    var t: number[] = [];
    transform.split(" ").forEach(s => {
      t.push(parseFloat(s));
    });

    var matrix = new Matrix4();
    matrix.set(
      t[0],
      t[3],
      t[6],
      t[9],
      t[1],
      t[4],
      t[7],
      t[10],
      t[2],
      t[5],
      t[8],
      t[11],
      0.0,
      0.0,
      0.0,
      1.0
    );

    return matrix;
  }

  function parseObjectNode(objectNode: HTMLObjectElement) {
var objectData = new ThreeMF.ModelObject();

      objectData.type = objectNode.getAttribute("type")||"model";
      objectData.id = objectNode.getAttribute("id")||"";
      objectData.pid = objectNode.getAttribute("pid")||undefined;
      objectData.pindex = objectNode.getAttribute("pindex")||"";
			objectData.thumbnail = objectNode.getAttribute("thumbnail")||undefined;
      objectData.partnumber = objectNode.getAttribute("partnumber")||undefined;
      objectData.name = objectNode.getAttribute("name")||undefined;

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
    var resourcesData = new ThreeMF.ModelResources();

    var basematerialsNodes = resourcesNode.querySelectorAll("basematerials");

    for (var i = 0; i < basematerialsNodes.length; i++) {
      var basematerialsNode = basematerialsNodes[i];
      var basematerialsData = parseBasematerialsNode(basematerialsNode);
      resourcesData["basematerials"][
        basematerialsData["id"]
      ] = basematerialsData;
    }

    resourcesData["texture2d"] = {};
    var textures2DNodes = resourcesNode.querySelectorAll("texture2d");

    for (var i = 0; i < textures2DNodes.length; i++) {
      var textures2DNode = textures2DNodes[i];
      var texture2DData = parseTexture2DNode(textures2DNode);
      resourcesData["texture2d"][texture2DData["id"]] = texture2DData;
    }

    resourcesData["colorgroup"] = {};
    var colorGroupNodes = resourcesNode.querySelectorAll("colorgroup");

    for (var i = 0; i < colorGroupNodes.length; i++) {
      var colorGroupNode = colorGroupNodes[i];
      var colorGroupData = parseColorGroupNode(colorGroupNode);
      resourcesData["colorgroup"][colorGroupData["id"]] = colorGroupData;
    }

    resourcesData["pbmetallicdisplayproperties"] = {};
    var pbmetallicdisplaypropertiesNodes = resourcesNode.querySelectorAll(
      "pbmetallicdisplayproperties"
    );

    for (var i = 0; i < pbmetallicdisplaypropertiesNodes.length; i++) {
      var pbmetallicdisplaypropertiesNode = pbmetallicdisplaypropertiesNodes[i];
      var pbmetallicdisplaypropertiesData = parseMetallicDisplaypropertiesNode(
        pbmetallicdisplaypropertiesNode
      );
      resourcesData["pbmetallicdisplayproperties"][
        pbmetallicdisplaypropertiesData["id"]
      ] = pbmetallicdisplaypropertiesData;
    }

    resourcesData["texture2dgroup"] = {};
    var textures2DGroupNodes = resourcesNode.querySelectorAll("texture2dgroup");

    for (var i = 0; i < textures2DGroupNodes.length; i++) {
      var textures2DGroupNode = textures2DGroupNodes[i];
      var textures2DGroupData = parseTextures2DGroupNode(textures2DGroupNode);
      resourcesData.texture2dgroup[
        textures2DGroupData["id"]
      ] = textures2DGroupData;
    }

    var objectNodes = resourcesNode.querySelectorAll("object");

    for (var i = 0; i < objectNodes.length; i++) {
      var objectNode = objectNodes[i];
      var objectData = parseObjectNode(objectNode);
      resourcesData.objects.push( objectData);
    }

    return resourcesData;
  }

  function parseBuildNode(buildNode: Element) {
    var buildData: ThreeMF.BuildItem[] = [];
    var itemNodes = buildNode.querySelectorAll("item");

    itemNodes.forEach(itemNode => {
      var objectid = itemNode.getAttribute("objectid");
      var transform = itemNode.getAttribute("transform");

      var buildItem = new ThreeMF.BuildItem();

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
    var modelData = new ThreeMF.ModelData();

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

  function buildTexture(texture2dgroup, objects, modelData, textureData) {
    var texid = texture2dgroup.texid;
    var texture2ds = modelData.resources.texture2d;
    var texture2d = texture2ds[texid];

    if (texture2d) {
      var data = textureData[texture2d.path];
      var type = texture2d.contenttype;

      var blob = new Blob([data], { type: type });
      var sourceURI = URL.createObjectURL(blob);

      var texture = textureLoader.load(sourceURI, function () {
        URL.revokeObjectURL(sourceURI);
      });

      texture.encoding = sRGBEncoding;

      // texture parameters

      switch (texture2d.tilestyleu) {
        case "wrap":
          texture.wrapS = RepeatWrapping;
          break;

        case "mirror":
          texture.wrapS = MirroredRepeatWrapping;
          break;

        case "none":
        case "clamp":
          texture.wrapS = ClampToEdgeWrapping;
          break;

        default:
          texture.wrapS = RepeatWrapping;
      }

      switch (texture2d.tilestylev) {
        case "wrap":
          texture.wrapT = RepeatWrapping;
          break;

        case "mirror":
          texture.wrapT = MirroredRepeatWrapping;
          break;

        case "none":
        case "clamp":
          texture.wrapT = ClampToEdgeWrapping;
          break;

        default:
          texture.wrapT = RepeatWrapping;
      }

      switch (texture2d.filter) {
        case "auto":
          texture.magFilter = LinearFilter;
          texture.minFilter = LinearMipmapLinearFilter;
          break;

        case "linear":
          texture.magFilter = LinearFilter;
          texture.minFilter = LinearFilter;
          break;

        case "nearest":
          texture.magFilter = NearestFilter;
          texture.minFilter = NearestFilter;
          break;

        default:
          texture.magFilter = LinearFilter;
          texture.minFilter = LinearMipmapLinearFilter;
      }

      return texture;
    } else {
      return null;
    }
  }

  function buildBasematerialsMeshes(
    basematerials:ThreeMF.BaseMaterialsData,
    triangleProperties:ThreeMF.TriangleProperties[],
    modelData:ThreeMF.ModelData,
    meshData:ThreeMF.MeshData,
    textureData:ArrayBuffer,
    objectData:ThreeMF.ModelObject
  ) {
    var objectPindex = objectData.pindex;

    var materialMap : {[key:string]:ThreeMF.TriangleProperties[]}={};

    for (var i = 0, l = triangleProperties.length; i < l; i++) {
      var triangleProperty = triangleProperties[i];
      var pindex =
        triangleProperty.p1 !== undefined ? triangleProperty.p1 : objectPindex;

      if (materialMap[pindex] === undefined) materialMap[pindex] = [];

      materialMap[pindex].push(triangleProperty);
    }

    var keys = Object.keys(materialMap);
    var meshes = [];

    for (var i = 0, l = keys.length; i < l; i++) {
      var materialIndex = keys[i];
      var trianglePropertiesProps = materialMap[materialIndex];
      var basematerialData = basematerials.materials[materialIndex];
      var material = getBuild(
        basematerialData,
        objects,
        modelData,
        textureData,
        objectData,
        buildBasematerial
      );

      //

      var geometry = new BufferGeometry();

      var positionData = [];

      var vertices = meshData.vertices;

      for (var j = 0, jl = trianglePropertiesProps.length; j < jl; j++) {
        var triangleProperty = trianglePropertiesProps[j];

        positionData.push(vertices[triangleProperty.v1 * 3 + 0]);
        positionData.push(vertices[triangleProperty.v1 * 3 + 1]);
        positionData.push(vertices[triangleProperty.v1 * 3 + 2]);

        positionData.push(vertices[triangleProperty.v2 * 3 + 0]);
        positionData.push(vertices[triangleProperty.v2 * 3 + 1]);
        positionData.push(vertices[triangleProperty.v2 * 3 + 2]);

        positionData.push(vertices[triangleProperty.v3 * 3 + 0]);
        positionData.push(vertices[triangleProperty.v3 * 3 + 1]);
        positionData.push(vertices[triangleProperty.v3 * 3 + 2]);
      }

      geometry.setAttribute(
        "position",
        new Float32BufferAttribute(positionData, 3)
      );

      //

      var mesh = new Mesh(geometry, material);
      meshes.push(mesh);
    }

    return meshes;
  }

  function buildTexturedMesh(
    texture2dgroup,
    triangleProperties,
    modelData,
    meshData,
    textureData,
    objectData
  ) {
    // geometry

    var geometry = new BufferGeometry();

    var positionData = [];
    var uvData = [];

    var vertices = meshData.vertices;
    var uvs = texture2dgroup.uvs;

    for (var i = 0, l = triangleProperties.length; i < l; i++) {
      var triangleProperty = triangleProperties[i];

      positionData.push(vertices[triangleProperty.v1 * 3 + 0]);
      positionData.push(vertices[triangleProperty.v1 * 3 + 1]);
      positionData.push(vertices[triangleProperty.v1 * 3 + 2]);

      positionData.push(vertices[triangleProperty.v2 * 3 + 0]);
      positionData.push(vertices[triangleProperty.v2 * 3 + 1]);
      positionData.push(vertices[triangleProperty.v2 * 3 + 2]);

      positionData.push(vertices[triangleProperty.v3 * 3 + 0]);
      positionData.push(vertices[triangleProperty.v3 * 3 + 1]);
      positionData.push(vertices[triangleProperty.v3 * 3 + 2]);

      //

      uvData.push(uvs[triangleProperty.p1 * 2 + 0]);
      uvData.push(uvs[triangleProperty.p1 * 2 + 1]);

      uvData.push(uvs[triangleProperty.p2 * 2 + 0]);
      uvData.push(uvs[triangleProperty.p2 * 2 + 1]);

      uvData.push(uvs[triangleProperty.p3 * 2 + 0]);
      uvData.push(uvs[triangleProperty.p3 * 2 + 1]);
    }

    geometry.setAttribute(
      "position",
      new Float32BufferAttribute(positionData, 3)
    );
    geometry.setAttribute("uv", new Float32BufferAttribute(uvData, 2));

    // material

    var texture = getBuild(
      texture2dgroup,
      objects,
      modelData,
      textureData,
      objectData,
      buildTexture
    );

    var material = new MeshPhongMaterial({ map: texture, flatShading: true });

    // mesh

    var mesh = new Mesh(geometry, material);

    return mesh;
  }

  function buildVertexColorMesh(
    colorgroup:ThreeMF.ColorGroupData,
    triangleProperties:ThreeMF.TriangleProperties[],
    meshData:ThreeMF.MeshData
  ) {
    // geometry

    var geometry = new BufferGeometry();

    var positionData = [];
    var colorData = [];

    var vertices = meshData.vertices;
    var colors = colorgroup.colors;

    for (var i = 0, l = triangleProperties.length; i < l; i++) {
      var triangleProperty = triangleProperties[i];

      var v1 = triangleProperty.v1;
      var v2 = triangleProperty.v2;
      var v3 = triangleProperty.v3;

      positionData.push(vertices[v1 * 3 + 0]);
      positionData.push(vertices[v1 * 3 + 1]);
      positionData.push(vertices[v1 * 3 + 2]);

      positionData.push(vertices[v2 * 3 + 0]);
      positionData.push(vertices[v2 * 3 + 1]);
      positionData.push(vertices[v2 * 3 + 2]);

      positionData.push(vertices[v3 * 3 + 0]);
      positionData.push(vertices[v3 * 3 + 1]);
      positionData.push(vertices[v3 * 3 + 2]);

      //

      var p1 = triangleProperty.p1;
      var p2 = triangleProperty.p2;
      var p3 = triangleProperty.p3;

      colorData.push(colors[p1 * 3 + 0]);
      colorData.push(colors[p1 * 3 + 1]);
      colorData.push(colors[p1 * 3 + 2]);

      colorData.push(colors[(p2 || p1) * 3 + 0]);
      colorData.push(colors[(p2 || p1) * 3 + 1]);
      colorData.push(colors[(p2 || p1) * 3 + 2]);

      colorData.push(colors[(p3 || p1) * 3 + 0]);
      colorData.push(colors[(p3 || p1) * 3 + 1]);
      colorData.push(colors[(p3 || p1) * 3 + 2]);
    }

    geometry.setAttribute(
      "position",
      new Float32BufferAttribute(positionData, 3)
    );
    geometry.setAttribute("color", new Float32BufferAttribute(colorData, 3));

    // material

    var material = new MeshPhongMaterial({
      vertexColors: true,
      flatShading: true
    });

    // mesh

    var mesh = new Mesh(geometry, material);

    return mesh;
  }

  function buildDefaultMesh(meshData:ThreeMF.MeshData) {
    var geometry = new BufferGeometry();
    geometry.setIndex(new BufferAttribute(meshData.triangles, 1));
    geometry.setAttribute(
      "position",
      new BufferAttribute(meshData.vertices, 3)
    );

    var material = new MeshPhongMaterial({
      color: 0xe0e0e0,
      flatShading: true
    });

    var mesh = new Mesh(geometry, material);

    return mesh;
  }

  function buildMeshes(
    resourceMap,
    modelData:ThreeMF.ModelData,
    meshData:ThreeMF.MeshData,
    textureData:{[key:string]:ArrayBuffer},
    objectData:ThreeMF.ModelObject
  ) {
    var keys = Object.keys(resourceMap);
    var meshes = [];

    for (var i = 0, il = keys.length; i < il; i++) {
      var resourceId = keys[i];
      var triangleProperties = resourceMap[resourceId];
      var resourceType = getResourceType(resourceId, modelData);

      switch (resourceType) {
        case "material":
          var basematerials = modelData.resources.basematerials[resourceId];
          var newMeshes = buildBasematerialsMeshes(
            basematerials,
            triangleProperties,
            modelData,
            meshData,
            textureData,
            objectData
          );

          for (var j = 0, jl = newMeshes.length; j < jl; j++) {
            meshes.push(newMeshes[j]);
          }
          break;

        case "texture":
          var texture2dgroup = modelData.resources.texture2dgroup[resourceId];
          meshes.push(
            buildTexturedMesh(
              texture2dgroup,
              triangleProperties,
              modelData,
              meshData,
              textureData,
              objectData
            )
          );
          break;

        case "vertexColors":
          var colorgroup = modelData.resources.colorgroup[resourceId];
          meshes.push(
            buildVertexColorMesh(
              colorgroup,
              triangleProperties,
              modelData,
              meshData
            )
          );
          break;

        case "default":
          meshes.push(buildDefaultMesh(meshData));
          break;

        default:
          console.error("THREE.3MFLoader: Unsupported resource type.");
      }
    }

    return meshes;
  }

  function getResourceType(pid:string, modelData:ThreeMF.ModelData) {
    if (modelData.resources.texture2dgroup[pid] !== undefined) {
      return "texture";
    } else if (modelData.resources.basematerials[pid] !== undefined) {
      return "material";
    } else if (modelData.resources.colorgroup[pid] !== undefined) {
      return "vertexColors";
    } else if (pid === "default") {
      return "default";
    } else {
      return undefined;
    }
  }

  function analyzeObject(meshData:ThreeMF.MeshData, objectData:ThreeMF.ModelObject) {
    var resourceMap:{[key:string]:ThreeMF.TriangleProperties[]} = {};

    var triangleProperties = meshData.triangleProperties;

		var objectPid = objectData.pid;
		
		triangleProperties.forEach(triangleProperty =>{
			var pid =
			triangleProperty.pid !== undefined ? triangleProperty.pid : objectPid;

		if (pid === undefined) pid = "default";

		if (resourceMap[pid] === undefined) resourceMap[pid] = [];

		resourceMap[pid].push(triangleProperty);
		})

    return resourceMap;
  }

	function buildGroup(meshData:ThreeMF.MeshData, modelData:ThreeMF.ModelData,
		textureData:{[key:string]:ArrayBuffer}, objectData:ThreeMF.ModelObject) {
    var group = new Group();

    var resourceMap = analyzeObject(meshData, objectData);
    var meshes = buildMeshes(
      resourceMap,
      modelData,
      meshData,
      textureData,
      objectData
    );

    for (var i = 0, l = meshes.length; i < l; i++) {
      group.add(meshes[i]);
    }

    return group;
  }

  function applyExtensions(extensions:{[key:string]:string}, meshData:ThreeMF.MeshData, modelXml:string) {
    if (!extensions) {
      return;
    }

    var availableExtensions = [];
    var keys = Object.keys(extensions);

    for (var i = 0; i < keys.length; i++) {
      var ns = keys[i];

      for (var j = 0; j < scope.availableExtensions.length; j++) {
        var extension = scope.availableExtensions[j];

        if (extension.ns === ns) {
          availableExtensions.push(extension);
        }
      }
    }

    for (var i = 0; i < availableExtensions.length; i++) {
      var extension = availableExtensions[i];
      extension.apply(modelXml, extensions[extension["ns"]], meshData);
    }
  }

  function getBuild(
    data:ThreeMF.BaseMaterialData,
    objects:ThreeMF.ModelObject[],
    modelData:ThreeMF.ModelData,
    textureData:ArrayBuffer,
    objectData:ThreeMF.ModelObject,
    builder
  ) {
    if (data.build !== undefined) return data.build;

    data.build = builder(data, objects, modelData, textureData, objectData);

    return data.build;
  }

  function buildBasematerial(materialData:ThreeMF.BaseMaterialData, modelData:ThreeMF.ModelData) {
    var material;

    var displaypropertiesid = materialData.displaypropertiesid;
    var pbmetallicdisplayproperties =
      modelData.resources.pbmetallicdisplayproperties;

    if (
      displaypropertiesid !== null &&
      pbmetallicdisplayproperties[displaypropertiesid] !== undefined
    ) {
      // metallic display property, use StandardMaterial

      var pbmetallicdisplayproperty =
        pbmetallicdisplayproperties[displaypropertiesid];
      var metallicData = pbmetallicdisplayproperty.data[materialData.index];

      material = new MeshStandardMaterial({
        flatShading: true,
        roughness: metallicData.roughness,
        metalness: metallicData.metallicness
      });
    } else {
      // otherwise use PhongMaterial

      material = new MeshPhongMaterial({ flatShading: true });
    }

    material.name = materialData.name;

    // displaycolor MUST be specified with a value of a 6 or 8 digit hexadecimal number, e.g. "#RRGGBB" or "#RRGGBBAA"

    var displaycolor = materialData.displaycolor;

    var color = displaycolor.substring(0, 7);
    material.color.setStyle(color);
    material.color.convertSRGBToLinear(); // displaycolor is in sRGB

    // process alpha if set

    if (displaycolor.length === 9) {
      material.opacity =
        parseInt(displaycolor.charAt(7) + displaycolor.charAt(8), 16) / 255;
    }

    return material;
  }

	function buildComposite(compositeData:ThreeMF.ComponentData[], objects:ThreeMF.ModelObject[],
		 modelData:ThreeMF.ModelData, textureData:{[key:string]:ArrayBuffer}) {
    var composite = new Group();

    for (var j = 0; j < compositeData.length; j++) {
      var component = compositeData[j];
      var object = objects.find(object => object.id=== component.objectId);

      if (object === undefined) {
        buildObject(component.objectId, objects, modelData, textureData);
        object = objects.find(object => object.id=== component.objectId);
      }

      var object3D = object.clone();

      // apply component transfrom

      var transform = component.transform;

      if (transform) {
        object3D.applyMatrix4(transform);
      }

      composite.add(object3D);
    }

    return composite;
  }

	function buildObject(objectId:string, objects:ThreeMF.ModelObject[], 
		modelData:ThreeMF.ModelData, textureData:{[key:string]:ArrayBuffer}) {
    var objectData = modelData.resources.objects.find(object => object.id===objectId);

		var meshData = objectData?.mesh;

    if (meshData) {
      var extensions = modelData.extensions;
      var modelXml = modelData.xml;

			applyExtensions(extensions, meshData, modelXml);
			
			objects.push(buildGroup(meshData, modelData, textureData, objectData));
    } else {
      var compositeData = objectData?.components;

			if(compositeData)
			{
			objects.push(buildComposite(compositeData,objects,modelData,textureData));
			}
    }
  }

  function buildObjects(packageData: ThreeMF.PackageData) {
var textureData:{[key:string]:ArrayBuffer}={};

    // evaluate model relationships to textures

		packageData.modelRels.forEach(modelRel =>{
			var textureKey = modelRel.target.substring(1);
			var texturePart = packageData.texturesParts.find(texturePart => texturePart.name === textureKey);

			if (texturePart) {
				textureData[modelRel.target] = texturePart.content;
			}
		});

		// start build
		
		packageData.modelParts.forEach(modelData =>{

			var objectIds = Object.keys(modelData.resources.objects);

      for (var j = 0; j < objectIds.length; j++) {
        var objectId = objectIds[j];

        buildObject(objectId, objects, modelData, textureData);
      }
		});

    for (var i = 0; i < modelsKeys.length; i++) {
      var modelsKey = modelsKeys[i];
      var modelData = modelsData[modelsKey];

      var objectIds = Object.keys(modelData.resources.objects);

      for (var j = 0; j < objectIds.length; j++) {
        var objectId = objectIds[j];

        buildObject(objectId, objects, modelData, textureData);
      }
		}
		
		modelsData.build.items.forEach(item =>{
			buildObject(objectId, objects, modelData, textureData);
		})

    return objects;
  }

  function build(objects, data3mf: Data3mf) {
    var group = new Group();

    var relationship = data3mf.rels[0];
    var buildData = data3mf.model[relationship["target"].substring(1)]["build"];

    for (var i = 0; i < buildData.length; i++) {
      var buildItem = buildData[i];
      var object3D = objects[buildItem["objectId"]];

      // apply transform

      var transform = buildItem["transform"];

      if (transform) {
        object3D.applyMatrix4(transform);
      }

      group.add(object3D);
    }

    return group;
  }

  var packageData = await loadDocument(data);
  var objects = buildObjects(packageData);

  return build(objects, packageData);
}

export { ThreeMFLoader };
