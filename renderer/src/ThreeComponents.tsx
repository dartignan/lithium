import * as THREE from "three";
import React, { useCallback, useRef, useEffect } from "react";
import { Canvas, useThree } from "react-three-fiber";
import { OrbitControls } from "./OrbitControls";
import * as API from "./../../main/src/api";

function Item(props: any) {
  // This reference will give us direct access to the mesh
  const mesh = useRef();

  const item = props.item as API.Item;
  const transform = item.transform;
  const clippingPlane = props.clippingPlane;
  const selectItem = props.selectItemCallback;

  const matrix = new THREE.Matrix4();
  matrix.set(
    transform[0],
    transform[3],
    transform[6],
    transform[9],
    transform[1],
    transform[4],
    transform[7],
    transform[10],
    transform[2],
    transform[5],
    transform[8],
    transform[11],
    0,
    0,
    0,
    1
  );

  const select = (event: any) => {
    event.stopPropagation(); // Select only the item closest to the camera

    if (event.ctrlKey || event.shiftKey) {
      selectItem(item, true);
    } else {
      selectItem(item);
    }
  };

  var geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(item.mesh.vertexArray, 3)
  );

  if (item.mesh.triangleArray.length > 0) {
    geometry.setIndex(
      new THREE.Uint32BufferAttribute(item.mesh.triangleArray, 1)
    );
  }

  return (
    <group>
      <mesh
        {...props}
        matrix={matrix}
        ref={mesh}
        geometry={geometry}
        receiveShadow
        onClick={select}
        renderOrder={1}
      >
        <meshPhongMaterial
          attach="material"
          flatShading={true}
          clippingPlanes={[clippingPlane]}
          color={item.selected ? 0x786fb3 : 0xc0c0c0}
        />
        {item.subItems.map((subItem: API.Item) => (
          <Item
            key={subItem.uuid}
            item={subItem}
            clippingPlane={clippingPlane}
          />
        ))}
      </mesh>
      <mesh geometry={geometry} renderOrder={2}>
        <meshBasicMaterial
          attach="material"
          side={THREE.BackSide}
          clippingPlanes={[clippingPlane]}
        />
      </mesh>
    </group>
  );
}

const CameraController = () => {
  const { camera, gl } = useThree();
  useEffect(() => {
    const orbitControls = new OrbitControls(camera, gl.domElement);

    orbitControls.minZoom = 1;
    orbitControls.maxZoom = 200;
    orbitControls.zoomSpeed = 2.0;
    orbitControls.target.set(0, 0, 0);
    return () => {
      orbitControls.dispose();
    };
  }, [camera, gl]);
  return null;
};

export default function ThreeCanvas(props: any) {
  const mouse = useRef([0, 0]);

  const onMouseMove = useCallback(
    ({ clientX: x, clientY: y }) =>
      (mouse.current = [x - window.innerWidth / 2, y - window.innerHeight / 2]),
    []
  );

  const unSelectAll = () => {
    props.selectItemCallback();
  };

  var clippingPlane = new THREE.Plane(
    new THREE.Vector3(0, 0, -1),
    props.clippingHeight
  );

  return (
    <div style={{ width: "100%", height: "100%" }} onMouseMove={onMouseMove}>
      <Canvas
        gl={{ alpha: false, antialias: true, logarithmicDepthBuffer: true }}
        orthographic
        camera={{
          position: [1200, -1000, 1500],
          far: 3000,
          zoom: 2,
          up: [0, 0, 1],
        }}
        onCreated={({ gl }) => {
          gl.setClearColor("grey");
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.outputEncoding = THREE.sRGBEncoding;
          gl.localClippingEnabled = true;
        }}
        onPointerMissed={unSelectAll}
      >
        <CameraController />
        <ambientLight intensity={0.2} />
        <pointLight castShadow position={[1000, 1000, 1000]} intensity={0.3} />
        <pointLight castShadow position={[-1000, 1000, 1000]} intensity={0.3} />
        <pointLight castShadow position={[1000, -1000, 1000]} intensity={0.3} />
        <pointLight
          castShadow
          position={[-1000, -1000, 1000]}
          intensity={0.3}
        />

        <planeHelper plane={clippingPlane} size={100} />

        {props.items.map((item: API.Item) => (
          <Item
            key={item.uuid}
            item={item}
            selectItemCallback={props.selectItemCallback}
            clippingPlane={clippingPlane}
          />
        ))}
      </Canvas>
    </div>
  );
}
