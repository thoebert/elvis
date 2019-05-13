import {
    Vector3, MeshBuilder, Mesh, StandardMaterial, Color3,
    HemisphericLight, DirectionalLight, PointLight
} from "babylonjs";

/**
 * A l-system turtle which can move or place objects. It is defined by its current position
 * rotation and the drawing parameters.
 * @class
 * @constructor
 * @public
 */
export default class Turtle {

    scene;
    pos;
    dir;
    rot;
    material;
    stack;
    meshes;
    materials;
    currentLine;
    currentDiameter;

    /**
     * Creates a turtle for the given scene with default values
     * @param scene the scene where objects should be created
     */
    constructor(scene) {
        this.scene = scene;
        this.meshes = [];
        this.materials = [];
        this.lights = [];
        this.reset();
    }

    /**
     * Resets all turtle parameters
     */
    reset() {
        this.pos = Vector3.Zero();
        this.dir = new Vector3(0, 1, 0);
        this.rot = new Vector3(0, 0, 0);
        this.stack = [];
        this.currentDiameter = -1;
        this.currentLine = [];
        for (let m of this.meshes) {
            m.dispose();
            m = null;
        }
        for (let m of this.materials) {
            m.dispose();
            m = null;
        }
        for (let m of this.lights) {
            m.dispose();
            m = null;
        }
        this.meshes = [];
        this.materials = [];
        this.lights = [];
        this.resetColors();
    }

    /**
     * Turns the turtle in a vertical orientation
     */
    setVertical() {
        this.rot = new Vector3(0, 0, 0);
        this.dir = new Vector3(0, 1, 0);
    }

    /**
     * Pushes the current turtle parameters on the stack
     */
    push() {
        this.stack.push({
            pos: this.pos.clone(),
            dir: this.dir.clone(),
            rot: this.rot.clone(),
            material: this.material,
            currentLine: this.currentLine.slice(0),
            currentDiameter: this.currentDiameter,
        });
    }

    /**
     * Pops the current turtle parameter from the stack
     */
    pop() {
        let v = this.stack.pop();
        if (!v) return;
        this.dir = v.dir;
        this.pos = v.pos;
        this.rot = v.rot;
        this.material = v.material;
        this.currentLine = v.currentLine;
        this.currentDiameter = v.currentDiameter;
    }

    /**
     * Creates a cylinder at the current position of the turtle and moves the turtle
     * to the end of the cylinder
     * @param length the length of the cylinder
     * @param diameter the diameter of the cylinder
     */
    cylinder(length, diameter) {
        if (diameter < 0 || length < 0) return;
        if (diameter === this.currentDiameter &&
            this.currentLine.length > 0 &&
            this.currentLine[this.currentLine.length - 1].equals(this.pos)
        ) {
        } else {
            this.finishCurrentLine();
            this.currentLine.push(this.pos.clone());
            this.currentDiameter = diameter;
        }
        this.forward(length);
        this.currentLine.push(this.pos.clone());
    }

    /**
     * Creates a line at the current position of the turtle and moves the turtle
     * to the end of the line
     * @param length the length of the line
     */
    line(length) {
        this.cylinder(length, 0);
    }

    /**
     * Finishes the current line
     */
    finishCurrentLine() {
        if (this.currentDiameter < 0 || this.currentLine.length < 0) return;
        let object;
        if (this.currentDiameter > 0) {
            object = MeshBuilder.CreateTube("tube",
                {
                    path: this.currentLine,
                    radius: this.currentDiameter / 2,
                    sideOrientation: Mesh.DOUBLESIDE,
                    cap: Mesh.CAP_ALL
                }, this.scene);

        } else {
            object = MeshBuilder.CreateLines("line",
                {points: this.currentLine}, this.scene);
        }
        object.material = this.material;
        this.meshes.push(object);
        this.currentLine = [];
        this.currentDiameter = -1;
    }

    /**
     * Moves the turtle forward
     * @param length the distance which the turtle should be moved forwards
     */
    forward(length) {
        this.pos.addInPlace(this.dir.multiplyByFloats(length, length, length));
    }

    /**
     * Rotates the turtle a given angle around the x-axis
     * @param angle the angle to rotate the turtle
     */
    rotateX(angle) {
        angle = Turtle.degtorad(angle);
        this.rot.x += angle;
        let y = this.dir.y, z = this.dir.z;
        let sin = Math.sin(angle), cos = Math.cos(angle);
        this.dir.y = y * cos - z * sin;
        this.dir.z = y * sin + z * cos;
    }

    /**
     * Rotates the turtle a given angle around the y-axis
     * @param angle the angle to rotate the turtle
     */
    rotateY(angle) {
        angle = Turtle.degtorad(angle);
        this.rot.y += angle;
        let x = this.dir.x, z = this.dir.z;
        let sin = Math.sin(angle), cos = Math.cos(angle);
        this.dir.x = x * cos + z * sin;
        this.dir.z = -x * sin + z * cos;
    }

    /**
     * Rotates the turtle a given angle around the z-axis
     * @param angle the angle to rotate the turtle
     */
    rotateZ(angle) {
        angle = Turtle.degtorad(angle);
        this.rot.z += angle;
        let x = this.dir.x, y = this.dir.y;
        let sin = Math.sin(angle), cos = Math.cos(angle);
        this.dir.x = x * cos - y * sin;
        this.dir.y = x * sin + y * cos;
    }

    /**
     * Creates a cube at the current position of the turtle
     * @param size the size of the turtle
     */
    cube(size) {
        let box = MeshBuilder.CreateBox("box", {size: size}, this.scene);
        box.material = this.material;
        box.position = this.pos.clone();
        box.rotation = this.rot.clone();
        this.meshes.push(box);
    }

    /**
     * Sets the current drawing color of the turtle
     * @param r the red value [0-1]
     * @param g the green value [0-1]
     * @param b the blue value [0-1]
     */
    setColor(r, g, b) {
        this.setMaterial(new Color3(r, g, b));
    }

    /**
     * Sets the current emissive drawing color of the turtle
     * @param r the red value [0-1]
     * @param g the green value [0-1]
     * @param b the blue value [0-1]
     */
    setEmissiveColor(r, g, b) {
        this.setMaterial(null, new Color3(r, g, b));
    }

    /**
     * Resets all current drawing colors
     */
    resetColors() {
        this.setMaterial();
    }

    /**
     * Sets the current drawing material
     * @param color the new current drawing color
     * @param emissiveColor the new current emissive drawing color
     */
    setMaterial(color, emissiveColor) {
        this.finishCurrentLine();
        this.material = new StandardMaterial("material", this.scene);
        this.materials.push(this.material);
        this.material.diffuseColor = (color ? color : Color3.White());
        this.material.specularColor = this.material.diffuseColor;
        this.material.emissiveColor = (emissiveColor ? emissiveColor : Color3.Black());
    }

    /**
     * Converts an anle in degrees to radiants
     * @param angle
     * @returns {number}
     */
    static degtorad(angle) {
        return angle * Math.PI / 180.0;
    }

    /**
     * Finalizes the turtle drawing after the last movement
     */
    finalize() {
        this.finishCurrentLine();
    }

    /**
     * Adds lights to the scene
     * @param lights the list of lights to add to the scene
     */
    addLights(lights) {
        if (!lights || lights.length === 0) {
            lights = [
                {
                    type: 'hemispheric',
                    direction: [0, 20, 0],
                    intensity: 0.7,
                    diffuseColor: [0.3, 0.5, 0.6],
                    groundColor: [0.5, 0.4, 0.25]
                },
                {
                    type: 'directional',
                    direction: [10, 20, 15],
                    intensity: 0.5,
                },
                {
                    type: 'point',
                    position: [0, 2, 0],
                    intensity: 1,
                },
            ];
        }
        for (let d of lights) {
            let l;
            switch (d.type) {
                case 'hemispheric':
                    if (!d.direction) break;
                    l = new HemisphericLight("HemisphericLight", Vector3.FromArray(d.direction), this.scene);
                    if (d.diffuseColor) l.diffuse = Color3.FromArray(d.diffuseColor);
                    if (d.groundColor) l.groundColor = Color3.FromArray(d.groundColor);
                    break;
                case 'directional':
                    l = new DirectionalLight("DirectionalLight", Vector3.FromArray(d.direction), this.scene);
                    break;
                case 'point':
                    if (!d.position) break;
                    l = new PointLight("PointLight", Vector3.FromArray(d.position), this.scene);
                    break;
                default:
                    break;
            }
            if (l) {
                if (d && d.intensity) l.intensity = d.intensity;
                this.lights.push(l);
            }
        }
    }
}