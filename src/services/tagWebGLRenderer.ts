/**
 * Tag WebGL Renderer
 * 为Tag标签提供WebGL渲染支持
 */

import { WebGLRenderer, ShaderConfig } from './webglRenderer';

export interface TagRenderOptions {
    width: number;
    height: number;
    borderRadius: number;
    backgroundColor: string;
    textColor: string;
    text: string;
    fontSize: number;
    fontFamily: string;
}

export class TagWebGLRenderer {
    private startTime: number = 0;

    constructor() {
        this.startTime = performance.now();
    }

    public createTagElement(options: TagRenderOptions): HTMLCanvasElement {
        const { width, height, borderRadius, backgroundColor, textColor, text, fontSize, fontFamily } = options;
        
        // 验证文本内容
        if (!text || !text.trim()) {
            const placeholderText = 'Empty Tag';
            return this.createTagElement({ ...options, text: placeholderText });
        }
        
        
        // 为每个tag创建独立的canvas和渲染器
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        const backgroundCanvas = document.createElement('canvas');
        const backgroundCtx = backgroundCanvas.getContext('2d')!;
        
        // 使用高分辨率渲染，避免字体模糊
        const pixelRatio = window.devicePixelRatio || 2;
        const canvasWidth = width * pixelRatio;
        const canvasHeight = height * pixelRatio;
        
        // 设置canvas尺寸
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        
        backgroundCanvas.width = canvasWidth;
        backgroundCanvas.height = canvasHeight;
        
        // 设置高分辨率上下文
        ctx.scale(pixelRatio, pixelRatio);
        backgroundCtx.scale(pixelRatio, pixelRatio);

        // 创建WebGL渲染器
        const webglRenderer = new WebGLRenderer(canvas);
        
        // 渲染背景
        backgroundCtx.clearRect(0, 0, width, height);
        const gradient = backgroundCtx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        backgroundCtx.fillStyle = gradient;
        backgroundCtx.fillRect(0, 0, width, height);
        backgroundCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const radius = Math.random() * 3 + 1;
            backgroundCtx.beginPath();
            backgroundCtx.arc(x, y, radius, 0, Math.PI * 2);
            backgroundCtx.fill();
        }

        // 渲染Tag内容
        ctx.clearRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = backgroundColor;
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, borderRadius);
        ctx.fill();
        ctx.fillStyle = textColor;
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.strokeText(text, width / 2, height / 2);
        ctx.fillText(text, width / 2, height / 2);

        // 检查WebGL初始化状态
        if (!webglRenderer.isInitialized()) {
            // 如果WebGL失败，使用增强的CSS毛玻璃效果
            canvas.style.background = backgroundColor;
            canvas.style.backdropFilter = 'blur(12px) saturate(200%) brightness(110%)';
            canvas.style.border = '1px solid rgba(255, 255, 255, 0.3)';
            canvas.style.boxShadow = `
                0 8px 32px rgba(0, 0, 0, 0.12),
                0 2px 8px rgba(0, 0, 0, 0.08),
                inset 0 1px 0 rgba(255, 255, 255, 0.2)
            `;
            canvas.style.position = 'relative';
            canvas.style.overflow = 'hidden';
            
            // 添加边缘光晕效果
            canvas.style.setProperty('--glow', '0 0 20px rgba(255, 255, 255, 0.3)');
            canvas.style.filter = 'drop-shadow(var(--glow))';
            
            return canvas;
        }

        
        // 创建独立的渲染循环
        let animationId: number | null = null;
        const animate = (currentTime: number) => {
            const time = (currentTime - this.startTime) / 1000;
            
            // 检查WebGL是否初始化
            if (!webglRenderer.isInitialized()) {
                if (animationId !== null) {
                    animationId = requestAnimationFrame(animate);
                }
                return;
            }
            
            // 获取纹理
            const tagImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const backgroundImageData = backgroundCtx.getImageData(0, 0, backgroundCanvas.width, backgroundCanvas.height);
            
            const tagTexture = webglRenderer.createTexture(tagImageData);
            const backgroundTexture = webglRenderer.createTexture(backgroundImageData);
            
            if (tagTexture && backgroundTexture) {
                webglRenderer.render(tagTexture, backgroundTexture, time);
            } else {
            }
            
            animationId = requestAnimationFrame(animate);
        };
        
        animationId = requestAnimationFrame(animate);
        
        // 当canvas被移除时清理
        canvas.addEventListener('remove', () => {
            if (animationId !== null) {
                cancelAnimationFrame(animationId);
            }
            webglRenderer.dispose();
        });
        
        return canvas;
    }

    public updateConfig(_config: Partial<ShaderConfig>): void {
        // 这个方法现在不能用了，因为每个tag都有自己的渲染器
    }

    public dispose(): void {
        // 这个方法现在不能用了，因为每个tag都有自己的渲染器
    }
}

// 扩展CanvasRenderingContext2D以支持roundRect
declare global {
    interface CanvasRenderingContext2D {
        roundRect(x: number, y: number, width: number, height: number, radius: number): void;
    }
}

if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x: number, y: number, width: number, height: number, radius: number) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
    };
}
