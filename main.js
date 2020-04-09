var a;
var downloadDiv, downloadButton;
const units = ['m', 'mm', 'ft', 'inch'];
const unitsMulipliers = [1, 0.001, 0.3048, 0.0254];
const unitPrefix = {
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
var canvas, resistorImg, inductorImg, backgroundImg, img;

function setup() {
    let canvasContainer = document.getElementById('canvas-container');
    resistorImg = loadImage(GITHUB_PAGE_URL + 'resistor.png');
    inductorImg = loadImage(GITHUB_PAGE_URL + 'inductor.png');
    canvas = createCanvas(500, 500);
    canvas.parent('canvas-container');
}

function draw() {
    // line(40,100,80,100);
    // image(resistorImg, 80, 87.5, 100, 25, 0, 0);
    // line(180,100,220,100);
    // image(inductorImg, 250, 83, 100, 25, 0, 0);
    // line(220,100,260,100);
}

function arrow(x, y, w, h) {
    triangle(x-w/2,y+h/2,x,y-h/2,x+w/2,y+h/2);
    fill(0);
  }

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
        if (this._options.length > 0 && optionNumber < this._options.length)
            this._response = this._options[optionNumber];
    }
    getQuestion() {
        return this._question;
    }
    getResponse() {
        return this._response;
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
        return this._defaultPrefix;
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
    new Question('Line length in km', 'm', 0),
    new Question('Model of the line', null, null, null, ['Short', 'Nominal Pi', 'Long']),
    new Question('Resistance of the line per km', 'Ω', 0),
    new Question('Power frequency', 'Hz', 0),
    new Question('Nominal system voltage', 'V', 3),
    new Question('Receiving end load', 'W', 6),
    new Question('Power factor of recieving end load')
];

window.onload = () => {
    // console.log(`Questions: ${JSON.stringify(questions)}`);
    a = document.createElement('a');
    downloadDiv = document.getElementById('download-div');
    downloadButton = document.getElementById('download-button');
    window.URL = window.webkitURL || window.URL;
}

function insert(num){
            
    // document.form.getElementsById("load").values = num;  
}

function submit(){   
    if (setQuestionValues()) {
        createDownloadFile();
    }
}

function setQuestionValues() {
    let flag = true;
    for (let i = 0; i < questions.length; ++i) {
        if (questions[i].hasOptions()) {
            let select = document.getElementById(`select-value-${i+1}`);
            questions[i].setResponseOption(select.selectedIndex);        
        } else {
            let val = Number(document.getElementById(`input-value-${i+1}`).value);
            let unitElement = document.getElementById(`select-units-${i+1}`);
            if (unitElement && unitElement.options.length > 1) {             
                val = convertToSiUnits(val, unitElement.selectedIndex);
            }
            if (val < 0) {
                alert(`Invalid negative input for ${questions[i].getQuestion()}`);
                flag = false;
                break;
            }  
            if (questions[i].isInteger() && !Number.isInteger(val)) {
                alert(`Invalid non-integer input for ${questions[i].getQuestion()}`);
                flag = false;
                break;
            }
            questions[i].setResponse(val);
        } 
        // console.log(questions[i]);
    }
    if (flag) {
        convertAllToEngMode();
    }
    return flag;
}

function convertAllToEngMode() {
    for (let i = 0; i < questions.length; ++i) {
        if (questions[i].hasUnit()) {
            questions[i].setResponse(convertToEngMode(questions[i].getResponse(), questions[i].getUnit(), questions[i].getDefaultPrefix()));
        }
    }
    // console.log(questions);
}

function convertToSiUnits(num, unit) {
    return num * unitsMulipliers[unit];
}

function convertToEngMode(num, unit, defaultPrefix) {
    if (num == 0) return 0 + unitPrefix[defaultPrefix] + unit;
    let l = Math.floor(Math.log10(num) + defaultPrefix);
    let nearest = Math.floor(l/3) * 3;
    let val = Number.parseFloat(num / Math.pow(10, nearest - defaultPrefix)).toFixed(3).toString();
    // console.log(`val=${val}, unit=${unit}`);
    return `${val} ${unitPrefix[nearest]}${unit}`;
}

function getDownloadText() {
    let str = '';
    for (let i = 0; i < questions.length; ++i) {
        str += `${i}) ${questions[i].getQuestion()} : ${questions[i].getResponse()}\n`;
    }
    return str;
}

function createDownloadFile() {
    let bb = new Blob([getDownloadText()], {type: MIME_TYPE});

    a.download = 'output.txt';
    a.href = window.URL.createObjectURL(bb);
    a.dataset.downloadurl = [MIME_TYPE, a.download, a.href].join(':');
    a.draggable = true; 
    a.classList.add('dragout');

    a.append(downloadButton);
    downloadDiv.appendChild(a);
}

function download() {
   
}