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

class Question {
    constructor(question, unit, defaultPrefix, responseOptions, response) {
        if (arguments.length == 3) {
            this._question = question;
            this._defaultPrefix = defaultPrefix;
            this._unit = unit;
        } else if (arguments.length == 4) {
            this._question = question;
            this._unit = unit;
            this._defaultPrefix = defaultPrefix;
            this._options = responseOptions;
            if (responseOptions.length > 1) {
                this._response = responseOptions[0];
            }
        } else {
            this._question = question;
            this._unit = unit;
            this._defaultPrefix = defaultPrefix;
            this._response = response;
            this._options = responseOptions;
            if (!response && responseOptions && responseOptions.length > 0) {
                this._response = responseOptions[0];
            }
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
}

const questions = [
    new Question('Type of system', null, null, ['Symmetrical spacing', 'Unsymmetrical spacing']),
    new Question('Spacing between conductors', 'm', 0),
    new Question('Number of subconductors per bundle'),
    new Question('Spacing between the subconductors', 'm', 0),
    new Question('Number of strands in each subconductor'),
    new Question('Diameter of each strand', 'm', 0),
    new Question('Line length in km', 'm', 0),
    new Question('Model of the line', null, null, ['Short', 'Medium', 'Long']),
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
    setQuestionValues();
    createDownloadFile();
}

function setQuestionValues() {
    for (let i = 0; i < questions.length; ++i) {
        // console.log(questions[i]);
        if (questions[i].hasOptions()) {
            let select = document.getElementById(`select-value-${i+1}`);
            questions[i].setResponseOption(select.selectedIndex);        
        } else {
            let val = document.getElementById(`input-value-${i+1}`).value;
            let unitElement = document.getElementById(`select-units-${i+1}`);
            if (unitElement && unitElement.options.length > 1) {             
                val = convertToSiUnits(val, unitElement.selectedIndex);
            }
            questions[i].setResponse(val);
        } 
        // console.log(questions[i]);
    }
    convertAllToEngMode();
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
    let l = Math.floor(Math.log10(num) + defaultPrefix);
    let nearest = Math.floor(l/3) * 3;
    let val = Number.parseFloat(num / Math.pow(10, nearest - defaultPrefix)).toFixed(3).toString();
    // console.log(`val=${val}, unit=${unit}`);
    return val + unitPrefix[nearest] + unit;
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