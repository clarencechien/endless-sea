import * as THREE from 'three';
export function createPlane() {
 const plane = new THREE.Group();
 const ivory = new THREE.MeshStandardMaterial({color:0xf4e9d1,roughness:.38,metalness:.18});
 const red = new THREE.MeshStandardMaterial({color:0xb44c2e,roughness:.36,metalness:.2});
 const dark = new THREE.MeshStandardMaterial({color:0x283b3d,roughness:.45,metalness:.45});
 const glass = new THREE.MeshPhysicalMaterial({color:0x517279,metalness:.65,roughness:.13,clearcoat:1});
 function mesh(geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);plane.add(m);return m;}
 // Nose points down -Z. A tapered, modeled fuselage rather than a billboard.
 const body=mesh(new THREE.SphereGeometry(1,32,20),ivory,0,0,.3);body.scale.set(.63,.64,2.85);
 const nose=mesh(new THREE.SphereGeometry(1,24,16),red,0,.04,-2.02);nose.scale.set(.62,.59,.7);
 const cockpit=mesh(new THREE.SphereGeometry(1,32,20),glass,0,.48,-.35);cockpit.scale.set(.48,.62,1.03);
 const topRib=mesh(new THREE.BoxGeometry(.055,.05,1.8),ivory,0,1.02,-.27);topRib.rotation.x=.04;
 // Cambered wing profiles with broad, softly rounded tips.
 function wing(span,chord,thickness,z,y,material){
  const shape=new THREE.Shape();shape.moveTo(-span/2+.3,-chord/2);shape.lineTo(span/2-.3,-chord/2);shape.quadraticCurveTo(span/2,-chord/2,span/2,-chord/2+.3);shape.lineTo(span/2,chord/2-.3);shape.quadraticCurveTo(span/2,chord/2,span/2-.3,chord/2);shape.lineTo(-span/2+.3,chord/2);shape.quadraticCurveTo(-span/2,chord/2,-span/2,chord/2-.3);shape.lineTo(-span/2,-chord/2+.3);shape.quadraticCurveTo(-span/2,-chord/2,-span/2+.3,-chord/2);
  const g=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.045,bevelThickness:.025});g.rotateX(Math.PI/2);return mesh(g,material,0,y,z);
 }
 wing(10.6,1.45,.12,-.28,.28,ivory);
 for(const side of [-1,1]){
  mesh(new THREE.BoxGeometry(.28,.035,1.48),red,side*4.58,.32,-.28);
  mesh(new THREE.BoxGeometry(.09,.025,1.48),red,side*4.28,.32,-.28);
  // Struts connect high wings to the belly.
  const a=new THREE.Vector3(side*.4,-.43,.1),b=new THREE.Vector3(side*3.3,.22,-.25);const d=b.clone().sub(a);
  const strut=mesh(new THREE.CylinderGeometry(.027,.027,d.length(),8),dark);strut.position.copy(a.add(b).multiplyScalar(.5));strut.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
  const leg=mesh(new THREE.CylinderGeometry(.045,.045,.7,8),dark,side*.64,-.7,-.8);leg.rotation.z=side*-.38;
  const wheel=mesh(new THREE.CylinderGeometry(.22,.22,.15,16),dark,side*.8,-1.03,-.8);wheel.rotation.z=Math.PI/2;
 }
 wing(3.55,.92,.06,2.45,.17,ivory);
 for(const side of [-1,1])mesh(new THREE.BoxGeometry(.35,.03,.9),red,side*1.48,.21,2.45);
 const tailShape=new THREE.Shape();tailShape.moveTo(-.6,0);tailShape.lineTo(.65,0);tailShape.lineTo(.55,1.55);tailShape.quadraticCurveTo(.3,1.65,.05,1.12);tailShape.lineTo(-.6,0);
 const fin=new THREE.ExtrudeGeometry(tailShape,{depth:.08,bevelEnabled:true,bevelThickness:.025,bevelSize:.04,bevelSegments:2});fin.rotateY(Math.PI/2);mesh(fin,red,-.04,.12,2.15);
 const propeller=new THREE.Group();propeller.position.set(0,.03,-2.76);plane.add(propeller);
 const blade=new THREE.Mesh(new THREE.BoxGeometry(.12,2.3,.035),dark);propeller.add(blade);
 const hub=mesh(new THREE.SphereGeometry(.17,16,12),ivory,0,.03,-2.8);hub.scale.z=1.5;
 const disc=new THREE.Mesh(new THREE.CircleGeometry(1.14,48),new THREE.MeshBasicMaterial({color:0xdad4bd,transparent:true,opacity:.075,side:THREE.DoubleSide,depthWrite:false}));disc.position.z=-.015;propeller.add(disc);
 const lamp=mesh(new THREE.SphereGeometry(.045,8,8),new THREE.MeshBasicMaterial({color:0xff5c3d}),-5.3,.31,-.3);
 mesh(new THREE.SphereGeometry(.045,8,8),new THREE.MeshBasicMaterial({color:0xb6edb7}),5.3,.31,-.3);
 plane.userData.propeller=propeller;plane.userData.lamp=lamp;
 return plane;
}
