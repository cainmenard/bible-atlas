import { VERTEX_SHADER, FRAGMENT_SHADER } from "./arc-shaders";
import { GENRE_COLORS } from "./colors";

const GENRE_COLOR_LIST = Object.values(GENRE_COLORS);
const SEGMENTS = 128; // vertices per arc (128-segment polyline, doubled for triangle strip)

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vs: WebGLShader,
  fs: WebGLShader
): WebGLProgram {
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${info}`);
  }
  return program;
}

export class ArcRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private instanceBuffer: WebGLBuffer;
  private arcCount = 0;
  private disposed = false;

  // Uniform locations
  private loc_resolution: WebGLUniformLocation;
  private loc_offsetX: WebGLUniformLocation;
  private loc_scaleX: WebGLUniformLocation;
  private loc_totalVerses: WebGLUniformLocation;
  private loc_margin: WebGLUniformLocation;
  private loc_axisY: WebGLUniformLocation;
  private loc_maxArcHeight: WebGLUniformLocation;
  private loc_maxArcHeightBelow: WebGLUniformLocation;
  private loc_selStart: WebGLUniformLocation;
  private loc_selEnd: WebGLUniformLocation;
  private loc_genreColors: WebGLUniformLocation;
  private loc_alphaDefault: WebGLUniformLocation;
  private loc_alphaHighlight: WebGLUniformLocation;
  private loc_alphaDimmed: WebGLUniformLocation;
  private loc_lineWidth: WebGLUniformLocation;
  private loc_dpr: WebGLUniformLocation;
  private loc_zoomAlpha: WebGLUniformLocation;

  // Stored data for context restoration
  private rawArcs: number[][] | null = null;
  private rawVisibility: Float32Array | null = null;
  private totalVerses = 0;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: true,
      premultipliedAlpha: false,
    });
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;

    // Compile shaders and link program
    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    this.program = createProgram(gl, vs, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    // Cache uniform locations
    const u = (name: string) => gl.getUniformLocation(this.program, name)!;
    this.loc_resolution = u("u_resolution");
    this.loc_offsetX = u("u_offsetX");
    this.loc_scaleX = u("u_scaleX");
    this.loc_totalVerses = u("u_totalVerses");
    this.loc_margin = u("u_margin");
    this.loc_axisY = u("u_axisY");
    this.loc_maxArcHeight = u("u_maxArcHeight");
    this.loc_maxArcHeightBelow = u("u_maxArcHeightBelow");
    this.loc_selStart = u("u_selStart");
    this.loc_selEnd = u("u_selEnd");
    this.loc_genreColors = u("u_genreColors[0]");
    this.loc_alphaDefault = u("u_alphaDefault");
    this.loc_alphaHighlight = u("u_alphaHighlight");
    this.loc_alphaDimmed = u("u_alphaDimmed");
    this.loc_lineWidth = u("u_lineWidth");
    this.loc_dpr = u("u_dpr");
    this.loc_zoomAlpha = u("u_zoomAlpha");

    // Create VAO
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);

    // Shared geometry buffer: triangle strip with (a_t, a_side) pairs
    // For each segment point, we emit two vertices: side=-1 and side=+1
    const stripData = new Float32Array(SEGMENTS * 2 * 2); // SEGMENTS * 2 vertices * 2 floats each
    for (let i = 0; i < SEGMENTS; i++) {
      const t = i / (SEGMENTS - 1);
      const base = i * 4; // 2 vertices * 2 floats
      // Left vertex (side = -1)
      stripData[base] = t;
      stripData[base + 1] = -1.0;
      // Right vertex (side = +1)
      stripData[base + 2] = t;
      stripData[base + 3] = 1.0;
    }
    const stripBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, stripBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, stripData, gl.STATIC_DRAW);

    const STRIP_STRIDE = 2 * Float32Array.BYTES_PER_ELEMENT; // 8 bytes per vertex

    const loc_t = gl.getAttribLocation(this.program, "a_t");
    gl.enableVertexAttribArray(loc_t);
    gl.vertexAttribPointer(loc_t, 1, gl.FLOAT, false, STRIP_STRIDE, 0);
    // divisor 0 = per vertex (default)

    const loc_side = gl.getAttribLocation(this.program, "a_side");
    gl.enableVertexAttribArray(loc_side);
    gl.vertexAttribPointer(loc_side, 1, gl.FLOAT, false, STRIP_STRIDE, 4);
    // divisor 0 = per vertex (default)

    // Instance buffer: (fromIdx, toIdx, genreIdx, visible) per arc
    this.instanceBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);

    const INSTANCE_STRIDE = 4 * Float32Array.BYTES_PER_ELEMENT; // 16 bytes

    const loc_from = gl.getAttribLocation(this.program, "a_fromIdx");
    gl.enableVertexAttribArray(loc_from);
    gl.vertexAttribPointer(loc_from, 1, gl.FLOAT, false, INSTANCE_STRIDE, 0);
    gl.vertexAttribDivisor(loc_from, 1);

    const loc_to = gl.getAttribLocation(this.program, "a_toIdx");
    gl.enableVertexAttribArray(loc_to);
    gl.vertexAttribPointer(loc_to, 1, gl.FLOAT, false, INSTANCE_STRIDE, 4);
    gl.vertexAttribDivisor(loc_to, 1);

    const loc_genre = gl.getAttribLocation(this.program, "a_genreIdx");
    gl.enableVertexAttribArray(loc_genre);
    gl.vertexAttribPointer(loc_genre, 1, gl.FLOAT, false, INSTANCE_STRIDE, 8);
    gl.vertexAttribDivisor(loc_genre, 1);

    const loc_visible = gl.getAttribLocation(this.program, "a_visible");
    gl.enableVertexAttribArray(loc_visible);
    gl.vertexAttribPointer(loc_visible, 1, gl.FLOAT, false, INSTANCE_STRIDE, 12);
    gl.vertexAttribDivisor(loc_visible, 1);

    gl.bindVertexArray(null);

    // Set up genre colors uniform (normalized 0-1)
    gl.useProgram(this.program);
    const colorArray = new Float32Array(10 * 3);
    for (let i = 0; i < GENRE_COLOR_LIST.length && i < 10; i++) {
      const hex = GENRE_COLOR_LIST[i];
      colorArray[i * 3] = parseInt(hex.slice(1, 3), 16) / 255;
      colorArray[i * 3 + 1] = parseInt(hex.slice(3, 5), 16) / 255;
      colorArray[i * 3 + 2] = parseInt(hex.slice(5, 7), 16) / 255;
    }
    gl.uniform3fv(this.loc_genreColors, colorArray);

    // Alpha tiers — tuned for triangle-strip quad lines (~1.5px wide)
    // Wider lines spread color over more area, so these are slightly higher
    // than the old LINE_STRIP values (0.006, 0.035, 0.0012)
    gl.uniform1f(this.loc_alphaDefault, 0.012);
    gl.uniform1f(this.loc_alphaHighlight, 0.06);
    gl.uniform1f(this.loc_alphaDimmed, 0.002);
    gl.uniform1f(this.loc_margin, 40.0);

    // Line width in CSS pixels
    gl.uniform1f(this.loc_lineWidth, 1.5);
    gl.uniform1f(this.loc_dpr, window.devicePixelRatio || 1);
    gl.uniform1f(this.loc_zoomAlpha, 1.0);

    // No selection by default
    gl.uniform1f(this.loc_selStart, -1.0);
    gl.uniform1f(this.loc_selEnd, -1.0);

    // Enable additive blending: src.rgb * src.a + dst.rgb
    // This matches Canvas 2D globalCompositeOperation = "lighter"
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    // Context loss handling
    canvas.addEventListener("webglcontextlost", this.handleContextLost);
    canvas.addEventListener("webglcontextrestored", this.handleContextRestored);
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
  };

  private handleContextRestored = () => {
    // Re-initialization would go here if needed
    // For now, the component will detect the lost context and re-create the renderer
  };

  /** Upload arc data to the GPU. Called once after data loads. */
  setArcData(arcs: number[][], totalVerses: number): void {
    this.rawArcs = arcs;
    this.totalVerses = totalVerses;
    this.arcCount = arcs.length;

    const gl = this.gl;

    // Build instance buffer: (fromIdx, toIdx, genreIdx, visible=1.0)
    const buf = new Float32Array(arcs.length * 4);
    for (let i = 0; i < arcs.length; i++) {
      const off = i * 4;
      buf[off] = arcs[i][0];     // fromIdx
      buf[off + 1] = arcs[i][1]; // toIdx
      buf[off + 2] = arcs[i][2]; // genreIdx
      buf[off + 3] = 1.0;        // visible
    }

    this.rawVisibility = new Float32Array(arcs.length);
    this.rawVisibility.fill(1.0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, buf, gl.DYNAMIC_DRAW);

    gl.useProgram(this.program);
    gl.uniform1f(this.loc_totalVerses, totalVerses);
  }

  /** Update arc visibility based on active verse set (canon filtering). */
  setVisibility(activeVerseSet: Uint8Array): void {
    if (!this.rawArcs) return;
    const gl = this.gl;
    const arcs = this.rawArcs;

    // Rebuild the full buffer with updated visibility
    const buf = new Float32Array(arcs.length * 4);
    for (let i = 0; i < arcs.length; i++) {
      const off = i * 4;
      buf[off] = arcs[i][0];
      buf[off + 1] = arcs[i][1];
      buf[off + 2] = arcs[i][2];
      buf[off + 3] =
        activeVerseSet[arcs[i][0]] && activeVerseSet[arcs[i][1]] ? 1.0 : 0.0;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, buf, gl.DYNAMIC_DRAW);
  }

  /** Update selection range for highlight/dim alpha tiers. */
  setSelection(selStart: number, selEnd: number): void {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.uniform1f(this.loc_selStart, selStart);
    gl.uniform1f(this.loc_selEnd, selEnd);
  }

  /** Render all arcs. Called every frame. */
  render(
    width: number,
    height: number,
    offsetX: number,
    scaleX: number
  ): void {
    if (this.disposed || this.arcCount === 0) return;
    const gl = this.gl;

    const dpr = window.devicePixelRatio || 1;
    const pw = Math.round(width * dpr);
    const ph = Math.round(height * dpr);

    // Resize if needed
    if (gl.canvas.width !== pw || gl.canvas.height !== ph) {
      gl.canvas.width = pw;
      gl.canvas.height = ph;
    }

    gl.viewport(0, 0, pw, ph);

    // Clear with dark background
    gl.clearColor(0.008, 0.02, 0.035, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);

    // Update per-frame uniforms
    const axisY = height * 0.52;
    gl.uniform2f(this.loc_resolution, width, height);
    gl.uniform1f(this.loc_offsetX, offsetX);
    gl.uniform1f(this.loc_scaleX, scaleX);
    gl.uniform1f(this.loc_axisY, axisY);
    gl.uniform1f(this.loc_maxArcHeight, axisY - 20);
    gl.uniform1f(this.loc_maxArcHeightBelow, height - axisY - 30);
    gl.uniform1f(this.loc_dpr, dpr);

    // Zoom-dependent alpha: boost alpha when zoomed in (fewer visible arcs)
    const zoomAlpha = Math.min(3.0, 1.0 + Math.log2(Math.max(1.0, scaleX)) * 0.3);
    gl.uniform1f(this.loc_zoomAlpha, zoomAlpha);

    // Single instanced draw call for all arcs (triangle strip: 2 vertices per segment)
    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, SEGMENTS * 2, this.arcCount);
    gl.bindVertexArray(null);
  }

  /** Clean up all GL resources. */
  dispose(): void {
    this.disposed = true;
    const gl = this.gl;
    const canvas = gl.canvas as HTMLCanvasElement;

    canvas.removeEventListener("webglcontextlost", this.handleContextLost);
    canvas.removeEventListener(
      "webglcontextrestored",
      this.handleContextRestored
    );

    gl.deleteVertexArray(this.vao);
    gl.deleteBuffer(this.instanceBuffer);
    gl.deleteProgram(this.program);
  }
}
