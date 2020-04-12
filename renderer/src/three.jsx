import * as THREE from "three";
import React, { useCallback, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "react-three-fiber";
import { OrbitControls } from "./OrbitControls";

function Box(props) {
  // This reference will give us direct access to the mesh
  const mesh = useRef();

  // Set up state for the hovered and active state
  const [hovered, setHover] = useState(false);
  const [active, setActive] = useState(false);

  // Rotate mesh every frame, this is outside of React without overhead
  useFrame(() => (mesh.current.rotation.x = mesh.current.rotation.y += 0.01));

  return (
    <mesh
      {...props}
      ref={mesh}
      geometry={props.boxBufferGeometry}
      scale={active ? [1.5, 1.5, 1.5] : [1, 1, 1]}
      onClick={(e) => setActive(!active)}
      onPointerOver={(e) => setHover(true)}
      onPointerOut={(e) => setHover(false)}
    >
      <meshPhongMaterial
        attach="material"
        flatShading={true}
        color={hovered ? "hotpink" : "yellow"}
      />
    </mesh>
  );
}

function Item(props) {
  // This reference will give us direct access to the mesh
  const mesh = useRef();

  const [selected, setSelected] = useState(false);

  var geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(props.data.mesh.vertexArray, 3));
  // geometry.setAttribute("normal", new THREE.Float32BufferAttribute(props.geometryData.normalArray, 3));

  return (
    <mesh
      {...props}
      ref={mesh}
      geometry={geometry}
      receiveShadow
      onClick={(e) => setSelected(!selected)}
    >
      <meshPhongMaterial
        attach="material"
        flatShading={true}
        color={selected ? 0x786fb3 : 0xc0c0c0}
      />
    </mesh>
  );
}

const CameraController = () => {
  const { camera, gl } = useThree();
  useEffect(
    () => {
      const orbitControls = new OrbitControls(camera, gl.domElement);

      orbitControls.minZoom = 1;
      orbitControls.maxZoom = 200;
      orbitControls.zoomSpeed = 2.0;
      orbitControls.target.set(0, 0, 0);
      return () => {
        orbitControls.dispose();
      };
    },
    [camera, gl]
  );
  return null;
};

export default function ThreeScene(props) {
  const mouse = useRef([0, 0]);
  const onMouseMove = useCallback(
    ({ clientX: x, clientY: y }) =>
      (mouse.current = [x - window.innerWidth / 2, y - window.innerHeight / 2]),
    []
  );

  var boxBufferGeometry = new THREE.BoxBufferGeometry(1,1,1);

  return (
    <div style={{ width: "100%", height: "100%" }} onMouseMove={onMouseMove}>
      <Canvas
        gl={{ alpha: false, antialias: true, logarithmicDepthBuffer: true }}
        orthographic
        camera={{ position:[100,-100,150], zoom:5, up:[0, 0, 1] }}
        onCreated={({ gl }) => {
          gl.setClearColor("grey");
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.outputEncoding = THREE.sRGBEncoding;
        }}
      >
        <CameraController />
        <ambientLight intensity={0.2} />
        <pointLight castShadow position={[1000, 1000, 1000]} intensity={0.3} />
        <pointLight castShadow position={[-1000, 1000, 1000]} intensity={0.3} />
        <pointLight castShadow position={[1000, -1000, 1000]} intensity={0.3} />
        <pointLight castShadow position={[-1000, -1000, 1000]} intensity={0.3} />

        {props.items.map((item) => (
          <Item key={item.uuid} data={item} />
        ))}

        <Box boxBufferGeometry={boxBufferGeometry} position={[0, 1.2, 0]} />
        <Box boxBufferGeometry={boxBufferGeometry} position={[0, -1.2, 0]} />
      </Canvas>
    </div>
  );
}
