class Item {
  uuid: string="";
  name: string = "";
  subItems: Item[] = [];
  transform: Float32Array = new Float32Array([
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
  ]);
  mesh: Mesh = new Mesh();
}

class Mesh {
  vertexArray: Float32Array = new Float32Array(0);
}

export { Item, Mesh };
