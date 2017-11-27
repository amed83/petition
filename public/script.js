

//canvassection
var canvas = document.getElementById('myCanvas');
ctx= canvas.getContext('2d');

canvas.addEventListener("mousedown", pointerDown, false);
canvas.addEventListener("mouseup", pointerUp, false);

function pointerDown(evt) {
    ctx.beginPath();
    ctx.moveTo(evt.offsetX, evt.offsetY);
    canvas.addEventListener("mousemove", paint, false);
}

function pointerUp(evt) {
    canvas.removeEventListener("mousemove", paint);
    paint(evt);
}

function paint(evt) {
    ctx.lineTo(evt.offsetX, evt.offsetY);
    ctx.stroke();
}

////end of canvas



var subButton= document.getElementById('submitter');
var input = document.getElementById('hiddenInput');


//send the image of canvas to the the page
subButton.addEventListener('click',function(){

        input.value=canvas.toDataURL();

})
/* /////////////////////////// */


var theModal= document.getElementById('modal-container');

document.getElementById('loginNewButton').addEventListener('click',function(){
    theModal.style.display="flex";

})

var logBut = document.getElementById('loginNewButton');
var logCont= document.getElementById('login-container')

document.body.addEventListener('click',function(event){
    if (event.target == theModal){
        theModal.style.display="none"
    }

})
