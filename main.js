var downloadA;
var outputDiv, downloadDiv, downloadButton;
const UNITS = ['m', 'mm', 'ft', 'inch'];
const UNIT_MULTIPLIERS = [1, 0.001, 0.3048, 0.0254];
const UNIT_PREFIX = {
    '-9': 'n',
    '-6': 'ɥ',
    '-3': 'm',
    '0': '',
    '3': 'k',
    '6': 'M',
    '9': 'G'
}
const MIME_TYPE = 'text/plain';
const GITHUB_PAGE_URL = 'https://monishtechy.github.io/website/';
const EPLISON = 8.8542 * Math.pow(10, -12);
const PI = Math.PI, GMR_L = 0.7788;
var symmetericalSpacing, distanceConductor, subconductorsPerConductor, distanceSubconductor, strands, diameterStrand, diameterSubconductor;
var lineLength, lineModel, resistancePerKm, frequency;
var xc, xl;
var vr, ir, pfr, pr;
var vs, is, pfs, ps;
var A, B, C, D, alph, beta, gamma, delta;
var canvas;

class Question {
    constructor(question, unit, defaultPrefix, isInteger, responseOptions, response) {
        this._question = question;
        this._unit = unit;
        this._defaultPrefix = defaultPrefix;
        this._response = response;
        this._options = responseOptions;
        this._isInteger = isInteger == true ? true : false; 
        if (!response && responseOptions && responseOptions.length > 0) {
            this._response = responseOptions[0];
        }
        
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
    isInteger(){
        return this._isInteger;
    }
}

const questions = [
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

window.onload = () => {
    // console.log(`Questions: ${JSON.stringify(questions)}`);
    downloadA = document.createElement('a');
    outputDiv = document.getElementById('output-div');
    downloadDiv = document.getElementById('download-div');
    downloadButton = document.getElementById('download-button');
    window.URL = window.webkitURL || window.URL;
}

function solve() {
    let l = getInductance();
    let c = getCapacitance();
    xl = 2 * PI * frequency * l * lineLength;
    xc = 1 / (2 * PI * frequency * c * lineLength);
    // console.log(`L = ${l}, C = ${c}, XL = ${xl}, XC = ${xc}`);
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

function getDiameterSubconductor(strands, diameter) {
    let n = 1;
    while ((3*n*n - 3*n + 1) < strands) {
        ++n;
    }
    return (2*n - 1) * diameter;
}

function getInductance() {
    let mg = distanceConductor;
    let sg = sgmdL(subconductorsPerConductor, distanceSubconductor, diameterSubconductor/2);
    // console.log(`Inductance: SGMD = ${sg}, MGMD = ${mg}`);
    return 2 * Math.pow(10, -7) * Math.log10(mg / sg) / Math.LOG10E;
}

function getCapacitance() {
    let mg = distanceConductor;
    let sg = sgmdC(subconductorsPerConductor, distanceSubconductor, diameterSubconductor/2);
    // console.log(`Capacitance: SGMD = ${sg}, MGMD = ${mg}`);
    return 2 * PI * EPLISON / Math.log10(mg / sg) * Math.LOG10E;
}

function submit(){   
    if (setQuestionValues()) {
        setVariableValues();
        clear();
        solve();
        convertAllToEngMode();
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
            let inputText = document.getElementById(`input-value-${i+1}`).value;
            if (inputText == '') {
                alert(`No input provided for ${questions[i].getQuestion()}`);
                flag = false;
                break;
            }
            let val = Number(inputText);
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
            val *= Math.pow(10, questions[i].getDefaultPrefix());
            questions[i].setResponse(val);
        } 
    }
    return flag;
}

function setVariableValues() {
    symmetericalSpacing = (questions[0].getResponseOption() == 0);
    distanceConductor = questions[1].getResponse();
    subconductorsPerConductor = questions[2].getResponse();
    distanceSubconductor = questions[3].getResponse();
    strands = questions[4].getResponse();
    diameterStrand = questions[5].getResponse();
    lineLength = questions[6].getResponse();
    lineModel = questions[7].getResponseOption();
    resistancePerKm = questions[8].getResponse();
    frequency = questions[9].getResponse();
    vr = questions[10].getResponse();
    pr = questions[11].getResponse();
    pfr = questions[12].getResponse();
    diameterSubconductor = getDiameterSubconductor(strands, diameterStrand);
}

function convertAllToEngMode() {
    for (let i = 0; i < questions.length; ++i) {
        if (questions[i].hasUnit()) {
            questions[i].setResponseFormatted(convertToEngMode(questions[i].getResponse(), questions[i].getUnit(), questions[i].getDefaultPrefix()));
        } else {
            questions[i].setResponseFormatted(questions[i].getResponse());
        }
    }
    // console.log(questions);
}

function convertToSiUnits(num, unit) {
    return num * UNIT_MULTIPLIERS[unit];
}

function convertToEngMode(num, unit) {
    unit = (unit ? unit : '');
    if (num == 0) return 0 + UNIT_PREFIX[defaultPrefix] + unit;
    let l = Math.floor(Math.log10(num));
    let nearest = Math.floor(l/3) * 3;
    let val = roundValue(Number.parseFloat(num / Math.pow(10, nearest))).toString();
    // console.log(`val=${val}, unit=${unit}`);
    return `${val} ${UNIT_PREFIX[nearest]}${unit}`;
}

function getDownloadText() {
    let str = '';
    for (let i = 0; i < questions.length; ++i) {
        str += `${i+1}) ${questions[i].getQuestion()} : ${questions[i].getResponseFormatted()}\n`;
    }
    return str;
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

const w = 500, h = 500;
var ba, thetaR;
var b2;
const ox = w/2, oy = h/2;
const maxL = 200;
var scaleD;
var r1, r2, r;
const ar = 10, tr = 20, lrx = 15, lry = 20;
const dash = 5;
const descScalar = 0.8, fracScalar = 3, numerWidth = 1.05;
var myFont;
const axisStroke = 200;
const strokeColor = 50;
const textFill = 50, textStroke = 250;
var cx, cy;

function setup() {
    let canvasContainer = document.getElementById('canvas-container');
    canvas = createCanvas(w, h);
    canvas.parent('canvas-container');
    vr = 6350, ir = 100, pfr = 0.8;
    A = 1, B = 50, C = 0, alph = 0, beta = 80;
    // myFont = loadFont('ostrich-regular.ttf');
    r2 = A * vr * vr / B;
    r1 = vr * ir;
    scaleD = maxL / max(r1, r2);
    r1 = r1 * scaleD;
    r2 = r2 * scaleD;
    thetaR = Math.acos(pfr);
    ba = (beta - alph) * PI/180;
    cx = ox - r1 * Math.cos(ba);
    cy = oy + r1 * Math.sin(ba);
    r = distance(cx, cy, ox+r2*Math.cos(thetaR), oy-r2*Math.sin(thetaR));
    b2 = angle(cx, cy, ox+r2*Math.cos(thetaR), oy-r2*Math.sin(thetaR));
}

function draw() {
    stroke(axisStroke);
    line(ox, oy - h/1.8, ox, oy + h/1.8);
    line(ox - w/1.8, oy, ox + w/1.8, oy);
    stroke(strokeColor);
    textSize(14);
    if (myFont) textFont(myFont);

    lineText(ox, oy, ox+r2*Math.cos(thetaR), oy-r2*Math.sin(thetaR), `|Vᵣ||Iᵣ| = ${convertToEngMode(vr*ir, 'VA')}`);
    myArcText(ox, oy, 0, thetaR, `θᵣ = ${roundValue(degrees(thetaR))}°`);

    lineText(ox, oy, cx, cy, `|A||Vᵣ|²~|B|*= ${convertToEngMode(A*vr*vr/B, 'VA')}`, true, true);
    myArcText(ox, oy, PI, PI+ba, `β-α \n=${roundValue(degrees(ba))}°`);

    lineText(cx, cy, ox+r2*Math.cos(thetaR), oy-r2*Math.sin(thetaR), `|Vᵣ||Vₛ|~|B| *= ${convertToEngMode(r/scaleD, 'VA')}`, true);
    myArc(cx, cy, r, b2-PI/4, b2+PI/4);

    dottedLine(cx, cy, cx + r, cy);
    myArcText(cx, cy, 0, b2, `β-δ = ${roundValue(degrees(b2))}°`);
}

function myArc(x, y, r, a1, a2) {
    stroke(strokeColor);
    noFill();
    arc(x, y, 2*r, 2*r, 2*PI-a2, 2*PI-a1);
}

function myArcText(x, y, a1, a2, st) {
    myArc(x, y, ar, a1, a2);
    drawArcText(st, x, y, a1+(a2-a1)/2);
}

function drawArcText(st,x,y,ang) {
    fill(textFill);
    stroke(textStroke);
    textAlign(CENTER, CENTER);

    text(st,x+(ar+tr)*Math.cos(ang),y-(ar+tr)*Math.sin(ang));
    stroke(strokeColor);

    noFill();
}

function drawLineText(st, x1, y1, x2, y2, reverse, reduceSpace) {
    fill(textFill);
    stroke(textStroke);
    textAlign(CENTER, CENTER);

    let ang = angle(x1,y1,x2,y2) + (reverse ? -1 : 1)*PI/2;
    let i1 = st.indexOf('~');
    i1 = (i1 !== -1 ? i1 : st.length);
    let num1 = st.slice(0,i1);
    let tw1 = textWidth(num1);
    let desc = textDescent() * descScalar * fracScalar;
    let i2 = st.indexOf('*');
    i2 = (i2 !== -1 ? i2 : st.length);
    let den = st.slice(i1+1,i2); 
    let num2 = st.slice(i2+1,st.length);
    let tw2 = textWidth(num2);
    // cx = cx - (tw1+tw2)/4;
    let cx = (x1+x2)/2+(lrx+(tw1+tw2)/2)*Math.cos(ang), cy
    if (i1 !== st.length) cy = (y1+y2)/2-(lry+2*desc)*Math.sin(ang);
    else cy = (y1+y2)/2-lry*Math.sin(ang);
    let cx2;
    if (reduceSpace) cx2 = cx+(tw1+tw2)/2;
    else cx2 = cx+(tw1+tw2)/2*numerWidth;

    if (i1 === st.length) {
        text(st,cx,cy);
    } else {
        text(num1,cx,cy);
        text('―',cx,cy+desc);  
        text(den,cx,cy+2*desc);
        text(num2,cx2,cy+desc);

        stroke(strokeColor);
        noFill();
    }
}

function lineText(x1, y1, x2, y2, st, reverse, reduceSpace) {
    line(x1, y1, x2, y2);
    drawLineText(st, x1, y1, x2, y2, reverse, reduceSpace);
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

function roundValue(x) {
    return (x).toFixed(2).replace(/[.,]00$/, "");
}