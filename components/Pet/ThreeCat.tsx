"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { usePet, type PetMood } from "@/store/usePet";

// Web Audio sound synthesizer class
class CatSoundSynth {
  private ctx: AudioContext | null = null;
  private meowSample: HTMLAudioElement | null = null;
  private purrSample: HTMLAudioElement | null = null;

  /** Play the real recorded purr (public/purr.mp3) — used when whiskers are
   *  touched. Falls back to the synthesized purr if playback is blocked. */
  playPurrSample() {
    try {
      if (!this.purrSample) {
        this.purrSample = new Audio("/purr.mp3");
        this.purrSample.preload = "auto";
      }
      const a = this.purrSample.cloneNode() as HTMLAudioElement;
      a.volume = 0.85;
      a.play().catch(() => this.playPurr());
    } catch {
      this.playPurr();
    }
  }

  /** Play the real recorded meow (public/meow.mp3). Clones the node so rapid
   *  pats overlap instead of cutting each other off. Falls back to the
   *  synthesized meow if the file can't be played. */
  playMeowSample(isPlayful = false) {
    try {
      if (!this.meowSample) {
        this.meowSample = new Audio("/meow.mp3");
        this.meowSample.preload = "auto";
      }
      const a = this.meowSample.cloneNode() as HTMLAudioElement;
      a.volume = 0.85;
      a.playbackRate = isPlayful ? 1.15 : 1.0;
      a.play().catch(() => this.playMeow(isPlayful));
    } catch {
      this.playMeow(isPlayful);
    }
  }

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  playMeow(isPlayful = false) {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      
      if (isPlayful) {
        osc.frequency.setValueAtTime(550, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.18);
        
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      } else {
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(640, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(480, now + 0.35);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {
      console.warn("Web Audio meow failed", e);
    }
  }

  playPurr() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      
      osc.type = "sawtooth";
      osc.frequency.value = 52; 
      
      lfo.frequency.value = 16; 
      lfoGain.gain.value = 0.35;
      
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 90;
      
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
      
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 1.4);
      osc.stop(now + 1.4);
    } catch (e) {
      console.warn("Web Audio purr failed", e);
    }
  }

  playCrunch() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      
      for (let i = 0; i < 4; i++) {
        const burstTime = now + i * 0.15;
        const bufferSize = ctx.sampleRate * 0.06;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let j = 0; j < bufferSize; j++) {
          data[j] = Math.random() * 2 - 1;
        }
        
        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 900;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.1, burstTime);
        gain.gain.exponentialRampToValueAtTime(0.001, burstTime + 0.06);
        
        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        noiseNode.start(burstTime);
        noiseNode.stop(burstTime + 0.06);
      }
    } catch (e) {
      console.warn("Web Audio crunch failed", e);
    }
  }
}

const synth = new CatSoundSynth();

type Heart = { id: number; x: number; y: number };

export default function ThreeCat() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const name = usePet((s) => s.name);
  const mood = usePet((s) => s.mood);
  const setMood = usePet((s) => s.setMood);
  const setEnergy = usePet((s) => s.setEnergy);
  const energy = usePet((s) => s.energy);

  // Zustand State subscription to avoid closure/stale state inside the WebGL loop
  const stateRef = useRef<{
    mood: PetMood;
    gaze: { x: number; y: number };
    speaking: boolean;
    present: boolean;
  }>({
    mood: "idle",
    gaze: { x: 0, y: 0 },
    speaking: false,
    present: false,
  });

  useEffect(() => {
    const unsub = usePet.subscribe((s) => {
      stateRef.current = {
        mood: s.mood,
        gaze: s.gaze,
        speaking: s.speaking,
        present: s.present,
      };
    });
    // seed initial
    const s = usePet.getState();
    stateRef.current = {
      mood: s.mood,
      gaze: s.gaze,
      speaking: s.speaking,
      present: s.present,
    };
    return unsub;
  }, []);

  // Interaction trigger actions (passed to anim loop via refs)
  const [activeAction, setActiveAction] = useState<"none" | "petting" | "feeding" | "playing">("none");
  const actionRef = useRef<"none" | "petting" | "feeding" | "playing">("none");

  useEffect(() => {
    actionRef.current = activeAction;
  }, [activeAction]);

  // Eye blinking state
  const [winking, setWinking] = useState(false);
  const winkingRef = useRef(false);

  useEffect(() => {
    winkingRef.current = winking;
  }, [winking]);

  // Blinking loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const triggerBlink = () => {
      setWinking(true);
      timer = setTimeout(() => {
        setWinking(false);
        const nextTime = 2200 + Math.random() * 3200;
        timer = setTimeout(triggerBlink, nextTime);
      }, 120);
    };
    timer = setTimeout(triggerBlink, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Hearts state & floating logic
  const [hearts, setHearts] = useState<Heart[]>([]);

  useEffect(() => {
    if (activeAction === "petting") {
      const interval = setInterval(() => {
        setHearts((prev) => [
          ...prev,
          {
            id: Math.random(),
            x: 80 + Math.random() * 80, // centered near head
            y: 90 - Math.random() * 15,
          },
        ]);
      }, 250);

      const timeout = setTimeout(() => {
        clearInterval(interval);
      }, 1400);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [activeAction]);

  useEffect(() => {
    if (hearts.length > 0) {
      const timer = setTimeout(() => {
        setHearts((prev) => prev.slice(1));
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [hearts]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // --- WebGL Setup ---
    const width = container.clientWidth || 240;
    const height = container.clientHeight || 240;

    const scene = new THREE.Scene();
    
    // Transparent camera setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 5.0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // --- Lighting ---
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff7e6, 0.85);
    dirLight.position.set(2, 4.5, 2.5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 512;
    dirLight.shadow.mapSize.height = 512;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 10;
    dirLight.shadow.camera.left = -1.5;
    dirLight.shadow.camera.right = 1.5;
    dirLight.shadow.camera.top = 2;
    dirLight.shadow.camera.bottom = -2;
    dirLight.shadow.bias = -0.0015;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xe6f2ff, 0.3);
    fillLight.position.set(-3, -2, -2);
    scene.add(fillLight);

    // --- Materials ---
    const orangeMat = new THREE.MeshToonMaterial({ color: 0xffa463 });
    const whiteMat = new THREE.MeshToonMaterial({ color: 0xffffff });
    const pinkMat = new THREE.MeshToonMaterial({ color: 0xffb8d1 });
    const darkMat = new THREE.MeshToonMaterial({ color: 0x3a2533 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x221122 });
    const sparkleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const redMat = new THREE.MeshToonMaterial({ color: 0xe76a6a });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7, roughness: 0.1 });
    const yarnMat = new THREE.MeshToonMaterial({ color: 0xe76a6a });
    const fishMat = new THREE.MeshToonMaterial({ color: 0x7ec8e3 });

    // Whisker Materials & Geometries
    const whiskerGeom = new THREE.CylinderGeometry(0.005, 0.005, 0.28, 8);
    whiskerGeom.rotateZ(Math.PI / 2);
    const whiskerMat = new THREE.MeshBasicMaterial({ color: 0x554455 });

    // Forehead/Cheek Stripes Materials & Geometries
    const stripeMat = new THREE.MeshToonMaterial({ color: 0xd47535 });
    const centerStripeGeom = new THREE.BoxGeometry(0.04, 0.15, 0.02);
    const leftStripeGeom = new THREE.BoxGeometry(0.035, 0.12, 0.02);
    const cheekStripeGeom = new THREE.BoxGeometry(0.12, 0.03, 0.02);

    // Cheek Tufts
    const tuftGeom = new THREE.ConeGeometry(0.12, 0.35, 4);
    tuftGeom.rotateZ(Math.PI / 2);
    tuftGeom.translate(-0.15, 0, 0);

    // Inner Ear Fluff
    const fluffGeom = new THREE.SphereGeometry(0.06, 8, 8);
    fluffGeom.scale(1.2, 1.8, 0.8);

    // Paw Toe Beans
    const beanGeom = new THREE.SphereGeometry(0.035, 8, 8);
    beanGeom.scale(1.0, 0.6, 1.2);

    // Inner Mouth Geometry
    const innerMouthGeom = new THREE.SphereGeometry(0.06, 16, 16);
    innerMouthGeom.scale(1.0, 0.8, 0.6);

    // --- Cat Skeleton & Mesh Groups ---
    const catGroup = new THREE.Group();
    scene.add(catGroup);

    // Cushion base (receives shadow)
    const cushionGeom = new THREE.CylinderGeometry(1.2, 1.25, 0.15, 32);
    const cushion = new THREE.Mesh(cushionGeom, whiteMat);
    cushion.position.set(0, -1.02, 0.1);
    cushion.receiveShadow = true;
    catGroup.add(cushion);

    // Body (chubby sphere - casts and receives shadow)
    const bodyGeom = new THREE.SphereGeometry(0.85, 32, 32);
    bodyGeom.scale(1.0, 1.15, 0.9);
    const body = new THREE.Mesh(bodyGeom, orangeMat);
    body.name = "body";
    body.castShadow = true;
    body.receiveShadow = true;
    catGroup.add(body);

    // Belly spot (white)
    const bellyGeom = new THREE.SphereGeometry(0.65, 32, 32);
    bellyGeom.scale(1.0, 1.0, 0.4);
    const belly = new THREE.Mesh(bellyGeom, whiteMat);
    belly.position.set(0, -0.15, 0.65);
    belly.name = "belly";
    belly.receiveShadow = true;
    catGroup.add(belly);

    // Head Group (parented to catGroup for gaze offset)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.82, 0.1);
    catGroup.add(headGroup);

    const headGeom = new THREE.SphereGeometry(0.72, 32, 32);
    headGeom.scale(1.1, 0.9, 0.9);
    const head = new THREE.Mesh(headGeom, orangeMat);
    head.name = "head";
    head.castShadow = true;
    head.receiveShadow = true;
    headGroup.add(head);

    // Left Ear
    const earGeom = new THREE.ConeGeometry(0.22, 0.45, 4);
    earGeom.translate(0, 0.22, 0); // move pivot to base
    const leftEar = new THREE.Mesh(earGeom, orangeMat);
    leftEar.position.set(-0.42, 0.48, 0.05);
    leftEar.rotation.set(-0.1, 0, 0.28);
    leftEar.castShadow = true;
    leftEar.name = "left_ear";
    headGroup.add(leftEar);

    // Left Inner Ear pink
    const innerEarGeom = new THREE.ConeGeometry(0.14, 0.32, 4);
    innerEarGeom.translate(0, 0.16, 0);
    const leftInnerEar = new THREE.Mesh(innerEarGeom, pinkMat);
    leftInnerEar.position.set(0, 0.05, 0.06);
    leftEar.add(leftInnerEar);

    // Left Inner Ear Fluff (White)
    const leftFluff = new THREE.Mesh(fluffGeom, whiteMat);
    leftFluff.position.set(0, 0.08, 0.04);
    leftEar.add(leftFluff);

    // Right Ear
    const rightEar = leftEar.clone();
    rightEar.position.x = 0.42;
    rightEar.rotation.z = -0.28;
    rightEar.name = "right_ear";
    headGroup.add(rightEar);

    // Eyes
    const eyeGeom = new THREE.SphereGeometry(0.12, 16, 16);
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(-0.28, 0.1, 0.62);
    headGroup.add(leftEye);

    const rightEye = leftEye.clone();
    rightEye.position.x = 0.28;
    headGroup.add(rightEye);

    // Eye reflection Sparkles
    const sparkleGeom = new THREE.SphereGeometry(0.035, 8, 8);
    const leftSparkle1 = new THREE.Mesh(sparkleGeom, sparkleMat);
    leftSparkle1.position.set(0.045, 0.045, 0.07);
    leftEye.add(leftSparkle1);

    const rightSparkle1 = leftSparkle1.clone();
    rightEye.add(rightSparkle1);

    // Muzzle (Snout protrusion)
    const muzzleGeom = new THREE.SphereGeometry(0.12, 16, 16);
    muzzleGeom.scale(1.1, 1.0, 0.85);
    const leftMuzzle = new THREE.Mesh(muzzleGeom, whiteMat);
    leftMuzzle.position.set(-0.08, -0.06, 0.65);
    leftMuzzle.castShadow = true;
    leftMuzzle.receiveShadow = true;
    leftMuzzle.name = "muzzle";
    headGroup.add(leftMuzzle);

    const rightMuzzle = leftMuzzle.clone();
    rightMuzzle.position.x = 0.08;
    rightMuzzle.name = "muzzle";
    headGroup.add(rightMuzzle);

    // Whiskers (3 on each side)
    // Invisible, generously-sized hit-areas so the (very thin) whiskers are
    // easy to touch — these are what the raycaster actually catches.
    const whiskerHitGeom = new THREE.BoxGeometry(0.3, 0.18, 0.14);
    const whiskerHitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

    const leftWhiskers = new THREE.Group();
    leftWhiskers.position.set(-0.16, -0.06, 0.66);
    headGroup.add(leftWhiskers);

    for (let i = 0; i < 3; i++) {
      const w = new THREE.Mesh(whiskerGeom, whiskerMat);
      w.name = "whisker_left";
      w.position.set(-0.12, (i - 1) * 0.045, 0);
      w.rotation.z = (i - 1) * 0.15; // fan out
      w.rotation.y = 0.2; // bend forward
      leftWhiskers.add(w);
    }
    const leftWhiskerHit = new THREE.Mesh(whiskerHitGeom, whiskerHitMat);
    leftWhiskerHit.name = "whisker_left";
    leftWhiskerHit.position.set(-0.12, 0, 0);
    leftWhiskers.add(leftWhiskerHit);

    const rightWhiskers = new THREE.Group();
    rightWhiskers.position.set(0.16, -0.06, 0.66);
    headGroup.add(rightWhiskers);

    for (let i = 0; i < 3; i++) {
      const w = new THREE.Mesh(whiskerGeom, whiskerMat);
      w.name = "whisker_right";
      w.position.set(0.12, (i - 1) * 0.045, 0);
      w.rotation.z = -(i - 1) * 0.15; // fan out
      w.rotation.y = -0.2; // bend forward
      rightWhiskers.add(w);
    }
    const rightWhiskerHit = new THREE.Mesh(whiskerHitGeom, whiskerHitMat);
    rightWhiskerHit.name = "whisker_right";
    rightWhiskerHit.position.set(0.12, 0, 0);
    rightWhiskers.add(rightWhiskerHit);

    // Nose (sits forward on muzzle)
    const noseGeom = new THREE.ConeGeometry(0.05, 0.06, 3);
    const nose = new THREE.Mesh(noseGeom, pinkMat);
    nose.position.set(0, -0.01, 0.73);
    nose.rotation.set(Math.PI, 0, 0);
    nose.castShadow = true;
    nose.name = "nose";
    headGroup.add(nose);

    // Cheeks (blush planes)
    const cheekGeom = new THREE.SphereGeometry(0.12, 16, 16);
    cheekGeom.scale(1.2, 0.65, 0.3);
    const leftCheek = new THREE.Mesh(cheekGeom, pinkMat);
    leftCheek.position.set(-0.38, -0.06, 0.63);
    leftCheek.name = "cheek";
    headGroup.add(leftCheek);

    const rightCheek = leftCheek.clone();
    rightCheek.position.x = 0.38;
    rightCheek.name = "cheek";
    headGroup.add(rightCheek);

    // Cheek tufts (fluff on sides)
    const leftTuft = new THREE.Mesh(tuftGeom, orangeMat);
    leftTuft.position.set(-0.55, -0.15, 0.2);
    leftTuft.rotation.set(0.2, 0, 0.1);
    headGroup.add(leftTuft);

    const rightTuft = new THREE.Mesh(tuftGeom, orangeMat);
    rightTuft.position.set(0.55, -0.15, 0.2);
    rightTuft.rotation.set(0.2, 0, -0.1);
    rightTuft.rotation.y = Math.PI; // point outward
    headGroup.add(rightTuft);

    // Mouth (curved under the muzzle)
    const mouthGeom = new THREE.SphereGeometry(0.045, 8, 8);
    mouthGeom.scale(1.0, 0.6, 0.3);
    const leftMouth = new THREE.Mesh(mouthGeom, darkMat);
    leftMouth.position.set(-0.05, -0.12, 0.7);
    leftMouth.rotation.z = -0.18;
    headGroup.add(leftMouth);

    const rightMouth = leftMouth.clone();
    rightMouth.position.x = 0.05;
    rightMouth.rotation.z = 0.18;
    headGroup.add(rightMouth);

    // Inner open mouth (pink/red, starts scaled to 0)
    const innerMouth = new THREE.Mesh(innerMouthGeom, redMat);
    innerMouth.position.set(0, -0.13, 0.68);
    innerMouth.scale.set(0.001, 0.001, 0.001);
    innerMouth.name = "inner_mouth";
    headGroup.add(innerMouth);

    // Tabby Forehead "M" Stripes
    const centerStripe = new THREE.Mesh(centerStripeGeom, stripeMat);
    centerStripe.position.set(0, 0.38, 0.62);
    centerStripe.rotation.set(0.2, 0, 0);
    headGroup.add(centerStripe);

    const leftForeheadStripe = new THREE.Mesh(leftStripeGeom, stripeMat);
    leftForeheadStripe.position.set(-0.08, 0.36, 0.6);
    leftForeheadStripe.rotation.set(0.2, 0.1, -0.2);
    headGroup.add(leftForeheadStripe);

    const rightForeheadStripe = leftForeheadStripe.clone();
    rightForeheadStripe.position.x = 0.08;
    rightForeheadStripe.rotation.y = -0.1;
    rightForeheadStripe.rotation.z = 0.2;
    headGroup.add(rightForeheadStripe);

    // Tabby Cheek Stripes
    const leftCheekStripe1 = new THREE.Mesh(cheekStripeGeom, stripeMat);
    leftCheekStripe1.position.set(-0.52, 0.08, 0.35);
    leftCheekStripe1.rotation.set(0.1, -0.5, 0.1);
    headGroup.add(leftCheekStripe1);

    const leftCheekStripe2 = leftCheekStripe1.clone();
    leftCheekStripe2.position.set(-0.54, 0.0, 0.32);
    leftCheekStripe2.rotation.z = 0.25;
    headGroup.add(leftCheekStripe2);

    const rightCheekStripe1 = leftCheekStripe1.clone();
    rightCheekStripe1.position.x = 0.52;
    rightCheekStripe1.rotation.y = 0.5;
    rightCheekStripe1.rotation.z = -0.1;
    headGroup.add(rightCheekStripe1);

    const rightCheekStripe2 = leftCheekStripe2.clone();
    rightCheekStripe2.position.x = 0.54;
    rightCheekStripe2.rotation.y = 0.5;
    rightCheekStripe2.rotation.z = -0.25;
    headGroup.add(rightCheekStripe2);

    // Collar & Bell
    const collarGeom = new THREE.TorusGeometry(0.5, 0.04, 8, 24);
    collarGeom.scale(1.0, 1.0, 0.6);
    const collar = new THREE.Mesh(collarGeom, redMat);
    collar.position.set(0, 0.44, 0.2);
    collar.rotation.x = Math.PI / 2.3;
    catGroup.add(collar);

    const bellGeom = new THREE.SphereGeometry(0.075, 16, 16);
    const bell = new THREE.Mesh(bellGeom, goldMat);
    bell.position.set(0, 0.31, 0.65);
    bell.name = "bell";
    bell.castShadow = true;
    catGroup.add(bell);

    // Tail (casts and receives shadow)
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, -0.55, -0.64);
    catGroup.add(tailGroup);

    const tailPartGeom = new THREE.CylinderGeometry(0.07, 0.07, 0.8, 24);
    tailPartGeom.translate(0, 0.4, 0); // shift pivot
    const tailBase = new THREE.Mesh(tailPartGeom, orangeMat);
    tailBase.name = "tail";
    tailBase.castShadow = true;
    tailBase.receiveShadow = true;
    tailGroup.add(tailBase);

    const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), whiteMat);
    tailTip.position.set(0, 0.8, 0);
    tailBase.add(tailTip);

    // --- Cozy 4-Legged Sitting Posture ---
    // Two Front Legs (standing vertically)
    const frontLegGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.45, 24);
    
    const leftFrontLeg = new THREE.Mesh(frontLegGeom, orangeMat);
    leftFrontLeg.position.set(-0.25, -0.68, 0.45);
    leftFrontLeg.castShadow = true;
    leftFrontLeg.receiveShadow = true;
    catGroup.add(leftFrontLeg);

    const leftFrontPaw = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), whiteMat);
    leftFrontPaw.position.set(-0.25, -0.9, 0.52);
    leftFrontPaw.scale.set(1.15, 0.7, 1.35); // flat cute paw
    leftFrontPaw.castShadow = true;
    leftFrontPaw.name = "paw";
    
    // Front paw toe beans
    for (let i = 0; i < 3; i++) {
      const bean = new THREE.Mesh(beanGeom, pinkMat);
      const angle = (i - 1) * 0.45;
      bean.position.set(Math.sin(angle) * 0.08, -0.02, 0.09 + Math.cos(angle) * 0.03);
      leftFrontPaw.add(bean);
    }
    catGroup.add(leftFrontPaw);

    const rightFrontLeg = leftFrontLeg.clone();
    rightFrontLeg.position.x = 0.25;
    catGroup.add(rightFrontLeg);

    const rightFrontPaw = leftFrontPaw.clone();
    rightFrontPaw.position.x = 0.25;
    rightFrontPaw.name = "paw";
    catGroup.add(rightFrontPaw);

    // Two Rear Legs (tucked in at the sides)
    const rearThighGeom = new THREE.SphereGeometry(0.35, 16, 16);
    rearThighGeom.scale(1.0, 1.0, 1.35); // elongated thigh
    
    const leftRearThigh = new THREE.Mesh(rearThighGeom, orangeMat);
    leftRearThigh.position.set(-0.58, -0.68, 0.15);
    leftRearThigh.rotation.set(0, 0.25, 0);
    leftRearThigh.castShadow = true;
    leftRearThigh.receiveShadow = true;
    catGroup.add(leftRearThigh);

    const leftRearPaw = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), whiteMat);
    leftRearPaw.position.set(-0.48, -0.9, 0.48);
    leftRearPaw.scale.set(1.15, 0.7, 1.35);
    leftRearPaw.castShadow = true;
    leftRearPaw.name = "paw";
    
    // Rear paw toe beans
    for (let i = 0; i < 3; i++) {
      const bean = new THREE.Mesh(beanGeom, pinkMat);
      const angle = (i - 1) * 0.45;
      bean.position.set(Math.sin(angle) * 0.08, -0.02, 0.09 + Math.cos(angle) * 0.03);
      leftRearPaw.add(bean);
    }
    catGroup.add(leftRearPaw);

    const rightRearThigh = new THREE.Mesh(rearThighGeom, orangeMat);
    rightRearThigh.position.set(0.58, -0.68, 0.15);
    rightRearThigh.rotation.set(0, -0.25, 0);
    rightRearThigh.castShadow = true;
    rightRearThigh.receiveShadow = true;
    catGroup.add(rightRearThigh);

    const rightRearPaw = leftRearPaw.clone();
    rightRearPaw.position.x = 0.48;
    rightRearPaw.name = "paw";
    catGroup.add(rightRearPaw);

    // --- Accessory Meshes for Feed/Play Actions ---
    // 3D Fish (Cone + Cylinder)
    const fishGroup = new THREE.Group();
    const fishBodyGeom = new THREE.ConeGeometry(0.18, 0.5, 8);
    fishBodyGeom.rotateX(Math.PI / 2);
    const fishBody = new THREE.Mesh(fishBodyGeom, fishMat);
    fishGroup.add(fishBody);

    const fishTailGeom = new THREE.ConeGeometry(0.12, 0.22, 3);
    fishTailGeom.rotateZ(Math.PI / 2);
    const fishTail = new THREE.Mesh(fishTailGeom, fishMat);
    fishTail.position.set(0, 0, -0.32);
    fishGroup.add(fishTail);

    fishGroup.visible = false;
    scene.add(fishGroup);

    // 3D Yarn Ball (Sphere + Torus loops)
    const yarnGroup = new THREE.Group();
    const yarnCore = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), yarnMat);
    yarnGroup.add(yarnCore);

    const loopGeom = new THREE.TorusGeometry(0.25, 0.015, 6, 24);
    const loop1 = new THREE.Mesh(loopGeom, yarnMat);
    loop1.rotation.y = Math.PI / 4;
    yarnGroup.add(loop1);

    const loop2 = new THREE.Mesh(loopGeom, yarnMat);
    loop2.rotation.x = Math.PI / 4;
    yarnGroup.add(loop2);

    yarnGroup.visible = false;
    scene.add(yarnGroup);

    // --- Interactive Logic Variables ---
    let targetHeadRotY = 0;
    let targetHeadRotX = 0;
    let currentHeadRotY = 0;
    let currentHeadRotX = 0;

    let targetBodyY = 0;
    let currentBodyY = 0;

    // React timers
    let earTwitchL = 0;
    let earTwitchR = 0;
    let tailWagTime = 0;
    let tailWagSpeed = 3.0;

    // Backflip variables
    let flipActive = false;
    let flipProgress = 0;

    // Feeding parameters
    let feedTime = 0;

    // Play params
    let playTime = 0;

    // Blush pulsing
    let blushTime = 0;

    // Drag-to-rotate state
    let isDragging = false;
    let hasDragged = false;
    let prevPointerX = 0;
    let prevPointerY = 0;
    let targetGroupRotY = 0;
    let targetGroupRotX = 0;

    // --- Raycasting setup for poking ---
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // Trigger reactive meow/purr feedback on poking parts
    const handlePoke = (meshName: string) => {
      // Spawn floating hearts above head when petting/poking directly
      const spawnH = () => {
        setHearts((prev) => [
          ...prev,
          {
            id: Math.random(),
            x: 100 + Math.random() * 56,
            y: 80 - Math.random() * 15,
          },
        ]);
      };
      spawnH();
      setTimeout(spawnH, 150);
      setTimeout(spawnH, 300);

      if (meshName.includes("whisker")) {
        // Whisker tickle → twitch the nearer ear and purr.
        if (meshName.includes("left")) earTwitchL = 1.0;
        else earTwitchR = 1.0;
        synth.playPurrSample();
        setMood("happy");
        setTimeout(() => setMood("idle"), 1200);
      } else if (meshName.includes("ear")) {
        if (meshName.includes("left")) earTwitchL = 1.0;
        else earTwitchR = 1.0;
        synth.playMeowSample(true);
      } else if (meshName.includes("tail")) {
        tailWagSpeed = 25.0; // wag super fast
        synth.playMeowSample(true);
      } else if (meshName.includes("body") || meshName.includes("belly")) {
        targetBodyY = 0.4; // small hop
        synth.playPurr();
      } else {
        // Head, nose, cheeks, bell
        targetHeadRotX = 0.3;
        targetHeadRotY = -0.2;
        leftCheek.scale.set(1.6, 1.6, 1.6);
        rightCheek.scale.set(1.6, 1.6, 1.6);
        synth.playMeowSample();
        setMood("happy");
        setTimeout(() => setMood("idle"), 1200);
      }
    };

    // --- Pointer Event Listeners ---
    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      hasDragged = false;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - prevPointerX;
        const deltaY = e.clientY - prevPointerY;
        
        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
          hasDragged = true;
        }

        targetGroupRotY += deltaX * 0.008;
        targetGroupRotX += deltaY * 0.008;
        // Clamp vertical rotation to avoid flipping upside down
        targetGroupRotX = Math.max(-0.6, Math.min(0.6, targetGroupRotX));

        prevPointerX = e.clientX;
        prevPointerY = e.clientY;
      } else {
        // Standard cursor tracking (hover)
        const rect = canvas.getBoundingClientRect();
        const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        targetHeadRotY = mx * 0.38;
        targetHeadRotX = -my * 0.28;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      
      // If client didn't drag, treat it as a Poke click!
      if (!hasDragged) {
        const rect = canvas.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(catGroup.children, true);

        if (intersects.length > 0) {
          const firstIntersect = intersects[0].object;
          handlePoke(firstIntersect.name || "head");
        }
      }
    };

    const onPointerLeave = () => {
      isDragging = false;
      // Recenter gaze
      targetHeadRotX = 0;
      targetHeadRotY = 0;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);

    // --- Animation loop ---
    let frameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Mirror stateRef action
      const action = actionRef.current;
      const st = stateRef.current;

      // 1. Idle Bobbing
      const idleBob = Math.sin(elapsed * 2.2) * 0.035;
      
      // 2. Body Hop easing (poke feedback)
      currentBodyY += (targetBodyY - currentBodyY) * 0.15;
      if (targetBodyY > 0) {
        targetBodyY -= delta * 1.5;
        if (targetBodyY < 0) targetBodyY = 0;
      }
      catGroup.position.y = idleBob + currentBodyY;

      // 3. Head rotation gaze-tracking
      let activeHeadTargetY = targetHeadRotY;
      let activeHeadTargetX = targetHeadRotX;

      // Camera gaze tracking input if available
      if (st.present && !isDragging) {
        activeHeadTargetY = st.gaze.x * 0.45;
        activeHeadTargetX = -st.gaze.y * 0.35;
      }

      // Overrides if petting/backflipping
      if (action === "petting") {
        if (!flipActive) {
          flipActive = true;
          flipProgress = 0;
          synth.playPurr();
          setEnergy(energy + 8);
        }
      }

      if (flipActive) {
        flipProgress += delta * 1.45; // takes ~0.7 seconds
        catGroup.rotation.z = Math.sin(flipProgress * Math.PI) * 0.2; // cute tilt
        catGroup.rotation.y = flipProgress * Math.PI * 2; // full 360 spin
        catGroup.position.y = Math.sin(flipProgress * Math.PI) * 0.9 + idleBob;
        if (flipProgress >= 1) {
          flipActive = false;
          catGroup.rotation.z = 0;
          catGroup.rotation.y = targetGroupRotY;
          catGroup.position.y = idleBob;
          setActiveAction("none");
        }
      } else {
        // Ease group drag rotation
        catGroup.rotation.y += (targetGroupRotY - catGroup.rotation.y) * 0.15;
        catGroup.rotation.x += (targetGroupRotX - catGroup.rotation.x) * 0.15;
      }

      // 4. Action Animations (Feed & Play)
      // Feeding 3D Fish
      if (action === "feeding") {
        if (feedTime === 0) {
          fishGroup.visible = true;
          fishGroup.position.set(-2.2, -0.6, 1.2);
          synth.playCrunch();
        }
        feedTime += delta * 1.5;

        // Animate fish flying to mouth
        if (feedTime < 0.6) {
          fishGroup.position.x = -2.2 + feedTime * 3.6; // slide right
          fishGroup.position.y = -0.6 + Math.sin((feedTime / 0.6) * Math.PI) * 1.2; // arches up
          fishGroup.rotation.z = Math.sin(feedTime * 10) * 0.3; // wiggle
        } else if (feedTime < 1.0) {
          // Eating (chewing head-bob)
          fishGroup.visible = false;
          headGroup.position.y = 0.82 + Math.sin(elapsed * 18.0) * 0.08;
          leftMouth.scale.y = 2.0 * Math.sin(elapsed * 12.0);
          rightMouth.scale.y = 2.0 * Math.sin(elapsed * 12.0);
        } else {
          // Completed
          feedTime = 0;
          fishGroup.visible = false;
          leftMouth.scale.y = 1;
          rightMouth.scale.y = 1;
          headGroup.position.y = 0.82;
          setEnergy(energy + 15);
          setActiveAction("none");
        }
      }

      // Playing with Yarn
      if (action === "playing") {
        if (playTime === 0) {
          yarnGroup.visible = true;
          yarnGroup.position.set(-2.5, 0, 1.0);
          synth.playMeow(true);
        }
        playTime += delta * 0.65; // ~1.5s duration

        if (playTime < 1.0) {
          // Yarn bounces across viewport
          const x = -2.2 + playTime * 4.4;
          const y = -0.5 + Math.abs(Math.sin(playTime * Math.PI * 3)) * 1.1;
          yarnGroup.position.set(x, y, 1.0);
          yarnGroup.rotation.x += 0.15;
          yarnGroup.rotation.y += 0.15;

          // Cat tracks yarn in 3D
          activeHeadTargetY = (x / 2.2) * 0.6;
          activeHeadTargetX = (y / 1.1) * 0.25;

          // Rapid tail wagging
          tailWagSpeed = 26.0;
        } else {
          // Completed
          playTime = 0;
          yarnGroup.visible = false;
          tailWagSpeed = 3.0;
          setEnergy(energy - 10);
          setActiveAction("none");
        }
      }

      // 5. Gaze tracking head rotation damping and winking/mood shapes
      currentHeadRotY += (activeHeadTargetY - currentHeadRotY) * 0.18;
      currentHeadRotX += (activeHeadTargetX - currentHeadRotX) * 0.18;
      headGroup.rotation.y = currentHeadRotY;
      headGroup.rotation.x = currentHeadRotX;

      const curMood = st.mood;
      let targetEyeScaleY = 1.0;
      if (winkingRef.current || curMood === "happy" || action === "petting") {
        targetEyeScaleY = 0.05; // wink/closed
      } else if (curMood === "sleepy") {
        targetEyeScaleY = 0.3; // sleepy lids
      }
      
      leftEye.scale.y += (targetEyeScaleY - leftEye.scale.y) * 0.25;
      rightEye.scale.y += (targetEyeScaleY - rightEye.scale.y) * 0.25;

      // 6. Speaking mouth movement (head bobs, mouth wiggles, open mouth, head sway, faster tail)
      const isSpeaking = st.speaking;
      if (isSpeaking) {
        // Mouth lines scale
        const mouthScale = 1.0 + Math.abs(Math.sin(elapsed * 16.0)) * 2.8;
        leftMouth.scale.y = mouthScale;
        rightMouth.scale.y = mouthScale;
        
        // Inner mouth mesh opens/closes
        const openScale = 0.6 + Math.abs(Math.sin(elapsed * 16.0)) * 0.9;
        innerMouth.scale.set(openScale, openScale, openScale);
        
        // Head bob Y
        headGroup.position.y = 0.82 + Math.sin(elapsed * 12.0) * 0.025;
        
        // Gentle head sway Z
        headGroup.rotation.z = Math.sin(elapsed * 4.5) * 0.06;
      } else if (action === "feeding") {
        // When eating, inner mouth open/close wiggles
        if (feedTime >= 0.6 && feedTime < 1.0) {
          const openScale = Math.abs(Math.sin(elapsed * 18.0)) * 1.1;
          innerMouth.scale.set(openScale, openScale, openScale);
        } else {
          innerMouth.scale.set(0.001, 0.001, 0.001);
        }
        headGroup.rotation.z = 0;
      } else {
        leftMouth.scale.y = 1.0;
        rightMouth.scale.y = 1.0;
        headGroup.position.y = 0.82;
        headGroup.rotation.z = 0;
        innerMouth.scale.set(0.001, 0.001, 0.001);
      }

      // 7. Ear twitches
      if (earTwitchL > 0) {
        leftEar.rotation.z = 0.28 + Math.sin(elapsed * 25.0) * 0.16 * earTwitchL;
        earTwitchL -= delta * 1.5;
      } else {
        leftEar.rotation.z = 0.28;
      }

      if (earTwitchR > 0) {
        rightEar.rotation.z = -0.28 - Math.sin(elapsed * 25.0) * 0.16 * earTwitchR;
        earTwitchR -= delta * 1.5;
      } else {
        rightEar.rotation.z = -0.28;
      }

      // 8. Cheek blush pulsing
      blushTime += delta * (action === "petting" ? 12.0 : 3.0);
      const blushScale = 1.0 + (action === "petting" ? 0.3 * Math.sin(blushTime) : 0);
      leftCheek.scale.set(1.2 * blushScale, 0.65 * blushScale, 0.3);
      rightCheek.scale.set(1.2 * blushScale, 0.65 * blushScale, 0.3);

      // Decay cheek poked scale
      if (leftCheek.scale.x > 1.2 * blushScale) {
        leftCheek.scale.x -= delta * 1.2;
        leftCheek.scale.y -= delta * 0.6;
        rightCheek.scale.x -= delta * 1.2;
        rightCheek.scale.y -= delta * 0.6;
      }

      // 9. Tail wiggles
      tailWagTime += delta * tailWagSpeed;
      tailBase.rotation.z = Math.sin(tailWagTime) * 0.25;
      tailBase.rotation.x = -0.7 + Math.cos(tailWagTime * 0.5) * 0.15;

      // Decay tail wag speed back to normal
      if (tailWagSpeed > 3.0 && !isSpeaking && action !== "playing") {
        tailWagSpeed -= delta * 12.0;
        if (tailWagSpeed < 3.0) tailWagSpeed = 3.0;
      } else if (isSpeaking) {
        tailWagSpeed = 7.0; // speed up tail wag slightly when speaking
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    animate();

    // --- Resize handler ---
    const handleResize = () => {
      const w = container.clientWidth || 240;
      const h = container.clientHeight || 240;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // --- Cleanup ---
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameId);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      renderer.dispose();
      ambient.dispose();
      dirLight.dispose();
      fillLight.dispose();
      orangeMat.dispose();
      whiteMat.dispose();
      pinkMat.dispose();
      darkMat.dispose();
      eyeMat.dispose();
      sparkleMat.dispose();
      redMat.dispose();
      goldMat.dispose();
      yarnMat.dispose();
      fishMat.dispose();
      cushionGeom.dispose();
      bodyGeom.dispose();
      bellyGeom.dispose();
      headGeom.dispose();
      earGeom.dispose();
      innerEarGeom.dispose();
      eyeGeom.dispose();
      sparkleGeom.dispose();
      muzzleGeom.dispose();
      noseGeom.dispose();
      cheekGeom.dispose();
      mouthGeom.dispose();
      collarGeom.dispose();
      bellGeom.dispose();
      tailPartGeom.dispose();
      frontLegGeom.dispose();
      rearThighGeom.dispose();
      fishBodyGeom.dispose();
      fishTailGeom.dispose();
      loopGeom.dispose();
      whiskerGeom.dispose();
      whiskerMat.dispose();
      whiskerHitGeom.dispose();
      whiskerHitMat.dispose();
      stripeMat.dispose();
      centerStripeGeom.dispose();
      leftStripeGeom.dispose();
      cheekStripeGeom.dispose();
      tuftGeom.dispose();
      fluffGeom.dispose();
      beanGeom.dispose();
      innerMouthGeom.dispose();
    };
  }, []);

  return (
    <div className="flex flex-col items-center select-none w-full">
      {/* 3D Viewport container */}
      <div 
        ref={containerRef}
        className="relative w-64 h-64 flex items-center justify-center bg-transparent touch-none"
      >
        {/* Floating Heart Particles */}
        <AnimatePresence>
          {hearts.map((h) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, scale: 0.3, y: h.y, x: h.x - 128 }}
              animate={{ 
                opacity: [0, 1, 1, 0],
                scale: [0.3, 1.4, 1.0, 0.7],
                y: h.y - 110,
                x: [h.x - 128, h.x - 128 + 18, h.x - 128 - 18, h.x - 128 + 8]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, ease: "easeOut" }}
              className="absolute text-3xl pointer-events-none text-[var(--color-rose)] z-10 select-none drop-shadow-[0_2px_8px_rgba(244,63,94,0.4)]"
            >
              💖
            </motion.div>
          ))}
        </AnimatePresence>

        <canvas 
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
        />
        
        {/* User drag instruction helper */}
        <div className="absolute bottom-2 text-[10px] text-[var(--color-ink-soft)]/50 pointer-events-none select-none">
          Drag to spin · Poke parts
        </div>
      </div>

      {/* Interactive Action toolbar */}
      <div className="flex items-center gap-3 mt-2 bg-[var(--color-surface-2)]/60 px-4 py-2 rounded-full border border-[var(--color-line)] shadow-sm">
        <button
          onClick={() => {
            if (activeAction === "none") {
              setActiveAction("petting");
            }
          }}
          disabled={activeAction !== "none"}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-[var(--color-line)] hover:bg-[var(--color-rose)]/10 hover:border-[var(--color-rose)] transition disabled:opacity-40 select-none cursor-pointer"
        >
          <span>💖</span>
          <span className="text-[var(--color-ink)]">Pet</span>
        </button>
        <button
          onClick={() => {
            if (activeAction === "none") {
              setActiveAction("feeding");
            }
          }}
          disabled={activeAction !== "none"}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-[var(--color-line)] hover:bg-[var(--color-mint)]/10 hover:border-[var(--color-mint)] transition disabled:opacity-40 select-none cursor-pointer"
        >
          <span>🐟</span>
          <span className="text-[var(--color-ink)]">Feed</span>
        </button>
        <button
          onClick={() => {
            if (activeAction === "none") {
              setActiveAction("playing");
            }
          }}
          disabled={activeAction !== "none"}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-[var(--color-line)] hover:bg-[var(--color-amber)]/10 hover:border-[var(--color-amber)] transition disabled:opacity-40 select-none cursor-pointer"
        >
          <span>🧶</span>
          <span className="text-[var(--color-ink)]">Play</span>
        </button>
      </div>
    </div>
  );
}
