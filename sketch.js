// ==========================================
// P5.JS BACKGROUND SKETCH
// ==========================================

let particles = [];
let numParticles = 80;

function setup() {
    // Crear canvas y adjuntarlo al contenedor específico
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('p5-background');
    
    // Crear partículas
    for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle());
    }
}

function draw() {
    // Fondo oscuro con transparencia para efecto de estela
    background(15, 23, 42, 25);
    
    // Actualizar y mostrar partículas
    for (let particle of particles) {
        particle.update();
        particle.display();
    }
    
    // Conectar partículas cercanas
    connectParticles();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

// ==========================================
// CLASE PARTÍCULA
// ==========================================

class Particle {
    constructor() {
        this.pos = createVector(random(width), random(height));
        this.vel = createVector(random(-0.5, 0.5), random(-0.5, 0.5));
        this.size = random(2, 4);
        this.opacity = random(100, 200);
    }
    
    update() {
        // Mover partícula
        this.pos.add(this.vel);
        
        // Rebote en los bordes
        if (this.pos.x < 0 || this.pos.x > width) {
            this.vel.x *= -1;
        }
        if (this.pos.y < 0 || this.pos.y > height) {
            this.vel.y *= -1;
        }
        
        // Mantener dentro de los límites
        this.pos.x = constrain(this.pos.x, 0, width);
        this.pos.y = constrain(this.pos.y, 0, height);
    }
    
    display() {
        noStroke();
        fill(99, 102, 241, this.opacity);
        circle(this.pos.x, this.pos.y, this.size);
    }
}

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function connectParticles() {
    let maxDistance = 120;
    
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            let d = dist(
                particles[i].pos.x, 
                particles[i].pos.y, 
                particles[j].pos.x, 
                particles[j].pos.y
            );
            
            if (d < maxDistance) {
                let alpha = map(d, 0, maxDistance, 100, 0);
                stroke(99, 102, 241, alpha);
                strokeWeight(1);
                line(
                    particles[i].pos.x, 
                    particles[i].pos.y, 
                    particles[j].pos.x, 
                    particles[j].pos.y
                );
            }
        }
    }
}

// Opcional: Interacción con el mouse
function mouseMoved() {
    // Repeler partículas del mouse
    for (let particle of particles) {
        let d = dist(mouseX, mouseY, particle.pos.x, particle.pos.y);
        if (d < 100) {
            let force = p5.Vector.sub(particle.pos, createVector(mouseX, mouseY));
            force.normalize();
            force.mult(0.5);
            particle.vel.add(force);
            particle.vel.limit(2);
        }
    }
}
