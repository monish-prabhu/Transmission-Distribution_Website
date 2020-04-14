const LineModels = {
    SHORT: 0,
    NOMINAL_PI: 1,
    LONG: 2
}
const UNITS = ['m', 'mm', 'ft', 'inch'];
const UNIT_MULTIPLIERS = [1, 0.001, 0.3048, 0.0254];
const UNIT_PREFIX = {
    '-12': 'p',
    '-9': 'n',
    '-6': 'ɥ',
    '-3': 'm',
    '0': '',
    '3': 'k',
    '6': 'M',
    '9': 'G'
}
const ComplexMode = {
    RECT: 0,
    POLAR: 1
}
const MIME_TYPE = 'text/plain';
const GITHUB_PAGE_URL = 'https://monishtechy.github.io/website/';
const EPLISON = 8.8542 * Math.pow(10, -12);
const PI = Math.PI, GMR_L = 0.7788;
var symmetericalSpacing, distanceConductors, subconductorsPerConductor, distanceSubconductor, strands, diameterStrand, diameterSubconductor;
var lineLength, lineLengthKm, lineModel, resistancePerKm, frequency;
var inductance, capacitance, resistance, xc, xl;
var vr, ir, pfr, pr, thetaR;
var vs, is, pfs, ps, thetaS;
var chargingCurrent;
var reg, eff;
var A, B, C, D, delta;
var answers;
var canvas, canDraw = false, drawBackground = false, downloadTimer;
var downloadA;
var outputDiv, downloadDiv, downloadButton;

function solve() {
    diameterSubconductor = getDiameterSubconductor(strands, diameterStrand);
    inductance = getInductance();
    capacitance = getCapacitance();
    resistance = resistancePerKm * lineLengthKm;
    xl = 2 * PI * frequency * inductance * lineLength;
    xc = 1 / (2 * PI * frequency * capacitance * lineLength);
    // console.log(`L = ${inductance}, C = ${capacitance}, XL = ${xl}, XC = ${xc}, lineLengthKm = ${lineLengthKm}`);
    vr /= Math.sqrt(3); // Phase Voltage
    ir = pr / (3 * vr * pfr);
    thetaR = Math.acos(pfr);
    let z = new ComplexNumber(resistancePerKm, xl/(lineLengthKm));
    let y = new ComplexNumber(0, (1/xc)/lineLengthKm);
    let Z = new ComplexNumber(resistance, xl), Y = new ComplexNumber(0, 1/xc);
    // console.log(`z = ${z.rectForm()}, y = ${y.polarForm()}, Z = ${Z.rectForm()}, Y = ${Y.polarForm()}`)
    switch(lineModel) {
        case LineModels.SHORT: // A = 1, B = Z, C = 0, D = 1
            A = new ComplexNumber(1,0);
            B = Z.copy();
            C = new ComplexNumber(0,0);
            break;
        case LineModels.NOMINAL_PI: // A = 1 + YZ/2, B = Z, C = Y + Y^2*Z/4, D = 1 + YZ/2
            A = Z.multiply(Y).multiplyScalar(1/2).addScalar(1);
            B = Z.copy();
            C = Y.add(Z.multiply(Y).multiply(Y).multiplyScalar(1/4));
            break;
        case LineModels.LONG:
            let gamma = ComplexNumber.sqrt(y.multiply(z));
            let zc = ComplexNumber.sqrt(z.divide(y));
            A = ComplexNumber.cosh(gamma.multiplyScalar(lineLengthKm));
            B = ComplexNumber.sinh(gamma.multiplyScalar(lineLengthKm)).multiply(zc);
            C = ComplexNumber.sinh(gamma.multiplyScalar(lineLengthKm)).divide(zc);
            break;
    }
    D = A.copy();

    let irComplex = new ComplexNumber(ir, -thetaR, ComplexMode.POLAR);
    let vsComplex = A.multiplyScalar(vr).add(B.multiply(irComplex));
    let isComplex = C.multiplyScalar(vr).add(D.multiply(irComplex));
    vs = vsComplex.abs;
    is = isComplex.abs;
    thetaS = isComplex.angle - vsComplex.angle;
    pfs = Math.cos(thetaS);
    ps = 3 * vs * is * pfs;

    if (lineModel == LineModels.SHORT) {
        chargingCurrent = 0;
    } else {
        chargingCurrent = vr * C.abs;
    }
    
    reg = (vs/A.abs - vr) / vr * 100;
    eff = pr / ps * 100;

    // console.log(`Recieving end: I = ${ir}, V = ${vr}, pf = ${pfr}, P = ${pr}; Sending end: V = ${vs}, I = ${is}, pf = ${pfs}, P = ${ps}`)

    answers = [
        new Answer('inductance', inductance, 'Inductance per phase per km in H/m', 'H/m'),
        new Answer('capacitance', capacitance, 'Capacitance per phase per km in F/m', 'F/m'),
        new Answer('inductive-reactance', xl, 'Inductive reactance of the line in Ohm', 'Ω'),
        new Answer('capacitive-reactance', xc, 'Capacitive reactance of the line in Ohm', 'Ω'),
        new Answer('charging-current', chargingCurrent, 'Charging current drawn from the sending end substation', 'A'),
        new Answer('A', A, 'A', '', 0, true),
        new Answer('B', B, 'B', 'Ω', 0, true),
        new Answer('C', C, 'C', '℧', 0, true),
        new Answer('D', D, 'D', '', 0, true),
        new Answer('sending-end-voltage', vs * Math.sqrt(3), 'Sending end voltage, if the receiving end voltage is maintained at nominal system voltage', 'V', 3),
        new Answer('sending-end-current', is, 'Sending end current', 'A'),
        new Answer('voltage-regulation', reg, 'Percentage voltage regulation', '%', 0, false, true),
        new Answer('power-loss', (ps-pr), 'Power loss int the line', 'W', 6),
        new Answer('efficiency', eff, 'Transmission efficiency', '%', 0, false, true)
    ] 
}

function sgmd(n, d) {
    let theta = 2*PI/n;
    if (n <= 1) return 1;
    let dr = d / (2*sin(theta/2));
    let ans = 1;
    for (let i = 1; i < n; ++i) {
        ans *= Math.pow(distance(dr, 0, dr*Math.cos(i*theta), dr*Math.sin(i*theta)), 1/n);
    }
    return ans;
}

function sgmdC(n, distance, radius) {
    return sgmd(n, distance) * Math.pow(radius, 1/n);
}

function sgmdL(n, distance, radius) {
    return sgmd(n, distance) * Math.pow(radius * GMR_L, 1/n);
}

function mgmd(distanceConductors) {
    let ans = 1, conductors = distanceConductors.length;
    for (let i = 0; i < conductors; ++i) {
        ans *= Math.pow(distanceConductors[i], 1/conductors);
    }
    return ans;
}

function getDiameterSubconductor(strands, diameter) {
    let n = 1;
    while ((3*n*n - 3*n + 1) < strands) {
        ++n;
    }
    return (2*n - 1) * diameter;
}

function getInductance() {
    let mg = mgmd(distanceConductors);
    let sg = sgmdL(subconductorsPerConductor, distanceSubconductor, diameterSubconductor/2);
    // console.log(`Inductance: SGMD = ${sg}, MGMD = ${mg}`);
    return 2 * Math.pow(10, -7) * Math.log10(mg / sg) / Math.LOG10E;
}

function getCapacitance() {
    let mg = mgmd(distanceConductors);
    let sg = sgmdC(subconductorsPerConductor, distanceSubconductor, diameterSubconductor/2);
    // console.log(`Capacitance: SGMD = ${sg}, MGMD = ${mg}`);
    return 2 * PI * EPLISON / Math.log10(mg / sg) * Math.LOG10E;
}


class ComplexNumber {
    constructor(a, b, mode) {
        if (mode == ComplexMode.POLAR) { 
            this.abs = a;
            this.angle = b;
            this.real = this.abs * Math.cos(this.angle);
            this.imaginary = this.abs * Math.sin(this.angle);
        } else {
            this.real = a;
            this.imaginary = b ? b : 0;
            this.abs = Math.sqrt(this.real*this.real + this.imaginary*this.imaginary);
            this.angle = Math.atan(this.imaginary/this.real);
            if (!this.angle) this.angle = 0;
        }
    }
    multiply(c) {
        return new ComplexNumber(this.abs * c.abs, this.angle + c.angle, ComplexMode.POLAR);
    }
    multiplyScalar(num) {
        return new ComplexNumber(this.real * num, this.imaginary * num);
    }
    divide(c) {
        return new ComplexNumber(this.abs / c.abs, this.angle - c.angle, ComplexMode.POLAR);
    }
    add(c) {
        return new ComplexNumber(this.real + c.real, this.imaginary + c.imaginary);
    }
    addScalar(num) {
        return new ComplexNumber(this.real + num, this.imaginary);
    }
    inverse() {
        return new ComplexNumber(1/this.abs, -this.angle, ComplexMode.POLAR);
    }
    rectForm() {
        let sign = (this.imaginary < 0 ? '-' : '+');
        return `${roundValue(this.real)} ${sign} j${roundValue(Math.abs(this.imaginary))}`;
    }
    polarForm() {
        return `${roundValueToThreeDecimals(this.abs)}∠${roundValue(positiveAngle(this.angle * 180 / PI))}°`;
    }
    copy() {
        return new ComplexNumber(this.real, this.imaginary);
    }
    static add(c1, c2) {
        return c1.add(c2);
    }
    static addScalar(c1, num) {
        return c1.addScalar(num);
    }
    static divide(c1, c2) {
        return c1.divide(c2);
    }
    static multiplyScalar(c1, num) {
        return c1.multiplyScalar(num);
    }
    static multiply(c1, c2) {
        return c1.multiply(c2);
    }
    static sqrt(c) {
        return new ComplexNumber(Math.sqrt(c.abs), c.angle/2, ComplexMode.POLAR);
    }
    static cosh(c) {
        let a = c.real, b = c.imaginary;
        return new ComplexNumber(Math.cos(b) * Math.cosh(a), Math.sin(b) * Math.sinh(a));
    }
    static sinh(c) {
        let a = c.real, b = c.imaginary;
        return new ComplexNumber(Math.cos(b) * Math.sinh(a), Math.sin(b) * Math.cosh(a));
    }
}

function submit(){   
    if (setQuestionValues()) {
        setVariableValues();
        solve();        
        setupDiagramValues();
        clear();
        canDraw = true;
        convertAllToEngMode();
        setAnswerElements();
        createDownloadFile();        
        outputDiv.style.display = 'block';
    }
}

function setQuestionValues() {
    let flag = true;
    for (let i = 0; i < questions.length; ++i) {
        if (questions[i].hasOptions()) {
            let select = document.getElementById(`select-value-${i+1}`);
            questions[i].setResponseOption(select.selectedIndex);        
        } else {
            let inputTexts = [], vals = [];
            if (i == 1) {
                if (questions[0].getResponseOption() == 1) {
                    inputTexts = [
                        document.getElementById('Dab').value,
                        document.getElementById('Dbc').value,
                        document.getElementById('Dca').value
                    ];
                } else {
                    inputTexts = [document.getElementById('Deq').value];
                }
            } else {
                inputTexts = [document.getElementById(`input-value-${i+1}`).value];
            }
            for (let j = 0; j < inputTexts.length; ++j) {
                let inputText = inputTexts[j];
                if (inputText == '') {
                    alert(`No input provided for ${questions[i].getQuestion()}`);
                    flag = false;
                    break;
                }
                let val = Number(parseInput(inputText));
                if (!val) {
                    alert(`Invalid input for ${questions[i].getQuestion()}`);
                    flag = false;
                    break;
                }
                let unitElement = document.getElementById(`select-units-${i+1}`);
                if (unitElement && unitElement.options.length > 1) {             
                    val = convertToSiUnits(val, unitElement.selectedIndex);
                }
                if (val <= 0 && i != questions.length-1) {
                    alert(`Invalid non-positive input for ${questions[i].getQuestion()}`);
                    flag = false;
                    break;
                }  
                if (questions[i].isInteger() && !Number.isInteger(val)) {
                    alert(`Invalid non-integer input for ${questions[i].getQuestion()}`);
                    flag = false;
                    break;
                }
                if (i == questions.length - 1 && (val < 0 || val > 1)) {
                    alert(`Invalid ${questions[i].getQuestion()}. Range is 0 to 1`);
                    flag = false;
                    break;
                }
                val *= Math.pow(10, questions[i].getDefaultPrefix());
                vals.push(val);
            }
            if (flag) {
                if (vals.length == 1 && i != 1) questions[i].setResponse(vals[0]);
                else questions[i].setResponse(vals);
            }
        } 
    }   
    return flag;
}

function setVariableValues() {
    symmetericalSpacing = (questions[0].getResponseOption() == 0);
    distanceConductors = questions[1].getResponse();
    subconductorsPerConductor = questions[2].getResponse();
    distanceSubconductor = questions[3].getResponse();
    strands = questions[4].getResponse();
    diameterStrand = questions[5].getResponse();
    lineLength = questions[6].getResponse();
    lineLengthKm = lineLength / 1000;
    resistancePerKm = questions[8].getResponse();
    frequency = questions[9].getResponse();
    vr = questions[10].getResponse();
    pr = questions[11].getResponse();
    pfr = questions[12].getResponse();

    lineModel = (x => {
        switch(x) {
            case 0: return LineModels.SHORT;
            case 1: return LineModels.NOMINAL_PI;
            case 2: return LineModels.LONG;
            default: return LineModels.SHORT;
        }
    })(questions[7].getResponseOption());
}

class Answer {
    constructor(id, value, detail, unit, defaultPrefix, isComplex, notConvert) {
        this.id = id;
        this.value = value;
        this.detail = detail;
        this.unit = unit ? unit : '';
        this.defaultPrefix = defaultPrefix ? defaultPrefix : 0;
        this.isComplex = isComplex ? true : false;
        this.notConvert = notConvert ? true : false;
    }
    setFormatted(response) {
        this.response = response;
    }
}

function setAnswerElements() {
    for (let i=0; i<answers.length; ++i) {
        let answer = answers[i];
        let val = answer.value;
        if (answer.isComplex) {
            val = val.polarForm();
        } else if (!answer.notConvert) {
            val = convertToEngMode(val, answer.unit, answer.defaultPrefix);
        } else {
            val = `${roundValue(val)} ${answer.unit}`;
        }
        answer.setFormatted(val);
        // console.log(answer);
        document.getElementById(answer.id).value = val;
    }
}

function convertAllToEngMode() {
    for (let i = 0; i < questions.length; ++i) {
        if (i != 1) {
            if (questions[i].hasUnit()) {
                questions[i].setResponseFormatted(convertToEngMode(questions[i].getResponse(), questions[i].getUnit(), questions[i].getDefaultPrefix()));
            } else {
                questions[i].setResponseFormatted(questions[i].getResponse());
            }
        }
    }
    let distances = questions[1].getResponse();
    if (symmetericalSpacing){
        questions[1].setResponseFormatted(`Dab = Dbc = Dca = ${convertToEngMode(distances[0], 'm')}`);
    } else {
        questions[1].setResponseFormatted(`Dab = ${convertToEngMode(distances[0], 'm')}, Dbc = ${convertToEngMode(distances[1], 'm')}, Dca = ${convertToEngMode(distances[2], 'm')}`);
    }
    // console.log(questions);
}

function convertToSiUnits(num, unit) {
    return num * UNIT_MULTIPLIERS[unit];
}

function convertToEngMode(num, unit, defaultPrefix) {
    unit = (unit ? unit : '');
    defaultPrefix = (defaultPrefix ? defaultPrefix : 0);
    if (num == 0) return `0 ${unit}`;
    if (defaultPrefix != 0) {
        let val = roundValue(Number.parseFloat(num / Math.pow(10, defaultPrefix))).toString();
        return `${val} ${UNIT_PREFIX[defaultPrefix]}${unit}`;
    }
    let l = Math.floor(Math.log10(num));
    let nearest = Math.floor(l/3) * 3;
    let val = roundValue(Number.parseFloat(num / Math.pow(10, nearest))).toString();
    // console.log(`val=${val}, unit=${unit}`);
    return `${val} ${UNIT_PREFIX[nearest]}${unit}`;
}

function getDownloadText() {
    let str = 'Input\n';
    for (let i = 0; i < questions.length; ++i) {
        str += `${i+1}) ${questions[i].getQuestion()} : ${questions[i].getResponseFormatted()}\n`;
    }
    str += '\nOutput\n'
    for (let i = 0; i < answers.length; ++i) {
        str += `${i+1}) ${answers[i].detail} = ${answers[i].response}\n`;
    }
    return str;
}

window.onload = () => {
    SorUs(document.getElementById('select-value-1'));
    downloadA = document.createElement('a');
    outputDiv = document.getElementById('output-div');
    downloadDiv = document.getElementById('download-div');
    downloadButton = document.getElementById('download-button');
    window.URL = window.webkitURL || window.URL;
}

function createDownloadFile() {
    let bb = new Blob([getDownloadText()], {type: MIME_TYPE});

    downloadA.download = 'output.txt';
    downloadA.href = window.URL.createObjectURL(bb);
    downloadA.dataset.downloadurl = [MIME_TYPE, downloadA.download, downloadA.href].join(':');
    downloadA.draggable = true; 
    downloadA.classList.add('dragout');

    downloadA.append(downloadButton);
    downloadDiv.appendChild(downloadA);
}

function saveCircleDiagram() {
    saveCanvas(canvas, 'circle-diagram.png');
}

function positiveAngle(x) {
    if (x < 0) return x + 180;
    return x;
}

function parseInput(x) {
    const regex = /([^0-9x\^.-])/g;
    if (x.match(regex)) 
        return NaN;
    let terms = x.split('x10^');
    let flag = true, ans = terms[0];
    for (let i=1; i<terms.length; ++i) {
        if (terms[i] == '' || !Number.parseFloat(terms[i])) {
            flag = false;
            break;
        }
        ans *= Math.pow(10, terms[i]);
    }
    return (flag ? ans : NaN);
}

class Question {
    constructor(question, unit, defaultPrefix, isInteger, responseOptions, response, numberOfResponses) {
        this._question = question;
        this._unit = unit;
        this._defaultPrefix = defaultPrefix;
        this._response = response;
        this._options = responseOptions;
        this._isInteger = (isInteger == true ? true : false); 
        if (!response && responseOptions && responseOptions.length > 0) {
            this._response = responseOptions[0];
        }
        this._numberOfResponses = (numberOfResponses ? numberOfResponses : 1);
        
    }
    setResponse(response) {
        this._response = response;
    }
    setResponseOption(optionNumber) {
        this._optionNumber = optionNumber;
        if (this._options.length > 0 && optionNumber < this._options.length)
            this._response = this._options[optionNumber];
    }
    setResponseFormatted(responseFormatted) {
        this._responseFormatted = responseFormatted;
    }
    setNumberOfResponses(numberOfResponses) {
        this._numberOfResponses = numberOfResponses;
    }
    getQuestion() {
        return this._question;
    }
    getResponse() {
        return this._response;
    }
    getResponseOption() {
        return this._optionNumber;
    }
    getResponseFormatted() {
        return this._responseFormatted;
    }
    hasOptions() {
        return this._options && this._options.length > 0;
    }
    getOptions() {
        return this._options;
    }
    hasUnit() {
        return (this._unit ? true : false);
    }
    getUnit() {
        return (this._unit ? this._unit : '');
    }
    getDefaultPrefix() {
        return this._defaultPrefix ? this._defaultPrefix : 0;
    }
    getNumberOfResponses() {
        return this._numberOfResponses;
    }
    isInteger(){
        return this._isInteger;
    }
}

var questions = [
    new Question('Type of system', null, null, null, ['Symmetrical spacing', 'Unsymmetrical spacing']),
    new Question('Spacing between conductors', 'm', 0),
    new Question('Number of subconductors per bundle', null, null, true),
    new Question('Spacing between the subconductors', 'm', 0),
    new Question('Number of strands in each subconductor', null, null, true),
    new Question('Diameter of each strand', 'm', 0),
    new Question('Line length in km', 'm', 3),
    new Question('Model of the line', null, null, null, ['Short', 'Nominal Pi', 'Long']),
    new Question('Resistance of the line per km', 'Ω', 0),
    new Question('Power frequency', 'Hz', 0),
    new Question('Nominal system voltage', 'V', 0),
    new Question('Receiving end load', 'W', 6),
    new Question('Power factor of recieving end load')
];

var w = 500, h = 1000;
var axisScaleTextWidth = 150, axisScaleTextHeight = 60;
var titleTextHeight = 85;
const titleTextSize = 17, normalTextSize = 14;
const axisScaleTextFactor = 1.5;
var pointStrokeWeight = 5;
var ba;
var b2r, b2s;
var orx, ory, osx, osy;
var maxLengthR, maxLengthS;
var scaleR, scaleS;
var rr1, rr2, rr, rs1, rs2, rs;
const ar = 10, tr = 20, lrx = 15, lry = 15;
const dash = 5;
const axisLengthScaleY = 0.95, axisLengthScaleX = 0.95;
const descScalar = 0.8, fracScalar = 3, numerWidth = 1.05;
const axisStroke = 200;
const strokeColor = 50;
const textFill = 50, textStroke = 245;
var crx, cry, csx, csy;
const dirs = { LEFT: 0, RIGHT: 1, TOP: 2, BOTTOM: 3 };
const actions = { INCREASE: 0, DECREASE: 1 };
var thetaRText = '', betaAlphaTextR = '', betaDeltaTextR = '', rrText = '', rr1Text = '', rr2Text = '';
var thetaSText = '', betaAlphaTextS = '', betaDeltaTextS = '', rsText = '', rs1Text = '', rs2Text = '';
var centerRText = '';
var centerSText = '';

function setupDiagramValues() {
    orx = w/2, ory = h/6 + axisScaleTextHeight + titleTextHeight, osx = w/2, osy = 2*h/3 + 2 * (axisScaleTextHeight + titleTextHeight);
    maxLengthR = w/2, maxLengthS = w/2 * 1.05;
    rr1 = A.abs * vr * vr / B.abs;
    rr2 = vr * ir;
    rs1 = A.abs * vs * vs / B.abs;
    rs2 = vs * is;
    scaleR = maxLengthR / max(rr1, rr2);
    scaleS = maxLengthR / max(rs1, rs2);
    rr1 = rr1 * scaleR;
    rr2 = rr2 * scaleR;
    rs1 = rs1 * scaleS;
    rs2 = rs2 * scaleS;
    ba = B.angle - A.angle;
    crx = orx - rr1 * Math.cos(ba);
    cry = ory + rr1 * Math.sin(ba);
    csx = osx + rs1 * Math.cos(ba);
    csy = osy + rs1 * Math.sin(ba);
    rr = distance(crx, cry, orx+rr2*Math.cos(thetaR), ory-rr2*Math.sin(thetaR));
    b2r = angle(crx, cry, orx+rr2*Math.cos(thetaR), ory-rr2*Math.sin(thetaR));
    rs = distance(csx, csy, osx+rs2*Math.cos(thetaS), osy-rs2*Math.sin(-thetaS));
    b2s = angle(csx, csy, osx+rs2*Math.cos(thetaS), osy+rs2*Math.sin(-thetaS));

    if (!isSmallAngle(ba)) {
        thetaRText = `θᵣ = ${roundValue(degrees(thetaR))}°`;
        betaAlphaTextR = `β-α \n=${roundValue(degrees(ba))}°`;
        betaDeltaTextR = `β-δ = ${roundValue(degrees(b2r))}°`;

        rr2Text = `|Vᵣ||Iᵣ| = ${convertToEngMode(vr*ir, 'VA')}`;
        rr1Text = `|A||Vᵣ|²~|B|*= ${convertToEngMode(A.abs*vr*vr/B.abs, 'VA')}`;
        rrText =  `|Vᵣ||Vₛ|~|B| *= ${convertToEngMode(rr/scaleR, 'VA')}`;

        centerRText = `(${roundValue(crx-orx)}, ${roundValue(-cry+ory)})`;

        thetaSText = `θₛ = ${roundValue(degrees(thetaS))}°`;
        betaAlphaTextS = `β-α = ${roundValue(degrees(ba))}°`;
        betaDeltaTextS = `180°-(β+δ) = ${roundValue(degrees(b2s))}°`;

        rs2Text = `|Vₛ||Iₛ| = ${convertToEngMode(vs*is, 'VA')}`;
        rs1Text = `|A||Vₛ|²~|B|*= ${convertToEngMode(A.abs*vs*vs/B.abs, 'VA')}`;
        rsText = `|Vᵣ||Vₛ|~|B|*=${convertToEngMode(rs/scaleS, 'VA')}`;

        centerSText = `(${roundValue(csx-osx)}, ${roundValue(-csy+osy)})`;

    } else {
        thetaRText = `θᵣ`;
        betaAlphaTextR = `β-α`;
        betaDeltaTextR = ``;

        rr2Text = ``;
        rr1Text = `|A||Vᵣ|²/|B|`;
        rrText =  `|Vᵣ||Vₛ|/|B|`;

        thetaSText = `θₛ`;
        betaAlphaTextS = ``;
        betaDeltaTextS = ``;

        rs2Text = ``;
        rs1Text = `|A||Vₛ|²/|B|`;
        rsText = `|Vᵣ||Vₛ|/|B|`;
    }
}

function setup() {
    let canvasContainer = document.getElementById('canvas-container');
    w = max(350, min(windowWidth, 500));
    axisScaleTextWidth = Math.max(120, textWidth(getScaleXText(100)), textWidth(getScaleYText(100)));
    canvas = createCanvas(w + getExtraWidth(), h + 2*(axisScaleTextHeight+titleTextHeight));
    canvas.parent('canvas-container'); 
}

function draw() {
    if (canDraw) {
        background(255, 255, 255);
        drawTitle();
        drawAxisScaleText();
        
        // Receiving End Diagram
        stroke(axisStroke);
        line(orx, ory - h/6 * axisLengthScaleY, orx, ory + h/4 * axisLengthScaleY);
        line(orx - w/2 * axisLengthScaleX, ory, orx + w/2 * axisLengthScaleX, ory);
        stroke(strokeColor);
        textSize(normalTextSize);
        drawLineText('Pᵣ', orx, ory, orx + w * axisLengthScaleX, ory, dirs.TOP, actions.DECREASE);
        drawLineText('Qᵣ', orx, ory, orx, ory - h/3 * axisLengthScaleY, dirs.RIGHT, actions.DECREASE);

        lineText(orx, ory, orx+rr2*Math.cos(thetaR), ory-rr2*Math.sin(thetaR), rr2Text);
        myArcText(orx, ory, 0, thetaR, thetaRText, RIGHT);

        lineText(orx, ory, crx, cry, rr1Text, dirs.LEFT, actions.INCREASE);
        myArcText(orx, ory, PI, PI+ba, betaAlphaTextR, LEFT, BOTTOM);

        lineText(crx, cry, orx+rr2*Math.cos(thetaR), ory-rr2*Math.sin(thetaR), rrText, dirs.RIGHT, actions.DECREASE);
        myArc(crx, cry, rr, b2r-PI/4, b2r+PI/4);

        dottedLine(crx, cry, crx + rr, cry);
        myArcText(crx, cry, 0, b2r, betaDeltaTextR, RIGHT);

        drawText(centerRText, crx, cry, LEFT, BOTTOM);

        strokeWeight(pointStrokeWeight);
        point(crx, cry);
        strokeWeight(1);

        // Sending End Diagram
        stroke(axisStroke);
        line(osx, osy - h/6 * axisLengthScaleY, osx, osy + h/4 * axisLengthScaleY);
        line(osx - w/2 * axisLengthScaleX, osy, osx + w/2 * axisLengthScaleX, osy);
        stroke(strokeColor);
        textSize(14);
        drawLineText('Pₛ', osx, osy, osx + w * axisLengthScaleX, osy, dirs.TOP, actions.DECREASE);
        drawLineText('Qₛ', osx, osy, osx, osy - h/3 * axisLengthScaleY, dirs.RIGHT, actions.DECREASE);
        
        if (isSmallAngle(thetaS)) {
            lineText(osx, osy, osx+rs2*Math.cos(thetaS), osy+rs2*Math.sin(-thetaS), rs2Text, dirs.RIGHT);
        } else {
            lineText(osx, osy, osx+rs2*Math.cos(thetaS), osy+rs2*Math.sin(-thetaS), rs2Text, dirs.BOTTOM, actions.DECREASE);
        }
        if (thetaS <= 0) {
            myArcText(osx, osy, PI * 2 + thetaS, 0, thetaSText, RIGHT, TOP);
        } else {
            myArcText(osx, osy, 0, PI * 2 + thetaS, thetaSText, RIGHT, TOP);
        }

        lineText(osx, osy, csx, csy, rs1Text, dirs.LEFT, actions.INCREASE);
        myArcText(csx, csy, PI-ba, PI, betaAlphaTextS, LEFT);
        
        lineText(csx, csy, osx+rs2*Math.cos(thetaS), osy+rs2*Math.sin(-thetaS), rsText, dirs.RIGHT, actions.DECREASE);
        myArc(csx, csy, rs, b2s-PI/4, b2s+PI/4);
        
        dottedLine(csx - rs/2, csy, csx + rs/2, csy);
        myArcText(csx, csy, 0, b2s, betaDeltaTextS, RIGHT);

        drawText(centerSText, csx, csy, CENTER, BOTTOM);

        strokeWeight(pointStrokeWeight);
        point(csx, csy);
        strokeWeight(1);
    }
}

function myArc(x, y, r, a1, a2) {
    stroke(strokeColor);
    noFill();
    arc(x, y, 2*r, 2*r, 2*PI-a2, 2*PI-a1);
}

function myArcText(x, y, a1, a2, st, dir1, dir2) {
    let r = ar;
    myArc(x, y, r, a1, a2);
    drawArcText(st, x, y, a1, a2, dir1, dir2);
}
  
function drawArcText(st,x,y,a1,a2,dir1, dir2) {
    fill(textFill);
    stroke(textStroke);
    textAlign(invertDir(dir1), invertDir(dir2));

    x=x+(ar+tr)*(Math.cos(a1)+Math.cos(a2))/2;
    y=y-(ar+tr)*(Math.sin(a1)+Math.sin(a2))/2;

    text(st,x,y);
    stroke(strokeColor);

    noFill();
}

function drawLineText(st, x1, y1, x2, y2, dir, extSpaceAction, intSpaceAction) {
    fill(textFill);
    stroke(textStroke);
    textAlign(CENTER, CENTER);

    let i1 = st.indexOf('~');
    i1 = (i1 !== -1 ? i1 : st.length);
    let num1 = st.slice(0,i1);
    let tw1 = textWidth(num1);
    let asc = textAscent() * descScalar * fracScalar;
    let desc = textDescent() * descScalar * fracScalar;
    let i2 = st.indexOf('*');
    i2 = (i2 !== -1 ? i2 : st.length);
    let den = st.slice(i1+1,i2); 
    let num2 = st.slice(i2+1,st.length);
    let tw2 = textWidth(num2);
    // cx = cx - (tw1+tw2)/4;
    let cx=(x1+x2)/2, cy=(y1+y2)/2;
    switch(dir){
        case dirs.LEFT: 
        default:
            cx -= (tw1+tw2)/2 + lrx;
            if (extSpaceAction == actions.INCREASE) cx -= lrx/2;
            else if (extSpaceAction == actions.DECREASE) cx += lrx/2;
            break;
        case dirs.RIGHT:
            cx += (tw1+tw2)/2 + lrx;
            if (extSpaceAction == actions.INCREASE) cx += lrx/2;
            else if (extSpaceAction == actions.DECREASE) cx -= lrx/2;
            break;
        case dirs.TOP:
            cy -= desc + lry;
            if (extSpaceAction == actions.INCREASE) cy -= (lry + desc)/2;
            else if (extSpaceAction == actions.DECREASE) cy += (lry + desc)/2;
            break;
        case dirs.BOTTOM:
            cy += asc + lry;
            if (extSpaceAction == actions.INCREASE) cy += (asc + lry)/2;
            else if (extSpaceAction == actions.DECREASE) cy -= (asc + lry)/2;
            break;
    }
    
    if (i1 !== st.length) cy -= 2*desc;
    
    if (i1 === st.length) {
        text(st,cx,cy);
    } else {
        let cx1=cx-tw1/2,cx2=cx+tw2/2;
        text(num1,cx1,cy);
        text('―',cx1,cy+desc);  
        text(den,cx1,cy+2*desc);
        text(num2,cx2,cy+desc);
    }
    
    stroke(strokeColor);
    noFill();
}

function windowResized() {
    if (windowWidth > 750) return;
    w = max(350, min(windowWidth, 500));
    axisScaleTextWidth = Math.max(120, textWidth(getScaleXText(100)), textWidth(getScaleYText(100)));
    resizeCanvas(w + getExtraWidth(), h + 2*(axisScaleTextHeight+titleTextHeight));
    clear();
    if (canDraw) {
        setupDiagramValues();
    }
}

function drawTitle() {
    fill(textFill);
    stroke(textStroke);
    textSize(titleTextSize);
    textAlign(CENTER, CENTER);

    text('Receiving End Circle Diagram', w/2, titleTextHeight/2);
    text('Sending End Circle Diagram', w/2, h/2+3*titleTextHeight/2+axisScaleTextHeight);

    textSize(normalTextSize);
    stroke(strokeColor);
    noFill();
}

function drawAxisScaleText() {
    fill(textFill);
    stroke(textStroke);
    textAlign(LEFT, TOP);

    text(`Scale:\n${getScaleXText(1/scaleR)}\n${getScaleYText(1/scaleR)}`, w - axisScaleTextWidth, titleTextHeight + axisScaleTextHeight/3);
    text(`Scale:\n${getScaleXText(1/scaleS)}\n${getScaleYText(1/scaleS)}`, w - axisScaleTextWidth, h/2 + axisScaleTextHeight + titleTextHeight*2 + axisScaleTextHeight/3);

    stroke(strokeColor);
    noFill();
}

function getScaleXText(val) {
    return `  x-axis: 1 unit = ${convertToEngMode(val, 'W')}`;
}

function getScaleYText(val) {
    return `  y-axis: 1 unit = ${convertToEngMode(val, 'VA')}`;
}
  
function lineText(x1, y1, x2, y2, st, dir, extSpaceAction, intSpaceAction) {
    line(x1, y1, x2, y2);
    drawLineText(st, x1, y1, x2, y2, dir, extSpaceAction, intSpaceAction);
}

function drawText(st, x, y, dir1, dir2) {
    fill(textFill);
    stroke(textStroke);
    textAlign(invertDir(dir1), invertDir(dir2));

    text(st, x, y);

    stroke(strokeColor);
    noFill();
}

function dottedLine(x1, y1, x2, y2) {
    let ang = angle(x1, y1, x2, y2);
    let d = distance(x1, y1, x2, y2);
    let i=0;
    for (let i=0; i<d; i+=2*dash) {
        line(x1+i*Math.cos(ang), y1+i*Math.sin(ang), x1+(i+dash)*Math.cos(ang), y1+(i+dash)*Math.sin(ang));
    }
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
}

function angle(x1, y1, x2, y2) {
    let t = Math.atan(-(y2-y1)/(x2-x1));
    if (x1==x2) {
        if (y2>y1) return -PI/2;
        return PI/2;
    }
    if (x1>x2) {
        if (y1==y2) return PI;
        return PI + t;
    }
    return t;
}

function isSmallAngle(ang) {
    return Math.abs(Math.sin(ang)) <= 0.15;
}

function getExtraWidth() {
    if (w <= 800) return axisScaleTextWidth/3;
    if (w <= 650) return 0;
    return axisScaleTextWidth;
}

function invertDir(dir) {
    switch(dir) {
        case LEFT: return RIGHT;
        case RIGHT: return LEFT;
        case TOP: return BOTTOM;
        case BOTTOM: return TOP;
    }
    return CENTER;
}

function roundValue(x) {
    return (x).toFixed(2).replace(/[.,]00$/, "");
}

function roundValueToThreeDecimals(x) {
    return (x).toFixed(3).replace(/[.,]000$/, "");
}

function roundValueToOneDecimal(x) {
    return (x).toFixed(1).replace(/[.,]000$/, "");
}

function sign(x) {
    return (x < 0) ? '-' : '';
}