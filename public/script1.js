var theModal= document.getElementById('modal-container');

document.getElementById('loginNewButton').addEventListener('click',function(){
    theModal.style.display="flex";

})

var logBut = document.getElementById('loginNewButton');
var logCont= document.getElementById('login-container')
var closeLogin= document.getElementById('closeLogin')

closeLogin.addEventListener('click',function(event){
    theModal.style.display="none"
})
