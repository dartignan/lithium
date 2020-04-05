import {Matrix4} from 'three';

class Relationship {
  target:string="";
  id:string="";
  type:string="";
}

class PrintTicketParts {}

class TexturesPart {
  name:string="";
  content:ArrayBuffer=new ArrayBuffer(0);
}

class OtherParts {}

class PackageData {
  rels: Relationship[] = [];
  modelRels: Relationship[] = [];
  modelParts: ModelData[] = [];
  printTicketParts: PrintTicketParts = new PrintTicketParts();
  texturesParts: TexturesPart[] = [];
  other: OtherParts = new OtherParts();
}

class Build {
  items: BuildItem[] = [];
}

class BuildItem {
  objectId: string = "";
  transform: Matrix4 = new Matrix4();
}

class ModelData {
  unit: string = "millimeter";
  metadata: { [key: string]: string } = {};
  resources: ModelResources = new ModelResources();
  build: Build = new Build();
  xml: string = "";
  extensions: { [key: string]: string } = {};
}

class ModelResources {
  objects: ModelObject[] = [];
  texture2dgroup:{[key:string]:Texture2dGroupData}={};
  basematerials:{[key:string]:BaseMaterialsData}={};
  colorgroup:{[key:string]:ColorGroupData}={};
  pbmetallicdisplayproperties?:string;
}

class MetallicDisplayPropertiesData{
  id:string="";
  data:MetallicData[]=[];
}

class MetallicData{
  name:string="";
  metallicness:number=0;
  roughness:number=0;
}

class ModelObject {
  id:string="";
  pid?:string;
  pindex:string="";
  type:string="model";
  components: ComponentData[]=[];
  mesh: MeshData = new MeshData();
  partnumber?:string;
  name?:string;
  thumbnail?:string;
}

class MeshData {
  vertices: Float32Array = new Float32Array();
  triangleProperties: TriangleProperties[] = [];
  triangles: Uint32Array = new Uint32Array();
}

class TriangleProperties {
  v1: number = 0;
  v2: number = 0;
  v3: number = 0;
  p1: number = 0;
  p2: number = 0;
  p3: number = 0;
  pid?: string;
}

class ComponentData{
  objectId:string="0";
  transform?:string;
}

class BaseMaterialData {
  name: string = "";
  displaycolor: string = "";
  displaypropertiesid: string = "";
}

class BaseMaterialsData {
  id:string="";
  materials:BaseMaterialData[]=[];
}

class Texture2dData{
  id:string="";
  path:string="";
  contenttype:string="";
  tilestyleu:string="";
  tilestylev:string="";
  filter:string="";
}

class Texture2dGroupData{
  id:string="";
  texid:string="";
  displaypropertiesid?:string;
  uvs:Float32Array=new Float32Array();
}

class ColorGroupData {
  id: string = "";
  displaypropertiesid: string = "";
  colors: Float32Array = new Float32Array();
}

export {
  Relationship,
  PrintTicketParts,
  TexturesPart,
  OtherParts,
  PackageData,
  Build,
  BuildItem,
  ModelData,
  ModelResources,
  ModelObject,
  MeshData,
  TriangleProperties,
  BaseMaterialData,
  BaseMaterialsData,
  Texture2dData,
  Texture2dGroupData,
  ComponentData,
  ColorGroupData,
  MetallicDisplayPropertiesData,
  MetallicData
};
