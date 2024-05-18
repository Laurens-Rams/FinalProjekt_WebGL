import * as THREE from 'three';

// The distortion from the tutorial you showed me and then changed
class DistortionTexture {
    constructor(options = {}) {
        this.size = 100;
        this.radius = this.size * 0.04;
        this.width = this.height = this.size;
        this.points = [];
        this.maxAge = 44;
        this.last = null;

        this.initTexture();

        if (options.debug) {
            document.body.appendChild(this.canvas);
        }
    }

    initTexture() {
        this.canvas = document.createElement("canvas");
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext("2d");
        this.clear();
        this.texture = new THREE.Texture(this.canvas);
    }

    clear() {
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    addPoint(point) {
        let force = 0;
        let vx = 0;
        let vy = 0;
        const last = this.last;

        if (last) {
            const relativeX = point.x - last.x;
            const relativeY = point.y - last.y;
            const distanceSquared = relativeX * relativeX + relativeY * relativeY;
            const distance = Math.sqrt(distanceSquared);
            vx = relativeX / distance;
            vy = relativeY / distance;
            force = THREE.MathUtils.clamp(1 / (distance + 0.001), 0, 0.3);
        }

        this.last = { x: point.x, y: point.y };
        this.points.push({ x: point.x, y: point.y, age: 0, force, vx, vy });
    }

    update() {
        this.clear();
        const agePart = 1.0 / this.maxAge;

        this.points.forEach((point, i) => {
            const slowAsOlder = (1.0 - point.age / this.maxAge);
            const force = point.force * agePart * slowAsOlder;
            point.x += point.vx * force;
            point.y += point.vy * force;
            point.age += 1;

            if (point.age > this.maxAge) {
                this.points.splice(i, 1);
            }
        });

        this.points.forEach(point => this.drawPoint(point));
        this.texture.needsUpdate = true;
    }

    drawPoint(point) {
        const pos = { x: point.x * this.width, y: point.y * this.height };
        const radius = this.radius;
        const ctx = this.ctx;
        let intensity = 1.0;

        if (point.age < this.maxAge * 0.3) {
            intensity = easeOutSine(point.age / (this.maxAge * 0.3), 0, 1, 1);
        } else {
            intensity = easeOutQuad(
                1 - (point.age - this.maxAge * 0.3) / (this.maxAge * 0.7),
                0,
                1,
                1
            );
        }

        intensity *= point.force;

        const red = ((point.vx + 1) / 2) * 255;
        const green = ((point.vy + 1) / 2) * 255;
        const blue = intensity * 255;
        const white = 255;
        const color = `${red}, ${green}, ${blue}`;

        const offset = this.size * 5;
        ctx.shadowOffsetX = offset;
        ctx.shadowOffsetY = offset;
        ctx.shadowBlur = radius;
        ctx.shadowColor = `rgba(${color}, ${0.2 * intensity})`;

        ctx.beginPath();
        ctx.fillStyle = "rgba(255,255,255,1)";
        ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

const easeOutSine = (t, b, c, d) => c * Math.sin((t / d) * (Math.PI / 2)) + b;
const easeOutQuad = (t, b, c, d) => -c * t * (t - 2) + b;

export default DistortionTexture;