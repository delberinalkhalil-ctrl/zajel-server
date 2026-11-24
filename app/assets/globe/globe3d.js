/* Zajel 3D: WebGL globe, 3D pigeon, route arcs and rendered 3D icons. Needs THREE, d3, topojson, WORLD. */
window.createGlobe3D = function () {
  const T = window.THREE;
  if (!T || !window.d3 || !window.topojson || !window.WORLD) return null;
  let R;
  try { R = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  if (!R.getContext()) return null;
  R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  R.outputColorSpace = T.SRGBColorSpace;
  R.toneMapping = T.ACESFilmicToneMapping;
  R.toneMappingExposure = 1.05;
  R.domElement.id = 'gl3';
  R.domElement.setAttribute('aria-label', 'الكرة الأرضية ومسار الزاجل');

  const D = Math.PI / 180, V = (x, y, z) => new T.Vector3(x, y, z), Y = V(0, 1, 0);
  const ll = (lon, lat, r = 1) => { const ph = (lon + 180) * D, th = (90 - lat) * D; return V(-r * Math.cos(ph) * Math.sin(th), r * Math.cos(th), r * Math.sin(ph) * Math.sin(th)); };

  /* ---------- environment for metal and feathers ---------- */
  const pm = new T.PMREMGenerator(R);
  const envS = new T.Scene();
  {
    const c = document.createElement('canvas'); c.width = 16; c.height = 256;
    const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#dcecff'); g.addColorStop(.5, '#8ea9c9'); g.addColorStop(1, '#262b35');
    x.fillStyle = g; x.fillRect(0, 0, 16, 256);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
    envS.add(new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.MeshBasicMaterial({ map: t, side: T.BackSide })));
    const lm = new T.MeshBasicMaterial({ color: 0xffffff }); lm.color.multiplyScalar(2.2);
    [[4, 5, 3], [-5, 3, -2], [0, 6, -5], [3, -1, 5]].forEach(p => { const m = new T.Mesh(new T.PlaneGeometry(3, 3), lm); m.position.set(...p); m.lookAt(0, 0, 0); envS.add(m); });
  }
  const ENV = pm.fromScene(envS, 0.03).texture;

  /* ---------- materials ---------- */
  const std = (color, rough = .7, metal = 0, extra = {}) => new T.MeshStandardMaterial(Object.assign({ color, roughness: rough, metalness: metal, envMap: ENV, envMapIntensity: .55 }, extra));
  const M = {
    body: std(0x7d8899, .8), breast: std(0x9aa4b2, .82), head: std(0x8893a4, .78),
    neck: std(0x3c8a78, .32, .55, { emissive: 0x15302c, emissiveIntensity: .25 }), neck2: std(0x7a5aa8, .32, .55),
    wing: std(0x8f9bab, .75, 0, { side: T.DoubleSide }), bar: std(0x2f3644, .8, 0, { side: T.DoubleSide }), dark: std(0x2b323f, .8, 0, { side: T.DoubleSide }),
    beak: std(0x2c2c30, .5), cere: std(0xeef1f4, .6), eye: std(0xe9731a, .25, .1), pupil: std(0x0a0a0a, .2), foot: std(0xd97c86, .6),
    cap: std(0xffffff, .4), red: std(0xd7263d, .45), blue: std(0x1d4ed8, .45),
    gold: std(0xe8a317, .28, 1, { envMapIntensity: 1.1 }), gold2: std(0xf5c242, .22, 1, { envMapIntensity: 1.2 })
  };
  /* airmail envelope textures (front: seal and flap, back: plain) */
  function envTex(front) {
    const w = 512, h = 314, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    const pg = x.createLinearGradient(0, 0, w, h); pg.addColorStop(0, '#f4ead6'); pg.addColorStop(1, '#e6d8bc'); x.fillStyle = pg; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(120,90,50,${Math.random() * .05})`; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); } // paper grain
    // red / blue diagonal airmail border
    x.save(); x.beginPath(); x.rect(0, 0, w, h); x.rect(18, 18, w - 36, h - 36); x.clip('evenodd');
    for (let k = -h; k < w + h; k += 44) { [['#c8323c', 0], ['#f4ead6', 11], ['#2a4fa0', 22], ['#f4ead6', 33]].forEach(([col, o]) => { x.fillStyle = col; x.beginPath(); x.moveTo(k + o, 0); x.lineTo(k + o + 11, 0); x.lineTo(k + o + 11 - h, h); x.lineTo(k + o - h, h); x.fill(); }); }
    x.restore();
    if (front) {
      x.strokeStyle = 'rgba(110,80,40,.35)'; x.lineWidth = 3; x.beginPath(); x.moveTo(20, 20); x.lineTo(w / 2, h * .6); x.lineTo(w - 20, 20); x.moveTo(20, h - 20); x.lineTo(w * .4, h * .48); x.moveTo(w - 20, h - 20); x.lineTo(w * .6, h * .48); x.stroke();
      const cx = w / 2, cy = h * .6, r = 44; // wax seal
      const sg = x.createRadialGradient(cx - 12, cy - 14, 4, cx, cy, r); sg.addColorStop(0, '#e0525a'); sg.addColorStop(.6, '#b3202b'); sg.addColorStop(1, '#7c1219');
      x.fillStyle = sg; x.beginPath(); for (let a = 0; a <= 40; a++) { const t = a / 40 * Math.PI * 2, rr = r + Math.sin(t * 9) * 3; x.lineTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr); } x.fill();
      x.strokeStyle = 'rgba(80,8,12,.6)'; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, r * .68, 0, Math.PI * 2); x.stroke();
      x.fillStyle = 'rgba(70,6,10,.75)'; x.beginPath(); // small pigeon emblem
      x.moveTo(cx - 18, cy + 2); x.quadraticCurveTo(cx - 6, cy - 22, cx + 4, cy - 4); x.quadraticCurveTo(cx + 14, cy - 18, cx + 20, cy - 10); x.quadraticCurveTo(cx + 10, cy + 2, cx + 2, cy + 6); x.quadraticCurveTo(cx - 8, cy + 14, cx - 18, cy + 2); x.fill();
    }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  M.envFront = std(0xffffff, .85, 0, { map: envTex(true), envMapIntensity: .3 });
  M.envBack = std(0xffffff, .85, 0, { map: envTex(false), envMapIntensity: .3 });
  M.paper = std(0xeadcc0, .9);

  /* ---------- 3D pigeon ---------- */
  function sph(r, mat, sx, sy, sz, x, y, z, seg = 24) { const m = new T.Mesh(new T.SphereGeometry(r, seg, Math.round(seg * .66)), mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); return m; }
  function flat(shape, mat, depth = .025) { const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: .008, bevelSize: .01, bevelSegments: 1, curveSegments: 10 }); const m = new T.Mesh(g, mat); m.rotation.x = Math.PI / 2; return m; }
  function wingShape() { const s = new T.Shape(); s.moveTo(0, .26); s.quadraticCurveTo(.62, .36, 1.18, .06); s.lineTo(1.6, -.24); s.quadraticCurveTo(1.05, -.36, .62, -.56); s.lineTo(.08, -.46); s.closePath(); return s; }
  function tipShape() { const s = new T.Shape(); s.moveTo(1.08, .08); s.lineTo(1.6, -.24); s.quadraticCurveTo(1.3, -.3, .98, -.36); s.quadraticCurveTo(1.04, -.12, 1.08, .08); return s; }
  function makeBird() {
    const g = new T.Group();
    g.add(sph(1, M.body, .44, .4, .92, 0, 0, 0));
    g.add(sph(1, M.breast, .41, .38, .5, 0, -.06, .42));
    g.add(sph(1, M.neck, .29, .33, .34, 0, .21, .7));
    g.add(sph(1, M.neck2, .24, .2, .16, 0, .13, .8));
    g.add(sph(.27, M.head, 1, 1, 1.05, 0, .42, .96));
    const beak = new T.Mesh(new T.ConeGeometry(.055, .26, 14), M.beak); beak.rotation.x = Math.PI / 2; beak.position.set(0, .37, 1.28); g.add(beak);
    g.add(sph(.075, M.cere, 1.1, .8, 1.2, 0, .43, 1.16, 14));
    [-1, 1].forEach(sd => { g.add(sph(.058, M.eye, 1, 1, 1, sd * .185, .48, 1.04, 14)); g.add(sph(.03, M.pupil, 1, 1, 1, sd * .232, .485, 1.06, 10)); });
    const ts = new T.Shape(); ts.moveTo(-.17, 0); ts.lineTo(-.34, -.9); ts.quadraticCurveTo(0, -1.02, .34, -.9); ts.lineTo(.17, 0); ts.closePath();
    const tail = flat(ts, M.wing, .03); tail.position.set(0, .06, -.66); g.add(tail);
    const tb = new T.Shape(); tb.moveTo(-.31, -.76); tb.lineTo(-.34, -.9); tb.quadraticCurveTo(0, -1.02, .34, -.9); tb.lineTo(.31, -.76); tb.quadraticCurveTo(0, -.86, -.31, -.76);
    const band = flat(tb, M.dark, .03); band.position.set(0, .075, -.66); g.add(band);
    const wings = [];
    [1, -1].forEach(sd => {
      const pv = new T.Group(); pv.position.set(sd * .3, .2, .12);
      const inner = new T.Group(); inner.scale.x = sd;
      const w = flat(wingShape(), M.wing); inner.add(w);
      const tip = flat(tipShape(), M.dark, .03); tip.position.y = .012; inner.add(tip);
      [[.5, -.1, .55], [.46, -.27, .5]].forEach(([x, z, l]) => { const b = new T.Mesh(new T.BoxGeometry(l, .012, .05), M.bar); b.position.set(x, .03, z); b.rotation.y = .28; inner.add(b); });
      pv.add(inner); g.add(pv); wings.push({ pv, sd });
    });
    const legs = new T.Group();
    [-1, 1].forEach(sd => { const l = new T.Mesh(new T.CylinderGeometry(.03, .025, .32, 8), M.foot); l.position.set(sd * .12, -.48, .12); legs.add(l); });
    g.add(legs);
    // the letter: an airmail envelope with a red wax seal, held in the beak
    const env = new T.Mesh(new T.BoxGeometry(.7, .43, .014), [M.paper, M.paper, M.paper, M.paper, M.envFront, M.envBack]);
    env.position.set(.02, .12, 1.52); env.rotation.set(0, Math.PI / 2 + .12, .16); g.add(env);
    return {
      g, wings, legs,
      pose(t, folded) {
        if (folded) { wings.forEach(({ pv, sd }) => pv.rotation.set(0, sd * 1.28, -sd * .12)); legs.rotation.x = 0; legs.position.y = 0; }
        else { const a = Math.sin(t) * .95 + .12; wings.forEach(({ pv, sd }) => pv.rotation.set(0, sd * .08, sd * a)); legs.rotation.x = -.9; legs.position.set(0, -.05, -.15); }
      }
    };
  }

  /* ---------- earth textures ---------- */
  function earthTex() {
    const W = 2048, H = 1024, w = window.WORLD, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), feats = topojson.feature(w, w.objects.countries).features, land = topojson.merge(w, w.objects.countries.geometries);
    const pr = d3.geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2]), pa = d3.geoPath(pr, x);
    let g = x.createLinearGradient(0, 0, 0, H);
    [[0, '#0a2346'], [.18, '#0d386b'], [.5, '#0f5394'], [.82, '#0d386b'], [1, '#0a2346']].forEach(s => g.addColorStop(...s));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.save(); x.filter = 'blur(9px)'; x.strokeStyle = 'rgba(70,175,205,.6)'; x.lineWidth = 16; x.beginPath(); pa(land); x.stroke(); x.restore();
    const L = document.createElement('canvas'); L.width = W; L.height = H; const y = L.getContext('2d'), pl = d3.geoPath(pr, y);
    y.fillStyle = '#000'; y.beginPath(); pl(land); y.fill();
    y.globalCompositeOperation = 'source-atop';
    g = y.createLinearGradient(0, 0, 0, H);
    const band = [[90, '#f3f6f9'], [73, '#e6ecf0'], [67, '#8d8f74'], [59, '#3c5a33'], [46, '#4e7836'], [37, '#7f9450'], [29, '#c6a067'], [19, '#bf9b62'], [11, '#3d7631'], [0, '#2e6829']];
    band.forEach(([la, col]) => { g.addColorStop((90 - la) / 180, col); if (la > 0) g.addColorStop((90 + la) / 180, la >= 66 ? '#f3f6f9' : col); });
    y.fillStyle = g; y.fillRect(0, 0, W, H);
    feats.forEach(f => {
      const [lo, la] = d3.geoCentroid(f), a = Math.abs(la); let col = null;
      if (f.id === '304' || f.id === '010') col = '#eef3f6';
      else if (a >= 14 && a <= 36 && ((lo > -20 && lo < 75) || (lo > 110 && lo < 155 && la < 0) || (lo > -118 && lo < -98 && la > 0))) col = 'rgba(204,166,106,.88)';
      if (col) { y.fillStyle = col; y.beginPath(); pl(f); y.fill(); }
    });
    const N = document.createElement('canvas'); N.width = 512; N.height = 256; const nx = N.getContext('2d'), id = nx.createImageData(512, 256);
    for (let i = 0; i < id.data.length; i += 4) { const v = 170 + Math.random() * 85; id.data[i] = v; id.data[i + 1] = v; id.data[i + 2] = v; id.data[i + 3] = 255; }
    nx.putImageData(id, 0, 0);
    y.globalCompositeOperation = 'multiply'; y.drawImage(N, 0, 0, W, H);
    y.globalCompositeOperation = 'destination-in'; y.fillStyle = '#000'; y.beginPath(); pl(land); y.fill();
    y.globalCompositeOperation = 'source-over';
    x.drawImage(L, 0, 0);
    x.strokeStyle = 'rgba(255,255,255,.3)'; x.lineWidth = 1.3; x.beginPath(); pa(topojson.mesh(w, w.objects.countries, (a, b) => a !== b)); x.stroke();
    const S = document.createElement('canvas'); S.width = 1024; S.height = 512; const s = S.getContext('2d');
    s.fillStyle = '#a0a0a0'; s.fillRect(0, 0, 1024, 512); s.fillStyle = '#000'; s.beginPath();
    d3.geoPath(d3.geoEquirectangular().scale(1024 / (2 * Math.PI)).translate([512, 256]), s)(land); s.fill();
    const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace; map.anisotropy = R.capabilities.getMaxAnisotropy();
    return { map, spec: new T.CanvasTexture(S) };
  }
  function cloudTex() {
    const W = 768, H = 384, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), im = x.createImageData(W, H), P = new Uint8Array(512); let sd = 11;
    for (let i = 0; i < 256; i++) P[i] = i;
    for (let i = 255; i > 0; i--) { sd = sd * 16807 % 2147483647; const j = sd % (i + 1), t = P[i]; P[i] = P[j]; P[j] = t; }
    for (let i = 0; i < 256; i++) P[i + 256] = P[i];
    const h = (i, j, k) => P[P[P[i & 255] + (j & 255)] + (k & 255)] / 255, f = t => t * t * (3 - 2 * t), lp = (a, b, t) => a + (b - a) * t;
    const vn = (X, Yy, Z) => {
      const xi = Math.floor(X), yi = Math.floor(Yy), zi = Math.floor(Z), xf = f(X - xi), yf = f(Yy - yi), zf = f(Z - zi);
      return lp(lp(lp(h(xi, yi, zi), h(xi + 1, yi, zi), xf), lp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), xf), yf),
        lp(lp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), xf), lp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), xf), yf), zf);
    };
    for (let py = 0; py < H; py++) {
      const lat = 90 - (py + .5) / H * 180, th = (90 - lat) * D, st = Math.sin(th), ct = Math.cos(th), mid = 1 - Math.min(1, Math.abs(Math.abs(lat) - 48) / 70) * .35;
      for (let px = 0; px < W; px++) {
        const ph = ((px + .5) / W * 360) * D, vx = -Math.cos(ph) * st, vz = Math.sin(ph) * st;
        let n = 0, a = .5, fr = 2.3;
        for (let o = 0; o < 5; o++) { n += a * vn(vx * fr + 7.1, ct * fr * 1.6 + 3.3, vz * fr + 5.7); a *= .5; fr *= 2.05; }
        const al = Math.max(0, Math.min(1, (n * mid - .43) / .2)), i = (py * W + px) * 4;
        im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = al * 230;
      }
    }
    x.putImageData(im, 0, 0);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  }

  /* ---------- scene ---------- */
  const scene = new T.Scene(); scene.background = new T.Color(0x02060f);
  const cam = new T.PerspectiveCamera(40, 1, .005, 200);
  // The real sun: lights the Earth (day, night with city lights) and the clouds. A soft light that follows the camera
  // keeps the pigeons readable even over the night side.
  const sun = new T.DirectionalLight(0xfff4e6, 2.2); scene.add(sun); scene.add(sun.target);
  const fill = new T.DirectionalLight(0xdfe8ff, .9); scene.add(fill); scene.add(fill.target);
  scene.add(new T.AmbientLight(0x5f7799, .35));
  const sunDir = V(1, 0, 0);
  function realSun(now) {
    const d = new Date(now), start = Date.UTC(d.getUTCFullYear(), 0, 0), doy = (now - start) / 864e5;
    const decl = -23.44 * Math.cos(2 * Math.PI / 365 * (doy + 10));
    const h = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
    return ll(-(h - 12) * 15, decl, 1);
  }

  const earthGeo = new T.SphereGeometry(1, 160, 80);
  let earthMat = new T.MeshBasicMaterial({ color: 0x0b2a52 });
  const earth = new T.Mesh(earthGeo, earthMat); scene.add(earth);
  function photoEarth(tx) {
    const tex = (img, srgb) => { const t = new T.Texture(img); if (srgb) t.colorSpace = T.SRGBColorSpace; t.anisotropy = R.capabilities.getMaxAnisotropy(); t.needsUpdate = true; return t; };
    return new T.ShaderMaterial({
      uniforms: {
        dayMap: { value: tex(tx.day, true) }, nightMap: { value: tex(tx.night, true) },
        waterMap: { value: tex(tx.water) }, bumpMap: { value: tex(tx.bump) },
        sunDir: { value: sunDir }, texel: { value: new T.Vector2(1 / 2048, 1 / 1024) }
      },
      vertexShader: 'varying vec2 vUv;varying vec3 vN;varying vec3 vW;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader: [
        'uniform sampler2D dayMap,nightMap,waterMap,bumpMap;uniform vec3 sunDir;uniform vec2 texel;',
        'varying vec2 vUv;varying vec3 vN;varying vec3 vW;',
        'void main(){',
        ' vec3 n=normalize(vN);vec3 v=normalize(cameraPosition-vW);',
        // terrain relief from the NASA height map
        ' float h0=texture2D(bumpMap,vUv).r,hu=texture2D(bumpMap,vUv+vec2(texel.x,0.)).r,hv=texture2D(bumpMap,vUv+vec2(0.,texel.y)).r;',
        ' vec3 east=normalize(cross(vec3(0.,1.,0.),n)+vec3(1e-5));vec3 north=cross(n,east);',
        ' vec3 nb=normalize(n-(hu-h0)*5.*east-(hv-h0)*5.*north);',
        ' float d=dot(nb,sunDir),dn=dot(n,sunDir);',
        ' float day=smoothstep(-.12,.22,dn);',
        ' vec3 col=texture2D(dayMap,vUv).rgb;',
        ' float water=texture2D(waterMap,vUv).r;',
        ' vec3 lit=col*(max(d,0.)*1.35+.035);',
        // warm light near the terminator (sunrise / sunset)
        ' float tw=exp(-pow(dn*6.,2.));lit+=col*vec3(1.,.45,.2)*tw*.35*day;',
        // sun glint on the oceans
        ' vec3 hv2=normalize(sunDir+v);float sp=pow(max(dot(n,hv2),0.),160.)*water*day;lit+=vec3(1.,.93,.8)*sp*.5;',
        ' lit+=vec3(.06,.12,.22)*water*max(dn,0.)*.4;',
        // city lights on the night side
        ' vec3 nl=texture2D(nightMap,vUv).rgb;lit+=nl*vec3(1.,.82,.55)*(1.-day)*1.7;',
        // atmosphere haze at the rim, brighter on the day side
        ' float rim=pow(1.-max(dot(n,v),0.),3.);lit+=vec3(.3,.55,1.)*rim*.45*smoothstep(-.35,.35,dn);',
        ' gl_FragColor=vec4(lit,1.);',
        ' #include <tonemapping_fragment>',
        ' #include <colorspace_fragment>',
        '}'
      ].join('\n')
    });
  }
  (function loadEarth() {
    const fallback = () => { const ET = earthTex(); earth.material = new T.MeshPhongMaterial({ map: ET.map, specularMap: ET.spec, specular: new T.Color(0x4a6f99), shininess: 24 }); };
    const Z = window.ZTEX; if (!Z) { fallback(); return; }
    const keys = ['day', 'night', 'water', 'bump'], imgs = {}; let left = keys.length, failed = false;
    keys.forEach(k => {
      const im = new Image();
      im.onload = () => { imgs[k] = im; if (--left === 0 && !failed) { try { earth.material = photoEarth(imgs); } catch (e) { fallback(); } } };
      im.onerror = () => { if (!failed) { failed = true; fallback(); } };
      im.src = Z[k];
    });
  })();
  const clouds = new T.Mesh(new T.SphereGeometry(1.012, 96, 48), new T.ShaderMaterial({
    uniforms: { map: { value: null }, useR: { value: 0 }, sunDir: { value: sunDir } }, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv;varying vec3 vN;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform sampler2D map;uniform float useR;uniform vec3 sunDir;varying vec2 vUv;varying vec3 vN;void main(){vec4 t=texture2D(map,vUv);float a=mix(t.a,t.r,useR);float d=dot(normalize(vN),sunDir);float l=max(d,0.)*1.15+.025;vec3 c=vec3(1.)*l+vec3(1.,.5,.25)*exp(-pow(d*6.,2.))*.25;gl_FragColor=vec4(c,a*.88*(.25+.75*smoothstep(-.25,.15,d)));\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'
  }));
  clouds.visible = false; scene.add(clouds);
  (function loadClouds() {
    const proc = () => setTimeout(() => { clouds.material.uniforms.map.value = cloudTex(); clouds.material.uniforms.useR.value = 0; clouds.visible = true; }, 60);
    const src = window.ZTEX && window.ZTEX.clouds; if (!src) { proc(); return; }
    const im = new Image();
    im.onload = () => { const t = new T.Texture(im); t.anisotropy = R.capabilities.getMaxAnisotropy(); t.needsUpdate = true; clouds.material.uniforms.map.value = t; clouds.material.uniforms.useR.value = 1; clouds.visible = true; };
    im.onerror = proc; im.src = src;
  })();
  const glowV = 'varying vec3 vN;varying vec3 vV;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}';
  scene.add(new T.Mesh(new T.SphereGeometry(1.085, 96, 48), new T.ShaderMaterial({
    vertexShader: glowV, transparent: true, depthWrite: false, side: T.BackSide, blending: T.AdditiveBlending,
    fragmentShader: 'varying vec3 vN;varying vec3 vV;void main(){float d=clamp(-dot(vN,vV),0.,1.);float i=pow(d,2.2)*2.4;gl_FragColor=vec4(vec3(.32,.6,1.)*i,1.);}'
  })));
  scene.add(new T.Mesh(new T.SphereGeometry(1.004, 96, 48), new T.ShaderMaterial({
    vertexShader: glowV, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    fragmentShader: 'varying vec3 vN;varying vec3 vV;void main(){float i=pow(1.-clamp(dot(vN,vV),0.,1.),3.5)*.9;gl_FragColor=vec4(vec3(.4,.68,1.)*i,1.);}'
  })));
  {
    const n = 1800, p = new Float32Array(n * 3); let s = 3;
    const r = () => (s = s * 16807 % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) { const u = r() * 2 - 1, a = r() * Math.PI * 2, q = Math.sqrt(1 - u * u); p[i * 3] = 60 * q * Math.cos(a); p[i * 3 + 1] = 60 * u; p[i * 3 + 2] = 60 * q * Math.sin(a); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(p, 3));
    scene.add(new T.Points(g, new T.PointsMaterial({ color: 0xffffff, size: .14, sizeAttenuation: true, transparent: true, opacity: .85 })));
  }
  function pin(color) {
    const g = new T.Group(), m = std(color, .35, .2, { emissive: color, emissiveIntensity: .35 });
    const st = new T.Mesh(new T.CylinderGeometry(.0022, .0022, .035, 8), std(0xffffff, .4)); st.position.y = .0175; g.add(st);
    const hd = new T.Mesh(new T.SphereGeometry(.009, 20, 14), m); hd.position.y = .037; g.add(hd);
    return g;
  }
  function place(o, lon, lat, r = 1) { const n = ll(lon, lat, 1); o.position.copy(n).multiplyScalar(r); o.quaternion.setFromUnitVectors(Y, n); return o; }
  const homePin = pin(0xd7263d); scene.add(homePin);
  const ripple = new T.Mesh(new T.RingGeometry(.85, 1, 48), new T.MeshBasicMaterial({ color: 0xffd75e, transparent: true, side: T.DoubleSide, depthWrite: false }));
  ripple.visible = false; scene.add(ripple);
  const landPins = new Map(), routes = new Map();
  const birds = [makeBird(), makeBird(), makeBird()]; birds.forEach(b => { b.g.visible = false; scene.add(b.g); });
  const perch = makeBird(); scene.add(perch.g);

  function route(f) {
    if (routes.has(f)) return routes.get(f);
    const k = Math.max(.35, Math.min(1, f.km / 9000)), alt = t => .014 + .09 * k * Math.sin(Math.PI * t);
    const P = t => { const q = f.ip(Math.max(0, Math.min(1, t))); return ll(q[0], q[1], 1 + alt(t)); };
    const pts = []; for (let i = 0; i <= 160; i++) pts.push(P(i / 160));
    const dash = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineDashedMaterial({ color: 0xffffff, dashSize: .012, gapSize: .01, transparent: true, opacity: .75 }));
    dash.computeLineDistances();
    const tube = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 200, .0032, 6, false), new T.MeshBasicMaterial({ color: 0xffd75e }));
    const dp = pin(0xffd75e); place(dp, f.to.c[0], f.to.c[1]);
    scene.add(dash, tube, dp);
    const o = { dash, tube, dp, P }; routes.set(f, o); return o;
  }

  /* ---------- labels ---------- */
  let wrap = null, labs = null; const labEls = new Map();
  // A label pinned to a point on the globe. With `who` ({name, photo}) it shows the person's photo and name above the text.
  function label(key, pos, text, cls, W, H, show, who) {
    let el = labEls.get(key);
    if (!el) { el = document.createElement('div'); el.className = 'g3l ' + (cls || ''); labs.appendChild(el); labEls.set(key, el); }
    const cn = 'g3l ' + (cls || ''); if (el.className !== cn) el.className = cn;
    const sig = who ? text + '|' + (who.name || '') + '|' + (who.photo || '') : text;
    if (el.dataset.sig !== sig) {
      el.dataset.sig = sig; el.textContent = '';
      if (who) {
        const av = document.createElement('div'); av.className = 'av';
        if (who.photo) { const im = document.createElement('img'); im.src = who.photo; im.alt = ''; im.onerror = () => { im.remove(); av.textContent = (who.name || '?').trim().charAt(0); }; av.appendChild(im); }
        else av.textContent = (who.name || '?').trim().charAt(0);
        el.appendChild(av);
        if (who.name) { const nm = document.createElement('b'); nm.textContent = who.name; el.appendChild(nm); }
        const cy = document.createElement('span'); cy.textContent = text; el.appendChild(cy);
      } else el.textContent = text;
    }
    const camDir = cam.position.clone().sub(pos), vis = show && pos.clone().normalize().dot(camDir) > 0;
    const p = pos.clone().project(cam);
    if (!vis || p.z > 1) { el.style.display = 'none'; return; }
    el.style.display = ''; el.style.transform = `translate(${(p.x * .5 + .5) * W}px,${(-p.y * .5 + .5) * H}px) translate(-50%,0)`;
    el.dataset.seen = '1';
  }

  /* ---------- camera rig ---------- */
  const rig = { pos: ll(44, 15, 2.8), look: V(0, 0, 0), up: Y.clone() };
  let size = [0, 0];
  const recentT = (l, now) => st0.last === l && now - l.t < 9000;
  let st0 = { last: null };
  function frame(now, st) {
    st0 = st;
    if (!wrap) return;
    const W = wrap.clientWidth, H = wrap.clientHeight; if (!W || !H) return;
    if (size[0] !== W || size[1] !== H) { R.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); size = [W, H]; }
    const home = st.home.c; place(homePin, home[0], home[1]);
    labEls.forEach(el => el.dataset.seen = '');
    // routes
    const live = new Set(st.flights);
    routes.forEach((o, f) => { if (!live.has(f)) { scene.remove(o.dash, o.tube, o.dp); o.dash.geometry.dispose(); o.tube.geometry.dispose(); routes.delete(f); } });
    let lead = null;
    st.flights.forEach((f, i) => {
      const o = route(f), p = f.p, b = birds[i];
      o.tube.geometry.setDrawRange(0, Math.floor(p * 200) * 6 * 6);
      const B = o.P(p), Fw = o.P(p + .003).sub(B).normalize(), U = B.clone().normalize();
      const up = U.clone().sub(Fw.clone().multiplyScalar(U.dot(Fw))).normalize(), rt = up.clone().cross(Fw).normalize();
      b.g.visible = true; b.g.position.copy(B).addScaledVector(up, Math.sin(now * .028) * .0015);
      b.g.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(rt, up, Fw));
      b.pose(now * .028 + i, false);
      const cd = cam.position.distanceTo(B); b.g.scale.setScalar(.018 * (1 + Math.max(0, cd - .25) * (i ? 1.4 : 1.1)));
      label('d' + i, ll(f.to.c[0], f.to.c[1], 1.05), f.reveal ? f.to.city : '؟', 'dst', W, H, true);
      if (!i) lead = { B, Fw, up, p, rt };
    });
    birds.forEach((b, i) => { if (i >= st.flights.length) b.g.visible = false; });
    // landed pins
    st.landed.forEach(l => {
      let pn = landPins.get(l); if (!pn) { pn = pin(0x3b82f6); place(pn, l.c[0], l.c[1]); scene.add(pn); landPins.set(l, pn); }
      const fresh = recentT(l, now);
      label('l' + l.t, ll(l.c[0], l.c[1], 1), l.label, fresh ? 'lnd who big' : 'lnd who', W, H, true, { name: l.name, photo: l.photo });
    });
    landPins.forEach((pn, l) => { if (!st.landed.includes(l)) { scene.remove(pn); landPins.delete(l); } });
    const recent = st.last && now - st.last.t < 9000 ? st.last : null;
    if (recent) {
      const q = ((now - recent.t) / 1300) % 1; place(ripple, recent.c[0], recent.c[1], 1.002);
      ripple.quaternion.setFromUnitVectors(V(0, 0, 1), ripple.position.clone().normalize());
      ripple.scale.setScalar(.01 + q * .06); ripple.material.opacity = 1 - q; ripple.visible = true;
    } else ripple.visible = false;
    // perched bird
    const restC = recent ? recent.c : home, restN = ll(restC[0], restC[1], 1);
    perch.g.visible = !st.flights.length;
    if (perch.g.visible) {
      const east = Y.clone().cross(restN).normalize(), up = restN.clone();
      perch.pose(0, true);
      const sc = .016 * (1 + Math.max(0, cam.position.distanceTo(restN) - .3) * 1.8);
      perch.g.scale.setScalar(sc);
      perch.g.position.copy(restN).multiplyScalar(1 + .045 + .62 * sc + Math.abs(Math.sin(now / 420)) * .1 * sc);
      perch.g.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(up.clone().cross(east).normalize(), up, east));
    }
    label('home', ll(home[0], home[1], 1), st.home.label || st.home.city, 'home', W, H, true);
    labEls.forEach((el, k) => { if (!el.dataset.seen) el.style.display = 'none'; });
    // camera target
    let tp, tl, tu, a = .06;
    if (lead) {
      const z = .07 + 1.75 * Math.pow(Math.sin(Math.PI * lead.p), 1.5);
      tp = lead.B.clone().addScaledVector(lead.up, .028 + z * .85).addScaledVector(lead.Fw, -(.06 + z * .5)).addScaledVector(lead.rt, .07 + z * .25);
      tl = lead.B.clone().multiplyScalar(1 - Math.min(.55, z * .3)); tu = lead.up; a = .07;
    } else if (recent) {
      tp = restN.clone().multiplyScalar(1.2).addScaledVector(Y.clone().sub(restN.clone().multiplyScalar(restN.y)).normalize(), -.3);
      tl = restN.clone(); tu = Y;
    } else {
      tp = ll(home[0] + st.drag.lon + Math.sin(now / 6500) * 9, Math.max(-75, Math.min(75, home[1] - 16 + st.drag.lat)), 2.75);
      tl = V(0, 0, 0); tu = Y; a = st.dragging ? .25 : .05;
    }
    rig.pos.lerp(tp, a); rig.look.lerp(tl, .1); rig.up.lerp(tu, .06).normalize();
    if (rig.pos.length() < 1.03) rig.pos.setLength(1.03);
    cam.position.copy(rig.pos); cam.up.copy(rig.up); cam.lookAt(rig.look);
    const fwd = rig.look.clone().sub(rig.pos).normalize(), right = fwd.clone().cross(rig.up).normalize();
    sunDir.copy(realSun(now)); sun.position.copy(sunDir).multiplyScalar(10);
    fill.position.copy(rig.pos).addScaledVector(right, -1.6).addScaledVector(rig.up, 1.4).setLength(10);
    clouds.rotation.y = now * .000006;
    clouds.material.visible = st.effects !== 'light' && st.effects !== 'off';
    R.render(scene, cam);
  }

  /* ---------- rendered icons ---------- */
  function icon(kind, px) {
    const s = new T.Scene(), c = new T.PerspectiveCamera(30, 1, .1, 50);
    s.environment = ENV;
    const l = new T.DirectionalLight(0xfff2e0, 2.2); l.position.set(-3, 4, 5); s.add(l); const l2 = new T.DirectionalLight(0x9fc0ff, .8); l2.position.set(4, -1, -3); s.add(l2); s.add(new T.AmbientLight(0xffffff, .25));
    if (kind === 'bird') {
      const b = makeBird(); b.pose(1.1, false); b.g.rotation.set(.12, -Math.PI / 2 + .45, .06); s.add(b.g);
      c.position.set(0, .35, 6.4); c.lookAt(0, .25, 0);
    } else if (kind === 'coin') {
      const g = new T.Group();
      g.add(new T.Mesh(new T.CylinderGeometry(1, 1, .2, 72), M.gold));
      const rim = new T.Mesh(new T.TorusGeometry(.86, .05, 16, 72), M.gold2); rim.rotation.x = Math.PI / 2; rim.position.y = .1; g.add(rim);
      const face = new T.Mesh(new T.CylinderGeometry(.78, .78, .22, 72), M.gold2); g.add(face);
      const bb = makeBird(); bb.pose(1.2, false); bb.g.traverse(m => { if (m.isMesh) m.material = M.gold; });
      bb.g.scale.setScalar(.34); bb.g.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(V(0, 1, 0), V(0, 0, -1), V(-1, 0, 0))); bb.g.position.set(-.02, .14, .08); g.add(bb.g);
      g.rotation.set(Math.PI / 2 - .38, 0, .22); s.add(g); c.position.set(0, 0, 4.6); c.lookAt(0, 0, 0);
    } else if (kind === 'crown') {
      const g = new T.Group();
      g.add(new T.Mesh(new T.CylinderGeometry(1, .92, .55, 64, 1, true), Object.assign(M.gold.clone(), { side: T.DoubleSide })));
      const tr = new T.Mesh(new T.TorusGeometry(.96, .07, 14, 64), M.gold2); tr.rotation.x = Math.PI / 2; tr.position.y = -.25; g.add(tr);
      for (let i = 0; i < 6; i++) {
        const an = i / 6 * Math.PI * 2, sp = new T.Mesh(new T.ConeGeometry(.24, .72, 4), M.gold); sp.position.set(Math.cos(an) * .9, .6, Math.sin(an) * .9); g.add(sp);
        const ball = new T.Mesh(new T.SphereGeometry(.1, 16, 12), M.gold2); ball.position.set(Math.cos(an) * .9, .99, Math.sin(an) * .9); g.add(ball);
        const gem = new T.Mesh(new T.SphereGeometry(.11, 20, 14), i % 2 ? std(0x1d4ed8, .08, .1) : std(0xd7263d, .08, .1)); gem.position.set(Math.cos(an + .52) * 1.0, -.02, Math.sin(an + .52) * 1.0); gem.scale.z = .6; gem.lookAt(0, -.02, 0); g.add(gem);
      }
      g.rotation.x = .38; s.add(g); c.position.set(0, .1, 5.4); c.lookAt(0, .2, 0);
    }
    R.setSize(px, px, false); R.setClearColor(0x000000, 0); s.background = null;
    R.render(s, c); const url = R.domElement.toDataURL('image/png');
    size = [0, 0]; return url;
  }

  return {
    ok: true, canvas: R.domElement, icon,
    mount(el) {
      if (wrap === el && el.contains(R.domElement)) return;
      wrap = el; el.classList.add('g3'); el.prepend(R.domElement);
      labs = document.createElement('div'); labs.className = 'g3labs'; el.appendChild(labs); labEls.clear();
    },
    frame
  };
};
