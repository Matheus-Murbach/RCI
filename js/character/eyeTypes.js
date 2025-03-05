import { THREE } from '../core/three.js';

export const EyeTypes = {
    NORMAL: 'normal',
    HAPPY: 'happy',
    ANGRY: 'angry',
    SAD: 'sad',
    SLEEPY: 'sleepy'
};

export function createEye(type, side = 'left') {
    const eyeGroup = new THREE.Group();
    eyeGroup.userData.isEye = true;

    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    let eyeGeometry;

    switch (type) {
        case EyeTypes.HAPPY:
            // Criar arco para olho feliz
            const curve = new THREE.EllipseCurve(
                0, 0,                // Centro
                0.05, 0.05,         // Raio X, Y
                0, Math.PI,         // Ângulo inicial e final
                false,              // Sentido anti-horário
                0                   // Rotação inicial
            );
            const points = curve.getPoints(50);
            const arcGeometry = new THREE.BufferGeometry().setFromPoints(points);
            const arcMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
            const arc = new THREE.Line(arcGeometry, arcMaterial);
            arc.rotation.z = Math.PI; // Inverter arco
            eyeGroup.add(arc);
            break;

        case EyeTypes.ANGRY:
            // Criar olho angulado para expressão de raiva
            eyeGeometry = new THREE.PlaneGeometry(0.08, 0.02);
            const angryEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            angryEye.rotation.z = side === 'left' ? -0.5 : 0.5;
            eyeGroup.add(angryEye);
            break;

        case EyeTypes.SAD:
            // Criar arco invertido para olho triste
            const sadCurve = new THREE.EllipseCurve(
                0, 0,
                0.05, 0.05,
                0, Math.PI,
                false,
                0
            );
            const sadPoints = sadCurve.getPoints(50);
            const sadGeometry = new THREE.BufferGeometry().setFromPoints(sadPoints);
            const sadMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
            const sadArc = new THREE.Line(sadGeometry, sadMaterial);
            eyeGroup.add(sadArc);
            break;

        case EyeTypes.SLEEPY:
            // Criar linha horizontal para olho sonolento
            eyeGeometry = new THREE.PlaneGeometry(0.08, 0.02);
            const sleepyEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            eyeGroup.add(sleepyEye);
            break;

        case EyeTypes.NORMAL:
        default:
            // Criar círculo para olho normal
            eyeGeometry = new THREE.CircleGeometry(0.03, 32);
            const normalEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            eyeGroup.add(normalEye);
            break;
    }

    return eyeGroup;
}
