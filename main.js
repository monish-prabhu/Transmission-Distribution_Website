var a;
var downloadDiv, downloadButton;
const MIME_TYPE = 'text/plain';

window.onload = () => {
    a = document.createElement('a');
    downloadDiv = document.getElementById('download-div');
    downloadButton = document.getElementById('download-button');
    window.URL = window.webkitURL || window.URL;
}

function insert(num){
            
    // document.form.getElementsById("load").values = num;  
}

function submit(){   
    createDownloadFile();
}

function createDownloadFile() {
    let bb = new Blob(['Hello World'], {type: MIME_TYPE});

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