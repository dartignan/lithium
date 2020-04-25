import * as THREE from "three";
import React, { useCallback, useRef, useEffect, useState } from "react";
import { Canvas, useThree } from "react-three-fiber";
import { OrbitControls } from "./OrbitControls";
import { useDrag } from "react-use-gesture";
import * as API from "electron/api";

export default function ThreeCanvas(props: any) {
  const mouse = useRef([0, 0]);
  const [hoveredItemsCount, setHoveredItemsCount] = useState(0);

  const onMouseMove = useCallback(
    ({ clientX: x, clientY: y }) =>
      (mouse.current = [x - window.innerWidth / 2, y - window.innerHeight / 2]),
    []
  );

  const unSelectAll = () => {
    props.itemSelected();
  };

  var clippingPlane = new THREE.Plane(
    new THREE.Vector3(0, 0, -1),
    props.clippingHeight
  );

  const overItemCallback = () => {
    setHoveredItemsCount(hoveredItemsCount + 1);
  };

  const outItemCallback = () => {
    setHoveredItemsCount(hoveredItemsCount > 1 ? hoveredItemsCount - 1 : 0);
  };

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
        style={getCanvasStyle(hoveredItemsCount)}
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

        {props.items.map((item: API.Item) => (
          <Item
            key={item.uuid}
            item={item}
            heightUpdated={props.heightUpdated}
            itemSelected={props.itemSelected}
            overItemCallback={overItemCallback}
            outItemCallback={outItemCallback}
            clippingPlane={clippingPlane}
          />
        ))}

        {/* <planeHelper plane={clippingPlane} size={350} /> */}
      </Canvas>
    </div>
  );
}

function getCanvasStyle(hoveredItemsCount: number) {
  return hoveredItemsCount > 0 ? { cursor: "pointer" } : { cursor: "auto" };
}

function Item(props: any) {
  const { size, viewport } = useThree();
  const aspect = size.width / viewport.width;

  const [position, setPosition] = useState([0, 0, 0]);

  const select = (event: any) => {
    event.stopPropagation(); // Select only the item closest to the camera

    if (event.ctrlKey || event.shiftKey) {
      props.itemSelected(props.item, true);
    } else {
      props.itemSelected(props.item);
    }
  };

  const bind = useDrag(
    ({ down, movement: [mx, my] }) => {
      if (down) {
        const [, , z] = position;
        setPosition([mx / aspect, -my / aspect, z]);
      }
    },
    { pointerEvents: true }
  );

  var geometry = toThreeGeometry(props.item.mesh);
  geometry.computeBoundingBox();
  props.heightUpdated(geometry.boundingBox?.max.z);

  return (
    <group
      matrixAutoUpdate={false}
      matrix={toThreeMatrix(props.item.transform)}
    >
      {/* Main mesh */}
      <mesh
        {...props}
        {...bind()}
        position={position}
        geometry={geometry}
        receiveShadow
        onPointerDown={select}
        onPointerEnter={props.overItemCallback}
        onPointerLeave={props.outItemCallback}
        renderOrder={1}
      >
        <meshPhongMaterial
          attach="material"
          flatShading={true}
          clippingPlanes={[props.clippingPlane]}
          color={props.item.selected ? 0x786fb3 : 0xc0c0c0}
        />
      </mesh>

      {/* Clipping layer mesh */}
      <mesh geometry={geometry} renderOrder={2}>
        <meshBasicMaterial
          attach="material"
          side={THREE.BackSide}
          clippingPlanes={[props.clippingPlane]}
        />
      </mesh>

      {/* Sub items */}
      {props.item.subItems.map((subItem: API.Item) => (
        <Item
          key={subItem.uuid}
          item={subItem}
          clippingPlane={props.clippingPlane}
          itemSelected={props.itemSelected}
          heightUpdated={props.heightUpdated}
          overItemCallback={props.overItemCallback}
          outItemCallback={props.outItemCallback}
        />
      ))}
    </group>
  );
}

function CameraController() {
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
}

function toThreeMatrix(transform: Float32Array) {
  return new THREE.Matrix4().set(
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
}

function toThreeGeometry(mesh: API.Mesh) {
  var geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(mesh.vertexArray, 3)
  );

  if (mesh.triangleArray.length > 0) {
    geometry.setIndex(new THREE.Uint32BufferAttribute(mesh.triangleArray, 1));
  }

  return geometry;
}
