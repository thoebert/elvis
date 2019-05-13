import "./MainComponent.css";
import 'pepjs'
import React from "react";
import SplitPane from "react-splitter-layout";
import "react-splitter-layout/lib/index.css";
import CloudUpload from "@material-ui/icons/CloudUpload";
import Save from "@material-ui/icons/Save";
import {
    Typography, FormControl, Select, MenuItem, Link,
    InputLabel, TextField, Fab, FormControlLabel, Checkbox
} from "@material-ui/core";
import {Engine, Scene} from "react-babylonjs";
import {Vector3, ArcRotateCamera, Color3} from "babylonjs";
import PLSystem from "./PLSystem";
import Turtle from "./Turtle";
import plSystemException from "./plSystemException";

export default class MainComponent extends React.Component {
    canvas;
    scene;
    camera;
    plsystem;
    turtle;
    framingBehavior;
    funcs = [
        {sym: "F", paramlength: 2, func: (p) => this.turtle.cylinder(p[0], p[1])},
        {sym: "F", paramlength: 1, func: (p) => this.turtle.cylinder(p[0], this.state.diameter)},
        {sym: "F", paramlength: 0, func: (p) => this.turtle.cylinder(this.state.length, this.state.diameter)},
        {sym: "f", paramlength: 1, func: (p) => this.turtle.forward(p[0])},
        {sym: "f", paramlength: 0, func: (p) => this.turtle.forward(this.state.length)},

        {sym: "Box", paramlength: 1, func: (p) => this.turtle.cube(p[0])},

        {sym: "Color", paramlength: 3, func: (p) => this.turtle.setColor(p[0], p[1], p[2])},
        {sym: "EmColor", paramlength: 3, func: (p) => this.turtle.setEmissiveColor(p[0], p[1], p[2])},
        {sym: "Color", paramlength: 0, func: () => this.turtle.resetColors()},

        {sym: "+", paramlength: 1, func: (p) => this.turtle.rotateZ(p[0])},
        {sym: "+", paramlength: 0, func: () => this.turtle.rotateZ(this.state.angle)},
        {sym: "-", paramlength: 1, func: (p) => this.turtle.rotateZ(-p[0])},
        {sym: "-", paramlength: 0, func: () => this.turtle.rotateZ(-this.state.angle)},

        {sym: "&", paramlength: 1, func: (p) => this.turtle.rotateY(p[0])},
        {sym: "&", paramlength: 0, func: () => this.turtle.rotateY(this.state.angle)},
        {sym: "^", paramlength: 1, func: (p) => this.turtle.rotateY(-p[0])},
        {sym: "^", paramlength: 0, func: () => this.turtle.rotateY(-this.state.angle)},

        {sym: "/", paramlength: 1, func: (p) => this.turtle.rotateX(p[0])},
        {sym: "/", paramlength: 0, func: () => this.turtle.rotateX(this.state.angle)},
        {sym: "\\", paramlength: 1, func: (p) => this.turtle.rotateX(-p[0])},
        {sym: "\\", paramlength: 0, func: () => this.turtle.rotateX(-this.state.angle)},

        {sym: "|", paramlength: 0, func: () => this.turtle.rotateZ(180)},
        {sym: "[", paramlength: 0, func: () => this.turtle.push()},
        {sym: "]", paramlength: 0, func: () => this.turtle.pop()},
        {sym: "$", paramlength: 0, func: () => this.turtle.setVertical()}
    ];

    /**
     * Cerates this MainComponent with the default state values
     * @param props the properties of this react component
     */
    constructor(props) {
        super(props);
        this.state = {
            horizontal: true,
            length: 3,
            angle: 90,
            diameter: 0,
            autorotation: false,
            configs: ["BoxTree", "CesaroFractal", "DragonCurve", "GosperCurve", "HexaFlake", "KochCurve",
                "KochSnowflake", "LindenmayerCurve", "Oak", "QuadraticType2Curve", "SierpinskiArrowheadCurve",
                "SpringTree", "IceFractal", "Willow", "WinterTree"],
            error: "",
            ...this.loadPresetConfigFile("BoxTree")
        };
        this.plsystem = new PLSystem(this.funcs);
        this.updatePredicate = this.updatePredicate.bind(this);
    }

    /**
     * When the component is mounted, the event listeners are initialized
     */
    componentDidMount() {
        this.updatePredicate();
        window.addEventListener("resize", this.updatePredicate);
    }

    /**
     * When the component is unmounted, the event listeners are unloaded
     */
    componentWillUnmount() {
        window.removeEventListener("resize", this.updatePredicate);
    }

    /**
     * The predicate assigns the listener-values to the state.
     */
    updatePredicate() {
        this.setState({ horizontal: (window.innerWidth/window.innerHeight > 1) });
    }

    /**
     * Initializes all scene components after the scene is mounted
     * @param e the event containing the canvas and scene
     */
    onSceneMount = (e) => {
        const {canvas, scene} = e;
        this.scene = scene;
        this.canvas = canvas;

        this.scene.clearColor = new Color3(0.07, 0.07, 0.07);

        let camera = new ArcRotateCamera("Camera",
            91 * Math.PI / 180, 80 * Math.PI / 180, 10, new Vector3(0, 0, 0), this.scene);
        this.camera = camera;
        this.camera.useFramingBehavior = true;
        this.framingBehavior = this.camera.getBehaviorByName("Framing");
        this.framingBehavior.framingTime = 0;
        this.framingBehavior.elevationReturnTime = -1;
        camera.attachControl(canvas);

        this.turtle = new Turtle(this.scene);
        this.resized();
        this.paramChanged();

        //this.scene.debugLayer.show();
    }

    /**
     * Loads a config file from the local system
     * @param files the list of files on the file system
     */
    configFileSelected = (files) => {
        if (!files || files.length === 0) return;
        let reader = new FileReader();
        reader.addEventListener("load", (e) => {
            try {
                let json = JSON.parse(e.target.result);
                let state = this.processConfigData(json, "manual");
                this.setState({...state}, this.paramChanged);
                e.target.value = null;
            } catch (error) {
                console.error(error);
            }
        });
        reader.readAsText(files[0]);
    }

    /**
     * Loads a config file from the source config folder and returns the loaded values
     * @param name the name of the configuration
     * @returns the loaded values as object
     */
    loadPresetConfigFile = (name) => {
        if (name === "manual") return {currentConfig: name};
        let data = require("./configs/" + name + ".json");
        if (data) return this.processConfigData(data, name);
        return {};
    }

    /**
     * Applies the config parameters
     * @param data the config parameters
     * @param name the name of the config
     * @returns the data of the transformed config
     */
    processConfigData = (data, name) => {
        if (this.camera) {
            this.camera.alpha = 91 * Math.PI / 180;
            this.camera.beta = 80 * Math.PI / 180;
        }
        if (data.productions && Array.isArray(data.productions)) {
            data.productions = data.productions.join("\n");
        }
        data.currentConfig = name;
        if (!data.autorotate) data.autorotate = false;
        if (!data.lights) data.lights = [];
        return data;
    }

    /**
     * Forces the engine to resize the render frame
     */
    resized = () => {
        this.scene.getEngine().resize();
    }

    // BEGINNING OF CHANGE LISTENERS FOR PARAMETER GUI

    productionChanged = (e) => {
        this.setState({productions: e.target.value, currentConfig: "manual"}, this.paramChanged);
    }

    axiomChanged = (e) => {
        this.setState({axiom: e.target.value, currentConfig: "manual"}, this.paramChanged);
    }

    iterationsChanged = (e) => {
        this.setState({iterations: e.target.value, currentConfig: "manual"}, this.paramChanged);
    }

    angleChanged = (e) => {
        this.setState({angle: e.target.value, currentConfig: "manual"}, this.paramChanged);
    }

    autorotationChanged = (e) => {
        this.setState({autorotate: e.target.checked, currentConfig: "manual"}, this.paramChanged);
    }

    lengthChanged = (e) => {
        this.setState({length: e.target.value, currentConfig: "manual"}, this.paramChanged);
    }

    diameterChanged = (e) => {
        this.setState({diameter: e.target.value, currentConfig: "manual"}, this.paramChanged);
    }

    handleConfigChanged = (e) => {
        this.setState({...this.loadPresetConfigFile(e.target.value)}, this.paramChanged);
    }

    // END OF CHANGE LISTENERS

    /**
     * Applies a parameter change of the user to the view
     */
    paramChanged = () => {
        this.turtle.reset();
        this.turtle.addLights(this.state.lights);
        const prods = this.state.productions;
        try {
            this.plsystem.produce(this.state.axiom, prods, this.state.iterations);
            this.turtle.finalize();
            this.setState({error: ""});
            let worldExtends = this.scene.getWorldExtends();
            let a = this.camera.alpha, b = this.camera.beta;
            this.framingBehavior.zoomOnBoundingInfo(worldExtends.min, worldExtends.max);
            this.camera.alpha = a;
            this.camera.beta = b;
            this.camera.radius = this.camera.radius * 0.8;
            if (this.state.autorotate) {
                this.camera.useAutoRotationBehavior = true;
                this.camera.autoRotationBehavior.idleRotationSpeed = 0.2;
            } else {
                this.camera.useAutoRotationBehavior = false;
            }
        } catch (e) {
            if (typeof e === "object" && e instanceof plSystemException) {
                this.setState({error: e.text});
            } else {
                throw e;
            }
        }
    }

    /**
     * Creates a json-file with the current parameters and downloads it to the local file system
     */
    handleSave = () => {
        let data = {
            iterations: this.state.iterations,
            axiom: this.state.axiom,
            productions: PLSystem.filterEmpty(this.state.productions.split("\n")),
            angle: this.state.angle,
            diameter: this.state.diameter,
            length: this.state.length,
            autorotate: this.state.autorotate
        };
        let json = JSON.stringify(data, null, 2);
        let filename = "config.json";
        let contentType = "application/json;charset=utf-8;";
        let a = document.createElement("a");
        a.download = filename;
        a.href = "data:" + contentType + "," + encodeURIComponent(json);
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    /**
     * Returns the babylonjs react component
     * @returns {*} the babylonjs react component
     */
    engine(){
        return(
            <Engine canvasId="canvas" antialias={true} touchActionNone={true} width="100%" height="100%">
                <Scene onSceneMount={this.onSceneMount}>
                </Scene>
            </Engine>
        )
    }

    /**
     * Returns the sidebar plus its components
     * @returns {*} the sidebar
     */
    sidebar(){
        return(
            <FormControl id="sidebar">
                <div id="configbar">
                    <Typography component="h1" variant="h4" className="fill-width">pL-System</Typography>
                    <Fab aria-label="Upload" size="small">
                        <label htmlFor="fileload">
                            <CloudUpload/>
                        </label>
                        <input type="file" className="custom-file-input" style={{display: "none"}} id="fileload"
                               onChange={() =>
                                   this.configFileSelected(document.getElementById("fileload").files)}
                               onClick={event => {
                                   event.target.value = null
                               }}/>
                    </Fab>
                    <Fab aria-label="Save" size="small" onClick={this.handleSave}><Save/></Fab>
                </div>

                <div className="inputGroup">
                    <InputLabel shrink htmlFor="configuration">Configuration</InputLabel>
                    <Select value={this.state.currentConfig} onChange={this.handleConfigChanged}
                            inputProps={{id: "configuration"}} fullWidth>
                        <MenuItem key="manual" value="manual"><em>Manual</em></MenuItem>
                        {this.state.configs.map((el, i) => (<MenuItem key={el} value={el}>{el}</MenuItem>))}
                    </Select>
                </div>

                <TextField label="Iterations" fullWidth margin="normal" type="number" required
                           value={this.state.iterations} onChange={this.iterationsChanged}
                           InputLabelProps={{shrink: true,}} inputProps={{step: 1,}}/>

                <TextField multiline label="Axiom" margin="normal" fullWidth required
                           value={this.state.axiom} onChange={this.axiomChanged}/>

                <TextField multiline label="Productions" fullWidth margin="normal" required
                           value={this.state.productions} onChange={this.productionChanged}/>

                <FormControlLabel
                    className={"checkboxgroup"}
                    control={
                        <Checkbox checked={this.state.autorotate} onChange={this.autorotationChanged}/>
                    }
                    label="Auto Rotation"/>

                <TextField label="Default Angle" fullWidth margin="normal" type="number" required
                           value={this.state.angle} onChange={this.angleChanged}
                           InputLabelProps={{shrink: true,}} inputProps={{step: 1,}}/>

                <TextField label="Default Length" fullWidth margin="normal" type="number" required
                           value={this.state.length} onChange={this.lengthChanged}
                           InputLabelProps={{shrink: true,}} inputProps={{step: 1,}}/>

                <TextField label="Default Diameter" fullWidth margin="normal" type="number" required
                           value={this.state.diameter} onChange={this.diameterChanged}
                           InputLabelProps={{shrink: true,}} inputProps={{step: 1,}}/>

                <Typography color="error" variant="body1" gutterBottom>{this.state.error}</Typography>

                <Typography component="h1" variant="h4" className="fill-width">Description</Typography>
                <Typography className="description">
                    Beginning with the axiom, in each iteration all symbols are replaced according to the production
                    rules, see <Link href={"https://en.wikipedia.org/wiki/L-system#Example_1:_Algae"}>Wikipedia</Link>.
                    The resulting symbols are successively interpreted to move the cursor or place an geometric object.
                </Typography>
                <Typography className="description">
                    A list of the available symbols can be accessed <Link href={"https://github.com/thoebert/elvis/blob/master/README.md#syntax"}>here</Link>.
                </Typography>

            </FormControl>
        )
    }

    /**
     * Renders this react component
     * @returns {*} the components contents
     */
    render() {
        if (this.state.horizontal){
            return (
                <SplitPane vertical={false} secondaryInitialSize={30} percentage primaryIndex={1} onDragEnd={() => this.resized()}>
                    {this.sidebar()}
                    {this.engine()}
                </SplitPane>
            )
        } else {
            return (
                <div className="layout-pane vertical">
                    {this.engine()}
                    {this.sidebar()}
                </div>
            )
        }

    }
}