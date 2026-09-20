// Render on demand: changing the canvas also invalidates the glass backdrop filters.
// Animation is opt-in; the default material does no continuous idle repainting.
const fragment = `
precision mediump float;
uniform vec2 resolution;
uniform float dark;
uniform float time;
void main() {
  vec2 p = (gl_FragCoord.xy / resolution - .5) * vec2(resolution.x / resolution.y, 1.);
  float t = .65 + time * .035;
  float bend = sin(p.y * 4.2 + t) * .20 + sin(p.y * 7. + p.x * 2. - t) * .07;
  float wave = p.x + bend + .12 * sin(p.y * 2. - t);
  // Broad pearl folds provide a scene for refraction without bright zebra bands.
  float folds = sin(wave * 5. + p.y * 1.4);
  float light = .83 + .035 * folds;
  float rim = pow(max(0., sin(wave * 5. + p.y * 1.4 + .7)), 5.);
  vec3 pearl = vec3(light * .97, light * .985, light) + rim * .045;
  pearl = mix(pearl, pearl * .26 + vec3(.018, .025, .04), dark);
  gl_FragColor = vec4(pearl, 1.);
}`

function mountBackground(canvas: HTMLCanvasElement) {
  const root = canvas.parentElement!
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  const transparency = matchMedia('(prefers-reduced-transparency: reduce)')
  const contrast = matchMedia(
    '(prefers-contrast: more), (forced-colors: active)',
  )
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  })
  if (!gl) return
  let program: WebGLProgram | null = null
  let buffer: WebGLBuffer | null = null
  let resolutionUniform: WebGLUniformLocation | null = null
  let darkUniform: WebGLUniformLocation | null = null
  let timeUniform: WebGLUniformLocation | null = null
  let timer = 0
  let elapsed = 0
  let previous = 0
  let frame = 0
  let disposed = false

  function init() {
    const shaders: WebGLShader[] = []
    program = gl!.createProgram()
    if (!program) return false
    for (const [type, source] of [
      [
        gl!.VERTEX_SHADER,
        'attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}',
      ],
      [gl!.FRAGMENT_SHADER, fragment],
    ] as const) {
      const shader = gl!.createShader(type)
      if (!shader) return false
      shaders.push(shader)
      gl!.shaderSource(shader, source)
      gl!.compileShader(shader)
      gl!.attachShader(program, shader)
    }
    gl!.linkProgram(program)
    for (const shader of shaders) gl!.deleteShader(shader)
    if (!gl!.getProgramParameter(program, gl!.LINK_STATUS)) return false
    gl!.useProgram(program)
    buffer = gl!.createBuffer()
    gl!.bindBuffer(gl!.ARRAY_BUFFER, buffer)
    gl!.bufferData(
      gl!.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl!.STATIC_DRAW,
    )
    const position = gl!.getAttribLocation(program, 'position')
    gl!.enableVertexAttribArray(position)
    gl!.vertexAttribPointer(position, 2, gl!.FLOAT, false, 0, 0)
    resolutionUniform = gl!.getUniformLocation(program, 'resolution')
    darkUniform = gl!.getUniformLocation(program, 'dark')
    timeUniform = gl!.getUniformLocation(program, 'time')
    return true
  }
  function stop() {
    clearTimeout(timer)
    cancelAnimationFrame(frame)
    previous = 0
  }
  function draw(now: number) {
    frame = 0
    if (disposed || gl!.isContextLost()) return
    const animate = root.dataset.glassAnimation === 'true' && !motion.matches
    if (animate && previous) elapsed += Math.min(now - previous, 200)
    previous = animate ? now : 0
    gl!.uniform1f(timeUniform, elapsed / 1000)
    gl!.uniform2f(resolutionUniform, canvas.width, canvas.height)
    gl!.uniform1f(darkUniform, root.dataset.themeMode === 'dark' ? 1 : 0)
    gl!.drawArrays(gl!.TRIANGLES, 0, 3)
    if (animate)
      timer = window.setTimeout(() => {
        frame = requestAnimationFrame(draw)
      }, 50)
  }
  function update() {
    stop()
    const active =
      root.dataset.themePack === 'glass' &&
      !document.hidden &&
      !transparency.matches &&
      !contrast.matches
    canvas.style.display =
      active && program && !gl!.isContextLost() ? 'block' : 'none'
    if (canvas.style.display === 'none') return
    // Ignore devicePixelRatio: CSS interpolation is desirable for this soft material.
    const width = root.clientWidth,
      height = root.clientHeight
    const scale = Math.min(
      1,
      960 / Math.max(width, height),
      Math.sqrt(400000 / Math.max(1, width * height)),
    )
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    gl!.viewport(0, 0, canvas.width, canvas.height)
    frame = requestAnimationFrame(draw)
  }
  function lost(event: Event) {
    event.preventDefault()
    stop()
    canvas.style.display = 'none'
  }
  function restored() {
    if (init()) update()
  }
  if (!init()) {
    gl.deleteProgram(program)
    gl.deleteBuffer(buffer)
    return
  }
  const resize = new ResizeObserver(update)
  resize.observe(root)
  const theme = new MutationObserver(update)
  theme.observe(root, {
    attributes: true,
    attributeFilter: [
      'data-theme-pack',
      'data-theme-mode',
      'data-glass-animation',
    ],
  })
  document.addEventListener('visibilitychange', update)
  for (const query of [motion, transparency, contrast])
    query.addEventListener('change', update)
  canvas.addEventListener('webglcontextlost', lost)
  canvas.addEventListener('webglcontextrestored', restored)
  update()
  return () => {
    disposed = true
    stop()
    resize.disconnect()
    theme.disconnect()
    document.removeEventListener('visibilitychange', update)
    for (const query of [motion, transparency, contrast])
      query.removeEventListener('change', update)
    canvas.removeEventListener('webglcontextlost', lost)
    canvas.removeEventListener('webglcontextrestored', restored)
    gl.deleteBuffer(buffer)
    gl.deleteProgram(program)
  }
}

export const GlassBackground = () => (
  <canvas
    attr:aria-hidden="true"
    ref={mountBackground}
    css={`
      display: none;
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      pointer-events: none;
    `}
  />
)
