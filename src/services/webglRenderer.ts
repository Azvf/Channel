/**
 * WebGL Shader Renderer for Glass Morphism Effects
 * 使用GLSL shader实现高级毛玻璃效果
 */

export interface ShaderConfig {
    blurRadius: number;
    saturation: number;
    brightness: number;
    contrast: number;
    noiseIntensity: number;
    refractionStrength: number;
}

export class WebGLRenderer {
    private gl: WebGLRenderingContext | null = null;
    private program: WebGLProgram | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private config: ShaderConfig = {
        blurRadius: 20.0,      // 更大的模糊半径，liquidglass风格
        saturation: 1.8,       // 增强饱和度
        brightness: 1.2,       // 提高亮度
        contrast: 1.3,         // 增强对比度
        noiseIntensity: 0.1,   // 微妙的噪声
        refractionStrength: 0.8 // 更强的折射效果
    };

    // Vertex shader source
    private vertexShaderSource = `#version 300 es
        in vec2 a_position;
        in vec2 a_texCoord;
        out vec2 v_texCoord;
        
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_texCoord;
        }
    `;

    // Fragment shader source - 完全基于liquidglass实现
    private fragmentShaderSource = `#version 300 es
        precision highp float;
        
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        uniform sampler2D u_texture;
        uniform sampler2D u_background;
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform float u_blurRadius;
        uniform float u_saturation;
        uniform float u_brightness;
        uniform float u_contrast;
        uniform float u_noiseIntensity;
        uniform float u_refractionStrength;
        
        // 噪声函数
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }
        
        // 柏林噪声
        float noise(vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        
        // 高质量高斯模糊 - liquidglass风格
        vec4 gaussianBlur(sampler2D tex, vec2 uv, float radius) {
            vec2 texelSize = 1.0 / u_resolution;
            vec4 color = vec4(0.0);
            float total = 0.0;
            
            // 更大的采样范围以获得更平滑的模糊
            for (int x = -8; x <= 8; x++) {
                for (int y = -8; y <= 8; y++) {
                    vec2 offset = vec2(float(x), float(y)) * texelSize * radius;
                    float weight = exp(-(x*x + y*y) / (2.0 * 4.0 * 4.0));
                    color += texture(tex, uv + offset) * weight;
                    total += weight;
                }
            }
            return color / total;
        }
        
        // 折射效果 - 基于liquidglass的实现
        vec2 refraction(vec2 uv, float strength) {
            // 使用多层噪声创造复杂的折射
            vec2 noise1 = vec2(
                noise(uv * 6.0 + u_time * 0.2) - 0.5,
                noise(uv * 6.0 + u_time * 0.15 + 100.0) - 0.5
            );
            
            vec2 noise2 = vec2(
                noise(uv * 12.0 + u_time * 0.4) - 0.5,
                noise(uv * 12.0 + u_time * 0.3 + 200.0) - 0.5
            );
            
            vec2 combinedNoise = (noise1 * 0.6 + noise2 * 0.4) * strength;
            return uv + combinedNoise * 0.015;
        }
        
        // 边缘距离计算
        float edgeDistance(vec2 uv) {
            vec2 center = vec2(0.5);
            return length(uv - center);
        }
        
        // 边缘光晕 - liquidglass的核心特性
        vec3 edgeGlow(vec2 uv, vec3 baseColor) {
            float dist = edgeDistance(uv);
            float edge = 1.0 - smoothstep(0.3, 0.5, dist * 2.0);
            vec3 glow = vec3(1.0, 1.0, 1.0) * edge * 0.4;
            return baseColor + glow;
        }
        
        void main() {
            vec2 uv = v_texCoord;
            
            // 获取原始纹理
            vec4 originalColor = texture(u_texture, uv);
            
            // 如果原始纹理是透明的，直接返回
            if (originalColor.a < 0.1) {
                fragColor = originalColor;
                return;
            }
            
            // 折射效果
            vec2 refractedUV = refraction(uv, u_refractionStrength);
            
            // 获取背景纹理
            vec4 backgroundColor = texture(u_background, refractedUV);
            
            // 简单的模糊效果
            vec4 blurredBackground = gaussianBlur(u_background, refractedUV, u_blurRadius * 0.5);
            
            // 玻璃混合
            vec3 glassColor = mix(originalColor.rgb, blurredBackground.rgb, 0.4);
            
            // 添加噪声纹理
            float noiseValue = noise(uv * 20.0 + u_time * 1.0) * u_noiseIntensity;
            glassColor += noiseValue * 0.1;
            
            // 颜色调整
            float luminance = dot(glassColor, vec3(0.299, 0.587, 0.114));
            glassColor = mix(vec3(luminance), glassColor, u_saturation);
            glassColor = (glassColor - 0.5) * u_contrast + 0.5;
            glassColor *= u_brightness;
            
            // 顶部高光
            float topHighlight = smoothstep(0.0, 0.2, uv.y) * smoothstep(1.0, 0.8, uv.y) * 0.6;
            glassColor += topHighlight;
            
            // 中心高光
            float centerHighlight = smoothstep(0.0, 0.1, 1.0 - length(uv - vec2(0.5, 0.4)) * 3.0) * 0.4;
            glassColor += centerHighlight;
            
            // 边缘光晕 - liquidglass的核心
            glassColor = edgeGlow(uv, glassColor);
            
            // 边缘变暗
            float edgeDist = edgeDistance(uv);
            float edgeDarkness = 1.0 - smoothstep(0.7, 1.0, edgeDist * 2.0) * 0.3;
            glassColor *= edgeDarkness;
            
            // 色散效果
            vec2 chromaOffset = (refractedUV - uv) * 1.5;
            vec3 chromaR = texture(u_background, refractedUV + chromaOffset * 0.002).rgb;
            vec3 chromaB = texture(u_background, refractedUV - chromaOffset * 0.002).rgb;
            glassColor.r = mix(glassColor.r, chromaR.r, 0.2);
            glassColor.b = mix(glassColor.b, chromaB.b, 0.2);
            
            fragColor = vec4(glassColor, originalColor.a);
        }
    `;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.initWebGL();
    }

    private initWebGL(): void {
        if (!this.canvas) {
            return;
        }

        // 首先检查浏览器是否支持WebGL
        if (!this.isWebGLSupported()) {
            return;
        }
        
        // 尝试WebGL2，然后WebGL1，使用适合扩展的上下文属性
        const contextAttributes = {
            alpha: true,
            antialias: false, // 在扩展中禁用抗锯齿以提高兼容性
            depth: false,
            failIfMajorPerformanceCaveat: false,
            powerPreference: 'default',
            premultipliedAlpha: false,
            preserveDrawingBuffer: false,
            stencil: false
        };

        try {
            // 按照MDN建议的顺序尝试WebGL上下文
            this.gl = this.canvas.getContext('webgl', contextAttributes) as WebGLRenderingContext || 
                     this.canvas.getContext('experimental-webgl', contextAttributes) as WebGLRenderingContext ||
                     this.canvas.getContext('webgl2', contextAttributes) as WebGLRenderingContext;
        } catch (error) {
            console.warn('WebGL context creation failed:', error);
        }
        
        if (!this.gl) {
            
            // 尝试检测WebGL支持
            const testCanvas = document.createElement('canvas');
            const testGL = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
            if (testGL && testGL instanceof WebGLRenderingContext) {
            } else {
                // WebGL is not supported in browser
            }
            return;
        }

        // 验证WebGL上下文类型
        if (!(this.gl instanceof WebGLRenderingContext)) {
            this.gl = null;
            return;
        }


        // 检查WebGL功能
        const debugInfo = this.gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            const renderer = this.gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }

        this.createShaderProgram();
        this.setupGeometry();
    }

    private isWebGLSupported(): boolean {
        try {
            // 创建测试canvas
            const testCanvas = document.createElement('canvas');
            
            // 尝试获取WebGL上下文
            const gl = testCanvas.getContext('webgl') || 
                      testCanvas.getContext('experimental-webgl') ||
                      testCanvas.getContext('webgl2');
            
            if (!gl) {
                return false;
            }
            
            // 检查WebGL上下文是否有效
            if (!(gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext)) {
                return false;
            }
            
            // 检查基本的WebGL功能
            const version = gl.getParameter(gl.VERSION);
            const vendor = gl.getParameter(gl.VENDOR);
            const renderer = gl.getParameter(gl.RENDERER);
            
            // 如果版本信息为空，可能WebGL被禁用
            if (!version || !vendor || !renderer) {
                return false;
            }
            
            return true;
        } catch (error) {
            console.warn('WebGL support check failed:', error);
            return false;
        }
    }

    private setupGeometry(): void {
        if (!this.gl || !this.program) return;

        // 创建全屏四边形
        const vertices = new Float32Array([
            -1, -1, 0, 0,  // 左下
             1, -1, 1, 0,  // 右下
            -1,  1, 0, 1,  // 左上
            -1,  1, 0, 1,  // 左上
             1, -1, 1, 0,  // 右下
             1,  1, 1, 1   // 右上
        ]);

        const vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

        const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        const texCoordLocation = this.gl.getAttribLocation(this.program, 'a_texCoord');

        if (positionLocation >= 0) {
            this.gl.enableVertexAttribArray(positionLocation);
            this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 16, 0);
        }

        if (texCoordLocation >= 0) {
            this.gl.enableVertexAttribArray(texCoordLocation);
            this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 16, 8);
        }
    }

    private createShaderProgram(): void {
        if (!this.gl) {
            return;
        }

        
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, this.vertexShaderSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, this.fragmentShaderSource);

        if (!vertexShader || !fragmentShader) {
            return;
        }

        this.program = this.gl.createProgram();
        if (!this.program) {
            return;
        }

        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error('Shader program linking failed:', this.gl.getProgramInfoLog(this.program));
            return;
        }

        this.gl.deleteShader(vertexShader);
        this.gl.deleteShader(fragmentShader);
    }

    private createShader(type: number, source: string): WebGLShader | null {
        if (!this.gl) return null;

        const shader = this.gl.createShader(type);
        if (!shader) return null;

        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const shaderType = type === this.gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
            console.error(`${shaderType} shader compilation failed:`, this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    public isInitialized(): boolean {
        return this.gl !== null && this.program !== null;
    }

    public updateConfig(newConfig: Partial<ShaderConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    public render(texture: WebGLTexture, backgroundTexture: WebGLTexture, time: number): void {
        if (!this.gl || !this.program || !this.canvas) {
            return;
        }

        // 设置视口
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        // 清除画布
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.useProgram(this.program);

        // 设置uniforms
        const resolutionLocation = this.gl.getUniformLocation(this.program, 'u_resolution');
        const timeLocation = this.gl.getUniformLocation(this.program, 'u_time');
        const blurRadiusLocation = this.gl.getUniformLocation(this.program, 'u_blurRadius');
        const saturationLocation = this.gl.getUniformLocation(this.program, 'u_saturation');
        const brightnessLocation = this.gl.getUniformLocation(this.program, 'u_brightness');
        const contrastLocation = this.gl.getUniformLocation(this.program, 'u_contrast');
        const noiseIntensityLocation = this.gl.getUniformLocation(this.program, 'u_noiseIntensity');
        const refractionStrengthLocation = this.gl.getUniformLocation(this.program, 'u_refractionStrength');

        if (resolutionLocation) this.gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);
        if (timeLocation) this.gl.uniform1f(timeLocation, time);
        if (blurRadiusLocation) this.gl.uniform1f(blurRadiusLocation, this.config.blurRadius);
        if (saturationLocation) this.gl.uniform1f(saturationLocation, this.config.saturation);
        if (brightnessLocation) this.gl.uniform1f(brightnessLocation, this.config.brightness);
        if (contrastLocation) this.gl.uniform1f(contrastLocation, this.config.contrast);
        if (noiseIntensityLocation) this.gl.uniform1f(noiseIntensityLocation, this.config.noiseIntensity);
        if (refractionStrengthLocation) this.gl.uniform1f(refractionStrengthLocation, this.config.refractionStrength);

        // 设置纹理
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        const textureLocation = this.gl.getUniformLocation(this.program, 'u_texture');
        if (textureLocation) this.gl.uniform1i(textureLocation, 0);

        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, backgroundTexture);
        const backgroundLocation = this.gl.getUniformLocation(this.program, 'u_background');
        if (backgroundLocation) this.gl.uniform1i(backgroundLocation, 1);

        // 绘制
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    public createTexture(imageData: ImageData): WebGLTexture | null {
        if (!this.gl) {
            return null;
        }

        const texture = this.gl.createTexture();
        if (!texture) {
            return null;
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, imageData);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

        // 解绑纹理
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);

        return texture;
    }

    public dispose(): void {
        if (this.gl && this.program) {
            this.gl.deleteProgram(this.program);
        }
    }
}
